import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// English-speaking country codes
const englishSpeakingCountries = [
  '+1', '+44', '+61', '+64', '+27', '+353', '+1242', '+1246', '+1264',
  '+1268', '+1284', '+1340', '+1345', '+1441', '+1473', '+1649', '+1664',
  '+1670', '+1671', '+1684', '+1721', '+1758', '+1767', '+1784', '+1787',
  '+1809', '+1829', '+1849', '+1868', '+1869', '+1876', '+1939'
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, senderPhone, messageText } = body;

    console.log(`📥 whatsapp-webjs-webhook received: userId=${userId}, from=${senderPhone}, msg=${messageText}`);

    if (!userId || !senderPhone || !messageText) {
      return new Response(JSON.stringify({ success: false, error: "Missing fields: userId, senderPhone, messageText" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Clean phone number
    const cleanPhone = senderPhone.replace(/@c\.us$/, '').replace(/[\s\-\(\)\.]/g, '');

    // Generate search patterns for phone matching
    const generateSearchPatterns = (phone: string): string[] => {
      const patterns = new Set<string>();
      const clean = phone.replace(/[\s\-\(\)\.]/g, '');
      const onlyDigits = clean.replace(/\D/g, '');

      patterns.add(clean);
      patterns.add(onlyDigits);

      if (clean.startsWith('+')) {
        patterns.add(clean.substring(1));
      } else {
        patterns.add('+' + clean);
      }

      for (let i = 7; i <= Math.min(onlyDigits.length, 12); i++) {
        const suffix = onlyDigits.slice(-i);
        patterns.add(suffix);
        patterns.add('+' + suffix);
      }

      return Array.from(patterns).filter(p => p.length >= 5);
    };

    const searchPatterns = generateSearchPatterns(cleanPhone);

    // Find processes for this specific user that match the sender phone
    const { data: allProcesses, error: processError } = await supabase
      .from('processes')
      .select(`
        id,
        user_id,
        client_name,
        iphone_model,
        imei,
        serial_number,
        owner_name,
        country_code,
        phone_number,
        profiles!inner(telegram_bot_token, telegram_chat_id)
      `)
      .eq('user_id', userId)
      .not('profiles.telegram_bot_token', 'is', null)
      .not('profiles.telegram_chat_id', 'is', null)
      .limit(500);

    if (processError) {
      console.error('❌ Error fetching processes:', processError);
      throw processError;
    }

    if (!allProcesses || allProcesses.length === 0) {
      console.log('⚠️ No processes found for this user with Telegram config');
      return new Response(JSON.stringify({
        success: true,
        message: 'No processes with Telegram config for this user',
        notification_sent: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Match phone number
    let matchedProcess = null;

    for (const proc of allProcesses) {
      const procCountryCode = (proc.country_code || '').replace(/[\s\-\(\)\.]/g, '');
      const procPhoneNumber = (proc.phone_number || '').replace(/[\s\-\(\)\.]/g, '');
      const procFullNumber = procCountryCode + procPhoneNumber;
      const procFullNumberDigits = procFullNumber.replace(/\D/g, '');

      const procVariants = [
        procPhoneNumber,
        procFullNumber,
        procFullNumber.replace(/\+/g, ''),
        procFullNumberDigits,
        '+' + procFullNumberDigits,
        procPhoneNumber.startsWith('0') ? procPhoneNumber.substring(1) : null,
        procPhoneNumber.startsWith('0') ? procCountryCode + procPhoneNumber.substring(1) : null,
      ].filter(Boolean) as string[];

      for (const pattern of searchPatterns) {
        const patternDigits = pattern.replace(/\D/g, '');

        for (const variant of procVariants) {
          const variantDigits = variant.replace(/\D/g, '');

          if (
            variant === pattern ||
            variantDigits === patternDigits ||
            (patternDigits.length >= 8 && variantDigits.length >= 8 &&
              patternDigits.slice(-8) === variantDigits.slice(-8))
          ) {
            matchedProcess = proc;
            break;
          }
        }
        if (matchedProcess) break;
      }
      if (matchedProcess) break;
    }

    if (!matchedProcess) {
      console.log('⚠️ No matching process found for sender phone:', cleanPhone);
      return new Response(JSON.stringify({
        success: true,
        message: 'No matching process found',
        notification_sent: false,
        sender_phone: cleanPhone,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`✅ Matched process: ${matchedProcess.id} | Client: ${matchedProcess.client_name}`);

    // Extract Telegram config
    const telegramBotToken = (matchedProcess.profiles as any)?.telegram_bot_token;
    const telegramChatId = (matchedProcess.profiles as any)?.telegram_chat_id;

    if (!telegramBotToken || !telegramChatId) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Process found but Telegram not configured',
        notification_sent: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Build Telegram notification (same format as ultramsg-webhook)
    const notificationText = `🔔 Alerta de proceso de WhatsApp\n\n` +
      `👩🏽‍💻 Servidor Astro\n\n` +
      `📊 INFORMACIÓN DEL PROCESO:\n` +
      `👤 Cliente: ${matchedProcess.client_name || 'N/A'}\n` +
      `📱 Modelo: ${matchedProcess.iphone_model || 'N/A'}\n` +
      `📞 IMEI: ${matchedProcess.imei || 'N/A'}\n` +
      `🔢 Serie: ${matchedProcess.serial_number || 'N/A'}\n` +
      `👥 Propietario: ${matchedProcess.owner_name || 'N/A'}\n\n` +
      `📞 Remitente: ${cleanPhone}\n` +
      `📥 Respuesta: ${messageText}\n\n` +
      `📡 Via: WhatsApp Web.js (sesión personal)\n` +
      `🤖 Bot Astro en línea 🟢`;

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: notificationText,
        parse_mode: 'Markdown',
      }),
    });

    const telegramResult = await telegramResponse.json();
    console.log('📬 Telegram response:', telegramResult);

    if (!telegramResponse.ok) {
      console.error('❌ Telegram error:', telegramResult);
      throw new Error(`Telegram API error: ${JSON.stringify(telegramResult)}`);
    }

    // Log to whatsapp_telegram_log
    try {
      await supabase.from('whatsapp_telegram_log').insert({
        sender_phone: cleanPhone,
        whatsapp_payload: body,
        telegram_message_id: telegramResult.result?.message_id || null,
      });
    } catch (logErr) {
      console.error('⚠️ Failed to log:', logErr);
    }

    // ========== CHATBOT AUTO-RESPONSE ==========
    const { data: chatbotSettings } = await supabase
      .from('chatbot_settings')
      .select('setting_key, setting_value');

    const settingsMap: Record<string, string> = {};
    chatbotSettings?.forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value || ''; });

    const chatbotEnabled = settingsMap['chatbot_enabled'] === 'true';

    if (!chatbotEnabled) {
      return new Response(JSON.stringify({
        success: true,
        notification_sent: true,
        chatbot_response_sent: false,
        process_id: matchedProcess.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine language
    const processCountryCode = matchedProcess.country_code || '';
    const isEnglish = englishSpeakingCountries.some(code => processCountryCode.startsWith(code));
    const language = isEnglish ? 'en' : 'es';

    // Fetch chatbot responses
    const { data: chatbotResponses } = await supabase
      .from('chatbot_responses')
      .select('*')
      .eq('is_active', true);

    const normalizedMessage = messageText.trim().toLowerCase();
    let matchedResponse = null;

    if (chatbotResponses) {
      for (const response of chatbotResponses) {
        if (response.keyword.toLowerCase() === normalizedMessage) {
          matchedResponse = response;
          break;
        }
      }
    }

    let botResponseText: string;
    if (matchedResponse) {
      botResponseText = language === 'en' ? matchedResponse.response_en : matchedResponse.response_es;
    } else {
      botResponseText = language === 'en'
        ? (settingsMap['fallback_response_en'] || "🤖 I didn't understand your message. Type *menu* to see available options.")
        : (settingsMap['fallback_response_es'] || '🤖 No entendí tu mensaje. Escribe *menu* para ver las opciones disponibles.');
    }

    // Replace user-specific URLs
    const { data: userUrls } = await supabase
      .from('user_chatbot_urls')
      .select('url_key, url_value')
      .eq('user_id', userId);

    if (userUrls) {
      for (const userUrl of userUrls) {
        const placeholder = `{{${userUrl.url_key}}}`;
        if (botResponseText.includes(placeholder)) {
          botResponseText = botResponseText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), userUrl.url_value);
        }
      }
    }

    // Replace global URLs
    const { data: globalUrls } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .like('setting_key', 'global_url_option_%');

    if (globalUrls) {
      for (const globalUrl of globalUrls) {
        const urlKey = globalUrl.setting_key.replace('global_', '');
        const placeholder = `{{${urlKey}}}`;
        if (botResponseText.includes(placeholder) && globalUrl.setting_value) {
          botResponseText = botResponseText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), globalUrl.setting_value);
        }
      }
    }

    // 5 second delay to avoid automation detection
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Send chatbot response back via VPS (the user's own session)
    const { data: vpsSettings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['whatsapp_webjs_api_url', 'whatsapp_webjs_api_key']);

    const vpsMap: Record<string, string> = {};
    vpsSettings?.forEach((s: any) => { vpsMap[s.setting_key] = (s.setting_value || '').trim(); });

    const vpsUrl = vpsMap['whatsapp_webjs_api_url'];
    const vpsKey = vpsMap['whatsapp_webjs_api_key'];

    let chatbotSent = false;

    // Try sending via VPS first (user's own WhatsApp session)
    if (vpsUrl) {
      try {
        const vpsHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (vpsKey) vpsHeaders["Authorization"] = `Bearer ${vpsKey}`;

        const vpsResponse = await fetch(`${vpsUrl}/session/send/${userId}`, {
          method: "POST",
          headers: vpsHeaders,
          body: JSON.stringify({ userId, phone: cleanPhone, message: botResponseText }),
        });

        const vpsResult = await vpsResponse.json();
        if (vpsResponse.ok && vpsResult.success !== false) {
          chatbotSent = true;
          console.log('✅ Chatbot response sent via whatsapp-web.js');
        } else {
          console.log('⚠️ VPS send failed, falling back to UltraMsg:', vpsResult);
        }
      } catch (e) {
        console.error('⚠️ VPS error for chatbot response:', e);
      }
    }

    // Fallback to UltraMsg for chatbot response
    if (!chatbotSent) {
      const { data: whatsappSettings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['whatsapp_instance', 'whatsapp_token', 'whatsapp_instance_en', 'whatsapp_token_en']);

      const waMap: Record<string, string> = {};
      whatsappSettings?.forEach((s: any) => { waMap[s.setting_key] = (s.setting_value || '').trim(); });

      const instanceKey = language === 'en' ? 'whatsapp_instance_en' : 'whatsapp_instance';
      const tokenKey = language === 'en' ? 'whatsapp_token_en' : 'whatsapp_token';
      const instanceId = waMap[instanceKey] || waMap['whatsapp_instance'];
      const token = waMap[tokenKey] || waMap['whatsapp_token'];

      if (instanceId && token) {
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone.substring(1) : cleanPhone;
        const ultraUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;
        const ultraResponse = await fetch(ultraUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token, to: formattedPhone, body: botResponseText }),
        });

        const ultraResult = await ultraResponse.json();
        chatbotSent = ultraResult.sent === 'true' || ultraResult.sent === true || !!ultraResult.id;
        console.log(`📤 Chatbot response via UltraMsg: ${chatbotSent ? '✅' : '❌'}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      notification_sent: true,
      chatbot_response_sent: chatbotSent,
      process_id: matchedProcess.id,
      client_name: matchedProcess.client_name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
