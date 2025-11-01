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
    const telegramBotToken = matchedProcess.profiles?.telegram_bot_token;
    const telegramChatId = matchedProcess.profiles?.telegram_chat_id;

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

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification sent',
        notification_sent: true,
        process_id: matchedProcess.id,
        client_name: matchedProcess.client_name
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
