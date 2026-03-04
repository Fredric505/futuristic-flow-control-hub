import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UltraMsgWebhookPayload {
  instanceId?: string;
  data?: {
    from?: string;
    body?: string;
    type?: string;
    chatName?: string;
  };
}

// English-speaking country codes
const englishSpeakingCountries = [
  '+1', '+44', '+61', '+64', '+27', '+353', '+1242', '+1246', '+1264', 
  '+1268', '+1284', '+1340', '+1345', '+1441', '+1473', '+1649', '+1664', 
  '+1670', '+1671', '+1684', '+1721', '+1758', '+1767', '+1784', '+1787', 
  '+1809', '+1829', '+1849', '+1868', '+1869', '+1876', '+1939'
];

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 Starting UltraMsg webhook processing - ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    console.log(`📥 Raw webhook payload: ${body}`);
    
    if (!body || body.trim() === '') {
      console.error('❌ Empty webhook payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Empty payload' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    let webhookData: UltraMsgWebhookPayload;
    try {
      webhookData = JSON.parse(body);
      console.log('✅ Parsed webhook data:', webhookData);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook JSON:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Extract sender phone and message
    const fromRaw = webhookData.data?.from || '';
    const messageBody = webhookData.data?.body || '';
    
    console.log(`📞 Raw from: "${fromRaw}" | Message: "${messageBody}"`);

    // Clean phone number (remove @c.us suffix and clean format)
    let senderPhone = fromRaw.replace(/@c\.us$/, '').replace(/[\s\-\(\)\.]/g, '');
    console.log(`🧹 Cleaned sender phone: "${senderPhone}"`);

    if (!senderPhone || senderPhone.length < 5) {
      console.error('❌ Invalid sender phone number');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid sender phone' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    if (!messageBody || messageBody.trim() === '') {
      console.error('❌ Empty message body');
      return new Response(
        JSON.stringify({ success: false, error: 'Empty message' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Setup Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      throw new Error('Missing Supabase configuration');
    }
    
    console.log('🔗 Connecting to Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate search patterns for phone number matching
    const generateSearchPatterns = (phone: string): string[] => {
      const patterns = new Set<string>();
      const clean = phone.replace(/[\s\-\(\)\.]/g, '');
      const onlyDigits = clean.replace(/\D/g, '');
      
      patterns.add(clean);
      patterns.add(onlyDigits);
      
      // With/without +
      if (clean.startsWith('+')) {
        patterns.add(clean.substring(1));
      } else {
        patterns.add('+' + clean);
      }
      
      // Generate variants for last 7-12 digits
      for (let i = 7; i <= Math.min(onlyDigits.length, 12); i++) {
        const suffix = onlyDigits.slice(-i);
        patterns.add(suffix);
        patterns.add('+' + suffix);
      }
      
      return Array.from(patterns).filter(p => p.length >= 5);
    };

    const searchPatterns = generateSearchPatterns(senderPhone);
    console.log(`🔍 Generated ${searchPatterns.length} search patterns`);

    // Find process matching the sender phone
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
      .not('profiles.telegram_bot_token', 'is', null)
      .not('profiles.telegram_chat_id', 'is', null)
      .limit(1000);

    if (processError) {
      console.error('❌ Error fetching processes:', processError);
      throw processError;
    }

    if (!allProcesses || allProcesses.length === 0) {
      console.log('⚠️ No processes found with Telegram configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No processes with Telegram config',
          notification_sent: false
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`🔍 Checking ${allProcesses.length} processes for phone match...`);

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
          
          // Match if exact match or last 8+ digits match
          if (
            variant === pattern ||
            variantDigits === patternDigits ||
            (patternDigits.length >= 8 && variantDigits.length >= 8 && 
             patternDigits.slice(-8) === variantDigits.slice(-8))
          ) {
            matchedProcess = proc;
            console.log(`✅ Matched process: ${proc.id} | Client: ${proc.client_name}`);
            break;
          }
        }
        if (matchedProcess) break;
      }
      if (matchedProcess) break;
    }

    if (!matchedProcess) {
      console.log('⚠️ No matching process found for sender phone');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No matching process found',
          notification_sent: false,
          sender_phone: senderPhone
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Extract Telegram config
    const telegramBotToken = (matchedProcess.profiles as any)?.telegram_bot_token;
    const telegramChatId = (matchedProcess.profiles as any)?.telegram_chat_id;

    if (!telegramBotToken || !telegramChatId) {
      console.log('⚠️ Missing Telegram configuration for matched process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Process found but Telegram not configured',
          notification_sent: false
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Build Telegram notification message
    const notificationText = `🔔 Alerta de proceso de WhatsApp\n\n` +
      `👩🏽‍💻 Servidor Astro\n\n` +
      `📊 INFORMACIÓN DEL PROCESO:\n` +
      `👤 Cliente: ${matchedProcess.client_name || 'N/A'}\n` +
      `📱 Modelo: ${matchedProcess.iphone_model || 'N/A'}\n` +
      `📞 IMEI: ${matchedProcess.imei || 'N/A'}\n` +
      `🔢 Serie: ${matchedProcess.serial_number || 'N/A'}\n` +
      `👥 Propietario: ${matchedProcess.owner_name || 'N/A'}\n\n` +
      `📞 Remitente: ${senderPhone}\n` +
      `📥 Respuesta: ${messageBody}\n\n` +
      `🤖 Bot Astro en línea 🟢`;

    console.log('📤 Sending Telegram notification...');
    
    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: notificationText,
        parse_mode: 'Markdown',
      }),
    });

    const telegramResult = await telegramResponse.json();
    console.log('📬 Telegram API response:', telegramResult);

    if (!telegramResponse.ok) {
      console.error('❌ Telegram API error:', telegramResult);
      throw new Error(`Telegram API error: ${JSON.stringify(telegramResult)}`);
    }

    console.log('✅ Notification sent successfully to Telegram');

    // ========== CHATBOT FUNCTIONALITY ==========
    console.log('🤖 Starting chatbot processing...');

    // Check if chatbot is enabled
    const { data: chatbotSettings, error: settingsError } = await supabase
      .from('chatbot_settings')
      .select('setting_key, setting_value');

    if (settingsError) {
      console.error('❌ Error fetching chatbot settings:', settingsError);
    }

    const settingsMap: Record<string, string> = {};
    if (chatbotSettings) {
      chatbotSettings.forEach((s: { setting_key: string; setting_value: string | null }) => {
        settingsMap[s.setting_key] = s.setting_value || '';
      });
    }

    const chatbotEnabled = settingsMap['chatbot_enabled'] === 'true';
    console.log(`🤖 Chatbot enabled: ${chatbotEnabled}`);

    if (!chatbotEnabled) {
      console.log('⚠️ Chatbot is disabled, skipping auto-response');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Telegram notification sent, chatbot disabled',
          notification_sent: true,
          chatbot_response_sent: false,
          process_id: matchedProcess.id,
          client_name: matchedProcess.client_name
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Determine language based on country code
    const processCountryCode = matchedProcess.country_code || '';
    const isEnglish = englishSpeakingCountries.some(code => processCountryCode.startsWith(code));
    const language = isEnglish ? 'en' : 'es';
    console.log(`🌐 Detected language: ${language} (country code: ${processCountryCode})`);

    // Fetch chatbot responses
    const { data: chatbotResponses, error: responsesError } = await supabase
      .from('chatbot_responses')
      .select('*')
      .eq('is_active', true);

    if (responsesError) {
      console.error('❌ Error fetching chatbot responses:', responsesError);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Telegram sent, but chatbot response failed',
          notification_sent: true,
          chatbot_response_sent: false,
          process_id: matchedProcess.id
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Find matching response based on keyword
    const normalizedMessage = messageBody.trim().toLowerCase();
    let matchedResponse = null;

    if (chatbotResponses) {
      for (const response of chatbotResponses) {
        if (response.keyword.toLowerCase() === normalizedMessage) {
          matchedResponse = response;
          break;
        }
      }
    }

    // If no match found, use fallback
    let botResponseText: string;
    if (matchedResponse) {
      botResponseText = language === 'en' ? matchedResponse.response_en : matchedResponse.response_es;
      console.log(`✅ Found matching response for keyword: "${normalizedMessage}"`);
    } else {
      botResponseText = language === 'en' 
        ? (settingsMap['fallback_response_en'] || "🤖 I didn't understand your message. Type *menu* to see available options.")
        : (settingsMap['fallback_response_es'] || '🤖 No entendí tu mensaje. Escribe *menu* para ver las opciones disponibles.');
      console.log(`⚠️ No matching keyword found, using fallback response`);
    }

    // ========== REPLACE USER-SPECIFIC URLs ==========
    // Fetch user's custom URLs and replace placeholders in the response
    const userId = matchedProcess.user_id;
    console.log(`🔗 Checking for user-specific URLs for user: ${userId}`);

    const { data: userUrls, error: userUrlsError } = await supabase
      .from('user_chatbot_urls')
      .select('url_key, url_value')
      .eq('user_id', userId);

    if (userUrlsError) {
      console.error('❌ Error fetching user URLs:', userUrlsError);
    } else if (userUrls && userUrls.length > 0) {
      console.log(`📋 Found ${userUrls.length} custom URLs for user`);
      
      // Replace each placeholder with user's custom URL
      for (const userUrl of userUrls) {
        const placeholder = `{{${userUrl.url_key}}}`;
        if (botResponseText.includes(placeholder)) {
          botResponseText = botResponseText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), userUrl.url_value);
          console.log(`✅ Replaced ${placeholder} with user's custom URL`);
        }
      }
    } else {
      console.log(`ℹ️ No custom URLs configured for user`);
    }

    // ========== REPLACE REMAINING PLACEHOLDERS WITH GLOBAL URLs ==========
    // Fetch global URLs from system_settings and replace any remaining placeholders
    const { data: globalUrls, error: globalUrlsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .like('setting_key', 'global_url_option_%');

    if (globalUrlsError) {
      console.error('❌ Error fetching global URLs:', globalUrlsError);
    } else if (globalUrls && globalUrls.length > 0) {
      console.log(`🌐 Found ${globalUrls.length} global URLs for fallback`);
      
      // Replace remaining placeholders with global URLs
      for (const globalUrl of globalUrls) {
        // Convert 'global_url_option_2' to 'url_option_2'
        const urlKey = globalUrl.setting_key.replace('global_', '');
        const placeholder = `{{${urlKey}}}`;
        if (botResponseText.includes(placeholder) && globalUrl.setting_value) {
          botResponseText = botResponseText.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), globalUrl.setting_value);
          console.log(`🌐 Replaced ${placeholder} with global URL`);
        }
      }
    } else {
      console.log(`⚠️ No global URLs configured`);
    }

    // Add 5 second delay to avoid automation bans
    console.log('⏳ Waiting 5 seconds before sending chatbot response...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get WhatsApp API settings based on language
    const { data: whatsappSettings, error: whatsappSettingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'whatsapp_instance', 'whatsapp_token',
        'whatsapp_instance_en', 'whatsapp_token_en',
        'whapi_token', 'whapi_token_en',
        'api_provider'
      ]);

    if (whatsappSettingsError) {
      console.error('❌ Error fetching WhatsApp settings:', whatsappSettingsError);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Telegram sent, but WhatsApp settings not found',
          notification_sent: true,
          chatbot_response_sent: false,
          process_id: matchedProcess.id
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    const whatsappSettingsMap: Record<string, string> = {};
    if (whatsappSettings) {
      whatsappSettings.forEach((s: { setting_key: string; setting_value: string | null }) => {
        whatsappSettingsMap[s.setting_key] = s.setting_value || '';
      });
    }

    // Decide provider intelligently based on available credentials
    let apiProvider = whatsappSettingsMap['api_provider'] || 'ultramsg';
    const hasUltraMsgCreds = !!(whatsappSettingsMap['whatsapp_instance'] && whatsappSettingsMap['whatsapp_token']);
    const hasWhapiCreds = !!(whatsappSettingsMap['whapi_token']);

    if (hasUltraMsgCreds && !hasWhapiCreds) {
      apiProvider = 'ultramsg';
    } else if (!hasUltraMsgCreds && hasWhapiCreds) {
      apiProvider = 'whapi';
    }

    console.log(`📡 Using API provider: ${apiProvider}`);

    let whatsappSendSuccess = false;
    let whatsappError = null;

    // Format phone for WhatsApp
    const formattedPhone = senderPhone.startsWith('+') ? senderPhone.substring(1) : senderPhone;

    if (apiProvider === 'whapi') {
      // Use Whapi.cloud API
      const whapiTokenKey = language === 'en' ? 'whapi_token_en' : 'whapi_token';
      const whapiToken = whatsappSettingsMap[whapiTokenKey] || whatsappSettingsMap['whapi_token'];

      if (!whapiToken) {
        console.error('❌ Whapi.cloud token not configured');
        whatsappError = 'Whapi.cloud token not configured';
      } else {
        console.log(`📤 Sending WhatsApp response via Whapi.cloud to ${formattedPhone}...`);
        
        try {
          const whapiResponse = await fetch('https://gate.whapi.cloud/messages/text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${whapiToken}`,
            },
            body: JSON.stringify({
              to: formattedPhone,
              body: botResponseText,
            }),
          });

          const whapiResult = await whapiResponse.json();
          console.log('📬 Whapi API response:', whapiResult);

          if (whapiResult.message_id) {
            whatsappSendSuccess = true;
            console.log('✅ WhatsApp response sent successfully via Whapi.cloud');
          } else {
            whatsappError = JSON.stringify(whapiResult);
            console.error('❌ Whapi send failed:', whapiResult);
          }
        } catch (e: unknown) {
          whatsappError = e instanceof Error ? e.message : String(e);
          console.error('❌ Error sending Whapi message:', e);
        }
      }
    } else if (apiProvider === 'ultramsg') {
      // Use UltraMSG API
      const instanceKey = language === 'en' ? 'whatsapp_instance_en' : 'whatsapp_instance';
      const tokenKey = language === 'en' ? 'whatsapp_token_en' : 'whatsapp_token';
      
      const instanceId = whatsappSettingsMap[instanceKey] || whatsappSettingsMap['whatsapp_instance'];
      const token = whatsappSettingsMap[tokenKey] || whatsappSettingsMap['whatsapp_token'];

      if (!instanceId || !token) {
        console.error('❌ UltraMSG credentials not configured');
        whatsappError = 'UltraMSG credentials not configured';
      } else {
        console.log(`📤 Sending WhatsApp response via UltraMSG to ${formattedPhone}...`);
        
        try {
          const ultramsgUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;
          const ultramsgResponse = await fetch(ultramsgUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              token: token,
              to: formattedPhone,
              body: botResponseText,
            }),
          });

          const ultramsgResult = await ultramsgResponse.json();
          console.log('📬 UltraMSG API response:', ultramsgResult);

          if (ultramsgResult.sent === 'true' || ultramsgResult.sent === true || ultramsgResult.id) {
            whatsappSendSuccess = true;
            console.log('✅ WhatsApp response sent successfully via UltraMSG');
          } else {
            whatsappError = JSON.stringify(ultramsgResult);
            console.error('❌ UltraMSG send failed:', ultramsgResult);
          }
        } catch (e: unknown) {
          whatsappError = e instanceof Error ? e.message : String(e);
          console.error('❌ Error sending UltraMSG message:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook processed',
        notification_sent: true,
        chatbot_response_sent: whatsappSendSuccess,
        chatbot_error: whatsappError,
        process_id: matchedProcess.id,
        client_name: matchedProcess.client_name,
        detected_language: language,
        matched_keyword: matchedResponse?.keyword || null
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('❌ Error processing webhook:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message,
        timestamp
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});