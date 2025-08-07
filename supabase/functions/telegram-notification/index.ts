
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
      console.log('User-Agent header:', req.headers.get('user-agent'));
      
      if (!body || body.trim() === '') {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Empty request body',
            message: 'No se recibió contenido en la solicitud',
            timestamp
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }

      // Intentar parsear como JSON primero
      try {
        requestData = JSON.parse(body);
        console.log('Successfully parsed as JSON:', requestData);
      } catch (jsonError) {
        console.log('Failed to parse as JSON, trying to extract phone and message from text...');
        
        // Verificar si son variables de IFTTT que no se reemplazaron
        if (body.includes('{{NotificationTitle}}') || body.includes('{{NotificationMessage}}')) {
          console.error('Detected IFTTT template variables that weren\'t replaced');
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'IFTTT template error',
              message: 'Las variables de IFTTT no se reemplazaron correctamente. Verifica tu configuración de IFTTT.',
              received_body: body,
              timestamp
            }), 
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }
        
        // Patrones mejorados para extraer teléfono y mensaje
        const patterns = [
          // Patrón internacional con +
          /^(\+\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{0,4})\s+(.*)$/,
          // Patrón nacional sin +
          /^(\d{8,15})\s+(.*)$/,
          // Patrón con código de país separado
          /^(\d{1,4})\s+(\d{8,12})\s+(.*)$/
        ];
        
        let matched = false;
        
        for (const pattern of patterns) {
          const match = body.trim().match(pattern);
          if (match) {
            if (match.length === 3) {
              // Patrón simple: teléfono + mensaje
              requestData = {
                NotificationTitle: match[1].trim(),
                NotificationMessage: match[2].trim() || ''
              };
            } else if (match.length === 4) {
              // Patrón con código de país: código + teléfono + mensaje
              requestData = {
                NotificationTitle: `${match[1]}${match[2]}`.trim(),
                NotificationMessage: match[3].trim() || ''
              };
            }
            console.log('Extracted with pattern:', pattern.source, 'Result:', requestData);
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          // Último recurso: dividir por espacio
          const parts = body.trim().split(/\s+/);
          if (parts.length >= 2) {
            requestData = {
              NotificationTitle: parts[0],
              NotificationMessage: parts.slice(1).join(' ')
            };
            console.log('Fallback split by space:', requestData);
          } else {
            // Caso extremo: solo mensaje
            requestData = {
              NotificationTitle: 'Número desconocido',
              NotificationMessage: body.trim()
            };
            console.log('Last resort format:', requestData);
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
          details: parseError.message,
          timestamp
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    console.log('Final parsed notification data:', requestData);

    const phoneNumber = requestData.NotificationTitle || '';
    const messageText = requestData.NotificationMessage || requestData.message || '';
    
    console.log('Processing - Phone:', phoneNumber, 'Message:', messageText, 'Length:', messageText.length);

    // Validar número de teléfono
    if (!phoneNumber || phoneNumber.trim() === '' || phoneNumber === 'Número desconocido') {
      console.error('No valid phone number found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No phone number found',
          message: 'No se encontró número de teléfono válido',
          received_data: requestData,
          timestamp
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Validar que hay mensaje
    if (!messageText || messageText.trim() === '') {
      console.error('No message content found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No message content',
          message: 'No se encontró contenido del mensaje',
          received_data: requestData,
          timestamp
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('Validation passed - proceeding with database lookup');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Missing Supabase configuration');
    }
    
    console.log('Connecting to Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Limpiar y normalizar número
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
    console.log('Cleaned phone number:', cleanPhoneNumber);

    // Generar patrones de búsqueda más exhaustivos
    const generateSearchPatterns = (phone: string) => {
      const patterns = new Set<string>();
      const clean = phone.replace(/[\s\-\(\)\.]/g, '');
      
      // Agregar el número original
      patterns.add(phone);
      patterns.add(clean);
      
      // Variantes con/sin +
      if (clean.startsWith('+')) {
        patterns.add(clean.substring(1));
      } else {
        patterns.add('+' + clean);
      }
      
      // Patrones por longitud (más agresivo)
      if (clean.length >= 7) {
        for (let i = 7; i <= Math.min(clean.length, 15); i++) {
          patterns.add(clean.slice(-i));
          if (!clean.startsWith('+')) {
            patterns.add('+' + clean.slice(-i));
          }
        }
      }
      
      // Patrones específicos por país
      const countryMappings = {
        // USA/Canadá
        '1': [10, 11],
        // México  
        '52': [10, 11, 12],
        // Argentina
        '54': [10, 11, 12],
        // Brasil
        '55': [10, 11, 12],
        // Colombia
        '57': [10, 11],
        // España
        '34': [9],
        // Centroamérica
        '505': [8], // Nicaragua
        '506': [8], // Costa Rica
        '507': [8], // Panamá
        '51': [9],  // Perú
        '56': [9],  // Chile
      };
      
      // Detectar y generar variantes por país
      for (const [countryCode, lengths] of Object.entries(countryMappings)) {
        const cleanWithoutPlus = clean.startsWith('+') ? clean.substring(1) : clean;
        
        if (cleanWithoutPlus.startsWith(countryCode)) {
          const withoutCountry = cleanWithoutPlus.substring(countryCode.length);
          patterns.add(withoutCountry);
          patterns.add(countryCode + withoutCountry);
          patterns.add('+' + countryCode + withoutCountry);
          
          // Variantes de longitud específicas del país
          for (const len of lengths) {
            if (withoutCountry.length >= len) {
              patterns.add(withoutCountry.slice(-len));
              patterns.add(countryCode + withoutCountry.slice(-len));
              patterns.add('+' + countryCode + withoutCountry.slice(-len));
            }
          }
        }
      }
      
      return Array.from(patterns).filter(p => p && p.length >= 7);
    };

    const searchPatterns = generateSearchPatterns(cleanPhoneNumber);
    console.log('Generated search patterns:', searchPatterns.length, 'patterns:', searchPatterns);

    let matchedProcess = null;
    let matchedPattern = '';

    // Búsqueda mejorada con múltiples estrategias
    console.log('Starting database search...');
    
    // Estrategia 1: Búsqueda directa en phone_number
    for (const pattern of searchPatterns) {
      console.log(`Searching phone_number field with pattern: "${pattern}"`);
      
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

      if (processes && processes.length > 0) {
        matchedProcess = processes[0];
        matchedPattern = pattern;
        console.log('✅ Match found with phone_number pattern:', pattern);
        break;
      }
    }

    // Estrategia 2: Búsqueda combinada country_code + phone_number
    if (!matchedProcess) {
      console.log('No direct match found, trying combined search...');
      
      const { data: allProcesses, error: combinedError } = await supabase
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
        .limit(50);

      if (!combinedError && allProcesses) {
        console.log(`Checking ${allProcesses.length} processes for combined patterns...`);
        
        for (const proc of allProcesses) {
          const fullNumber = `${proc.country_code || ''}${proc.phone_number || ''}`.replace(/[\s\-\(\)\.]/g, '');
          const fullNumberWithPlus = fullNumber.startsWith('+') ? fullNumber : `+${fullNumber}`;
          
          // Crear variantes del número completo
          const procVariants = [
            proc.phone_number,
            fullNumber,
            fullNumberWithPlus,
            proc.phone_number?.replace(/[\s\-\(\)\.]/g, ''),
          ].filter(Boolean);
          
          // Comprobar todas las combinaciones
          for (const pattern of searchPatterns) {
            for (const variant of procVariants) {
              if (variant === pattern || 
                  variant?.endsWith(pattern) || 
                  pattern.endsWith(variant || '')) {
                matchedProcess = proc;
                matchedPattern = pattern;
                console.log('✅ Match found with combined pattern:', pattern, 'matching variant:', variant, 'from process:', proc.client_name);
                break;
              }
            }
            if (matchedProcess) break;
          }
          if (matchedProcess) break;
        }
      }
    }

    // Estrategia 3: Búsqueda flexible por similitud
    if (!matchedProcess) {
      console.log('No combined match found, trying flexible search...');
      
      // Tomar los últimos 8 dígitos del número entrante para búsqueda flexible
      const lastDigits = cleanPhoneNumber.replace(/\D/g, '').slice(-8);
      
      if (lastDigits.length >= 7) {
        const { data: flexibleProcesses, error: flexError } = await supabase
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
          .limit(100);

        if (!flexError && flexibleProcesses) {
          console.log(`Flexible search checking ${flexibleProcesses.length} processes for last digits: ${lastDigits}...`);
          
          for (const proc of flexibleProcesses) {
            const procDigits = `${proc.country_code || ''}${proc.phone_number || ''}`.replace(/\D/g, '');
            
            if (procDigits.length >= 7 && lastDigits.length >= 7) {
              // Comparar los últimos 7-8 dígitos
              const procLast8 = procDigits.slice(-8);
              const procLast7 = procDigits.slice(-7);
              const incomingLast7 = lastDigits.slice(-7);
              
              if (procLast8 === lastDigits || procLast7 === incomingLast7) {
                matchedProcess = proc;
                matchedPattern = `flexible-${lastDigits}`;
                console.log('✅ Match found with flexible pattern - last digits:', lastDigits, 'matched process:', proc.client_name);
                break;
              }
            }
          }
        }
      }
    }

    if (!matchedProcess) {
      console.error('❌ No matching process found after exhaustive search');
      console.log('Search summary:', {
        original_phone: phoneNumber,
        cleaned_phone: cleanPhoneNumber,
        patterns_tried: searchPatterns.length,
        message_preview: messageText.substring(0, 100)
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Process not found',
          message: `No se encontró un proceso con el número de teléfono: ${cleanPhoneNumber}`,
          phone_searched: cleanPhoneNumber,
          patterns_tried: searchPatterns,
          timestamp
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    const process = matchedProcess;
    const profile = process.profiles;

    console.log('✅ Process found:', {
      process_id: process.id,
      client_name: process.client_name,
      user_id: process.user_id,
      matched_pattern: matchedPattern,
      has_bot_token: !!profile.telegram_bot_token,
      has_chat_id: !!profile.telegram_chat_id
    });

    if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
      console.error('❌ User has not configured Telegram bot');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Telegram not configured',
          message: 'El usuario no ha configurado su bot de Telegram',
          process_id: process.id,
          timestamp
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Análisis del mensaje para determinar el tipo
    const messageAnalysis = analyzeMessage(messageText);
    console.log('Message analysis:', messageAnalysis);

    const notificationMessage = buildNotificationMessage(process, phoneNumber, messageText, messageAnalysis);
    console.log('Built notification message length:', notificationMessage.length);

    // Enviar a Telegram con reintentos
    console.log('Sending notification to Telegram...');
    
    const telegramUrl = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;
    const maxRetries = 3;
    let attempt = 0;
    let telegramResult = null;
    
    while (attempt < maxRetries) {
      attempt++;
      console.log(`Telegram send attempt ${attempt}/${maxRetries}`);
      
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

        telegramResult = await telegramResponse.json();
        
        if (telegramResponse.ok && telegramResult.ok) {
          console.log('✅ Notification sent successfully on attempt', attempt);
          break;
        } else {
          console.error(`❌ Telegram API error on attempt ${attempt}:`, telegramResult);
          if (attempt === maxRetries) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Failed to send Telegram message after retries',
                details: telegramResult,
                attempts: attempt,
                timestamp
              }), 
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            );
          }
          // Esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (fetchError) {
        console.error(`❌ Network error on attempt ${attempt}:`, fetchError);
        if (attempt === maxRetries) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Network error sending to Telegram',
              details: fetchError.message,
              attempts: attempt,
              timestamp
            }), 
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    console.log('✅ Notification process completed successfully');
    console.log('Final result:', {
      user_id: process.user_id,
      process_id: process.id,
      client_name: process.client_name,
      message_type: messageAnalysis.type,
      matched_pattern: matchedPattern,
      attempts_needed: attempt
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        process_id: process.id,
        user_id: process.user_id,
        client_name: process.client_name,
        phone_number: cleanPhoneNumber,
        matched_pattern: matchedPattern,
        message_content: messageText,
        message_type: messageAnalysis.type,
        code_length: messageAnalysis.codeLength,
        attempts_used: attempt,
        timestamp
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Critical error processing notification:', error);
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

// Función para analizar el tipo de mensaje
function analyzeMessage(message: string) {
  const trimmed = message.trim();
  const isNumeric = /^\d+$/.test(trimmed);
  const length = trimmed.length;
  
  return {
    type: isNumeric ? (length >= 4 && length <= 6 ? 'code_obtained' : 'verification_code') : 'regular_message',
    codeLength: isNumeric ? length : null,
    isCode: isNumeric && length >= 1 && length <= 8
  };
}

// Función para construir el mensaje de notificación
function buildNotificationMessage(process: any, phoneNumber: string, messageText: string, analysis: any) {
  const isCodeObtained = analysis.type === 'code_obtained';
  const isVerificationCode = analysis.type === 'verification_code';
  
  return `🔔 Alerta de proceso de WhatsApp

👩🏽‍💻 Servidor Astro

📊 INFORMACIÓN DEL PROCESO:
👤 Cliente: ${process.client_name}
📱 Modelo: ${process.iphone_model}
📞 IMEI: ${process.imei}
🔢 Serie: ${process.serial_number}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 Remitente: ${phoneNumber}
${isVerificationCode ? 
  (isCodeObtained ? 
    `🔐 CÓDIGO OBTENIDO: ${messageText} (${analysis.codeLength} dígitos)` : 
    `🔐 CÓDIGO DE VERIFICACIÓN: ${messageText} (${analysis.codeLength} dígitos)`) :
  `📥 Respuesta: ${messageText}`
}

🤖 Bot Astro en línea 🟢`;
}
