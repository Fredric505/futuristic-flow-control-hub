
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

    // Extract phone number and message with flexible approach
    const result = extractPhoneAndMessage(requestData);
    console.log('Extraction result:', result);

    if (!result.success) {
      console.log('Phone extraction failed:', result.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error,
          message: result.message,
          received_data: requestData
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const { phoneNumber, messageText } = result;
    console.log('Final extracted data:', { phoneNumber, messageText });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Connecting to Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clean and normalize phone number for search
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    console.log('Searching for process with phone number:', cleanPhoneNumber);

    // Enhanced search patterns - preserving full numbers
    const searchPatterns = [
      cleanPhoneNumber,
      phoneNumber,
      cleanPhoneNumber.startsWith('+') ? cleanPhoneNumber : `+${cleanPhoneNumber}`,
      cleanPhoneNumber.replace('+', ''),
      // For different country codes, try without them
      cleanPhoneNumber.replace(/^\+\d{1,4}/, ''),
      // Try with common variations
      cleanPhoneNumber.replace(/^\+/, ''),
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
          extraction_details: result
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
        is_verification_code: isVerificationCode,
        extraction_method: result.method
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

// Enhanced function to extract phone number and message with multiple strategies
function extractPhoneAndMessage(data: NotificationData): {
  success: boolean;
  phoneNumber?: string;
  messageText?: string;
  method?: string;
  error?: string;
  message?: string;
} {
  console.log('Starting phone and message extraction with data:', data);
  
  // Strategy 1: Use NotificationTitle for phone, NotificationMessage for message
  if (data.NotificationTitle && data.NotificationTitle.trim() !== '') {
    const phoneFromTitle = extractPhoneNumber(data.NotificationTitle);
    if (phoneFromTitle && phoneFromTitle.length >= 7) {
      console.log('Strategy 1 successful - phone from NotificationTitle:', phoneFromTitle);
      return {
        success: true,
        phoneNumber: phoneFromTitle,
        messageText: data.NotificationMessage || '',
        method: 'NotificationTitle + NotificationMessage'
      };
    }
  }
  
  // Strategy 2: Check if NotificationMessage contains both phone and message
  if (data.NotificationMessage && data.NotificationMessage.trim() !== '') {
    const messageContent = data.NotificationMessage.trim();
    console.log('Analyzing NotificationMessage for phone and message:', messageContent);
    
    // Strategy 2a: Check if message contains a phone number with a colon or separator
    const phoneWithSeparator = messageContent.match(/^([+\d\s\-\(\)]{7,})\s*[:]\s*(.*)$/);
    if (phoneWithSeparator) {
      const potentialPhone = phoneWithSeparator[1].trim();
      const messageAfterSeparator = phoneWithSeparator[2].trim();
      const cleanPhone = extractPhoneNumber(potentialPhone);
      
      if (cleanPhone && cleanPhone.length >= 7) {
        console.log('Strategy 2a successful - phone with separator:', cleanPhone, 'message:', messageAfterSeparator);
        return {
          success: true,
          phoneNumber: cleanPhone,
          messageText: messageAfterSeparator,
          method: 'NotificationMessage with separator'
        };
      }
    }
    
    // Strategy 2b: Check if message starts with a phone number pattern followed by space and text
    const phoneAndTextPattern = messageContent.match(/^(\+\d{1,4}[\s\-]?\d{7,15})\s+(.+)$/);
    if (phoneAndTextPattern) {
      const potentialPhone = phoneAndTextPattern[1].trim();
      const messageAfterPhone = phoneAndTextPattern[2].trim();
      const cleanPhone = extractPhoneNumber(potentialPhone);
      
      if (cleanPhone && cleanPhone.length >= 7) {
        console.log('Strategy 2b successful - phone and text pattern:', cleanPhone, 'message:', messageAfterPhone);
        return {
          success: true,
          phoneNumber: cleanPhone,
          messageText: messageAfterPhone,
          method: 'NotificationMessage phone and text pattern'
        };
      }
    }
    
    // Strategy 2c: Only if message starts with a clear phone number (not just any numbers)
    if (messageContent.match(/^[\+\d\s\-\(\)]{10,}/)) {
      const phoneFromMessage = extractPhoneNumber(messageContent);
      if (phoneFromMessage && phoneFromMessage.length >= 7) {
        // More careful extraction of message content
        let messageWithoutPhone = messageContent;
        
        // Remove the phone number from the beginning only if it's clearly at the start
        const phoneRegex = new RegExp(`^\\${phoneFromMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`);
        messageWithoutPhone = messageWithoutPhone.replace(phoneRegex, '').trim();
        
        console.log('Strategy 2c successful - phone from start of message:', phoneFromMessage, 'message:', messageWithoutPhone);
        return {
          success: true,
          phoneNumber: phoneFromMessage,
          messageText: messageWithoutPhone,
          method: 'NotificationMessage phone extraction'
        };
      }
    }
  }
  
  // Strategy 3: Try sender field
  if (data.sender) {
    const phoneFromSender = extractPhoneNumber(data.sender);
    if (phoneFromSender && phoneFromSender.length >= 7) {
      console.log('Strategy 3 successful - phone from sender:', phoneFromSender);
      return {
        success: true,
        phoneNumber: phoneFromSender,
        messageText: data.message || data.NotificationMessage || '',
        method: 'sender field'
      };
    }
  }
  
  // Strategy 4: Last resort - try to find any phone-like pattern in any field
  const allText = [
    data.NotificationTitle,
    data.NotificationMessage, 
    data.message,
    data.sender
  ].filter(Boolean).join(' ');
  
  if (allText) {
    const phoneFromAll = extractPhoneNumber(allText);
    if (phoneFromAll && phoneFromAll.length >= 7) {
      console.log('Strategy 4 successful - phone from combined text:', phoneFromAll);
      return {
        success: true,
        phoneNumber: phoneFromAll,
        messageText: data.NotificationMessage || data.message || '',
        method: 'combined text search'
      };
    }
  }
  
  console.log('All extraction strategies failed');
  return {
    success: false,
    error: 'No phone number found',
    message: 'No se encontró un número de teléfono válido en los datos recibidos',
  };
}

// FIXED function to extract phone number from text - now preserves complete numbers
function extractPhoneNumber(text: string): string {
  if (!text) return '';
  
  console.log('Extracting phone number from text:', text);
  
  // First, try to find international format numbers with country codes
  const internationalPattern = /(\+\d{1,4}[\s\-]?\d{8,15})/g;
  let matches = text.match(internationalPattern);
  
  if (matches) {
    // Return the longest match (most complete number)
    const longestMatch = matches.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
    console.log('International format phone found:', longestMatch);
    return longestMatch;
  }
  
  // If no international format, try to find numbers without country code
  const localPattern = /(\d{8,15})/g;
  matches = text.match(localPattern);
  
  if (matches) {
    // Return the longest match and add + if it seems like a full number
    const longestMatch = matches.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
    
    // If it's a reasonably long number, assume it needs a country code
    if (longestMatch.length >= 8) {
      const result = '+' + longestMatch;
      console.log('Local format phone found (added +):', result);
      return result;
    }
  }
  
  // Last resort: try to extract any sequence that looks like a phone number
  const anyDigitPattern = /(\+?[\d\s\-\(\)]+)/g;
  matches = text.match(anyDigitPattern);
  
  if (matches) {
    for (const match of matches) {
      const cleaned = match.replace(/[\s\-\(\)]/g, '');
      if (cleaned.length >= 7 && cleaned.length <= 15 && /^\+?\d+$/.test(cleaned)) {
        const result = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
        console.log('Fallback phone extraction:', result);
        return result;
      }
    }
  }
  
  console.log('No phone number found in text');
  return '';
}
