
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
        
        // Try to parse as text format
        requestData = {
          NotificationTitle: 'Mensaje de texto',
          NotificationMessage: body
        };
        console.log('Parsed as text format:', requestData);
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

    // Extract phone number and message more intelligently
    let phoneNumber = '';
    let messageText = '';
    
    const fullMessage = requestData.NotificationMessage || requestData.message || '';
    console.log('Full message to process:', fullMessage);
    
    // Improved phone number extraction with better code handling
    const extractedData = extractPhoneAndMessage(fullMessage);
    phoneNumber = extractedData.phone;
    messageText = extractedData.message;
    
    console.log('Final extracted data:', { phoneNumber, messageText });

    // If no valid phone number found, return error
    if (!phoneNumber || phoneNumber.length < 4) {
      console.log('No valid phone number found in message');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No phone number found',
          message: 'No se encontró un número de teléfono válido en el mensaje',
          received_data: requestData
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Connecting to Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clean and normalize phone number for search
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    console.log('Searching for process with phone number:', cleanPhoneNumber);

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

    // Search for the process
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
        .not('profiles.telegram_chat_id', 'is', null)
        .limit(10);

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
          patterns_tried: uniquePatterns
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

    // Enhanced message text handling for verification codes
    const displayMessage = messageText || 'Mensaje sin contenido';
    const isVerificationCode = /^\d{4,6}$/.test(messageText.trim());
    const messageType = isVerificationCode ? '🔐 CÓDIGO DE VERIFICACIÓN' : '📥 Respuesta o código';

    console.log('Message analysis:', {
      messageText,
      displayMessage,
      isVerificationCode,
      messageType
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
${messageType}: ${displayMessage}

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
        message_content: messageText,
        is_verification_code: isVerificationCode
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

// Enhanced function to extract phone number and message
function extractPhoneAndMessage(text: string): { phone: string; message: string } {
  if (!text) return { phone: '', message: '' };
  
  console.log('Extracting phone and message from:', text);
  
  // Enhanced patterns to match phone numbers in various formats
  const phonePatterns = [
    // International format with country code - more specific
    /(\+\d{1,4}[\s\-]?\d{4}[\s\-]?\d{4}(?:[\s\-]?\d{4})?)/g,
    // Nicaragua specific patterns
    /(\+505[\s\-]?\d{4}[\s\-]?\d{4})/g,
    // More flexible patterns
    /(\+?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}(?:[\s\-]?\d{3,4})?)/g,
  ];
  
  let phoneNumber = '';
  let messageText = text;
  
  // Try each pattern
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      phoneNumber = match[0];
      console.log('Phone number found:', phoneNumber);
      
      // Remove the phone number from the message to get the remaining text
      messageText = text.replace(phoneNumber, '').trim();
      
      // Clean up any leading/trailing separators
      messageText = messageText.replace(/^[-\s]+|[-\s]+$/g, '').trim();
      
      console.log('Message after removing phone:', messageText);
      break;
    }
  }
  
  // If no phone found with patterns, try to extract from the beginning
  if (!phoneNumber) {
    // Look for phone-like patterns at the start
    const startPatterns = [
      /^(\+\d{1,15})/,
      /^(\d{8,15})/
    ];
    
    for (const pattern of startPatterns) {
      const match = text.match(pattern);
      if (match) {
        phoneNumber = match[1];
        messageText = text.replace(phoneNumber, '').trim();
        messageText = messageText.replace(/^[-\s]+/, '').trim();
        console.log('Phone found at start:', phoneNumber, 'Message:', messageText);
        break;
      }
    }
  }
  
  // If still no phone, try to split by spaces and look for phone-like strings
  if (!phoneNumber) {
    const parts = text.split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Check if this looks like a phone number
      if (part.match(/^\+?[\d\s\-]{8,}$/)) {
        phoneNumber = part;
        // Get the rest as message
        messageText = parts.slice(i + 1).join(' ').trim();
        console.log('Phone found in parts:', phoneNumber, 'Message:', messageText);
        break;
      }
    }
  }
  
  // Special handling for verification codes (4-6 digits)
  if (!phoneNumber && /^\d{4,6}$/.test(text.trim())) {
    console.log('Detected verification code without phone number:', text.trim());
    // If it's just a verification code, we need to handle this differently
    // This might be the case where the phone number was not captured properly
    return { phone: '', message: text.trim() };
  }
  
  // Normalize phone number
  if (phoneNumber) {
    // If it doesn't start with + and looks like a Nicaragua number (8 digits)
    const cleanPhone = phoneNumber.replace(/[\s\-]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length === 8) {
      phoneNumber = '+505' + cleanPhone;
    }
  }
  
  console.log('Final extraction result:', { phone: phoneNumber, message: messageText });
  
  return { phone: phoneNumber, message: messageText };
}
