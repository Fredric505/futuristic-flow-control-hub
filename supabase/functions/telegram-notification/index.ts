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
  console.log(`[${timestamp}] 🚀 STARTING telegram-notification request - ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📝 Processing notification request...');
    
    let requestData: NotificationData;
    
    try {
      const body = await req.text();
      console.log(`📥 Raw request body received: "${body}"`);
      console.log(`📋 Content-Type: ${req.headers.get('content-type')}`);
      console.log(`🌐 User-Agent: ${req.headers.get('user-agent')}`);
      
      if (!body || body.trim() === '') {
        console.error('❌ Empty request body received');
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
        console.log('✅ Successfully parsed as JSON:', requestData);
      } catch (jsonError) {
        console.log('⚠️ Failed to parse as JSON, trying text extraction...');
        
        // Verificar si son variables de IFTTT que no se reemplazaron
        if (body.includes('{{NotificationTitle}}') || body.includes('{{NotificationMessage}}')) {
          console.error('❌ Detected IFTTT template variables that weren\'t replaced');
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
        
        // Patrones mejorados para extraer teléfono y mensaje con más flexibilidad
        const patterns = [
          // Patrón internacional completo con +
          /^(\+\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})\s+(.+)$/,
          // Patrón solo números largos
          /^(\d{10,15})\s+(.+)$/,
          // Patrón con código de país separado
          /^(\d{1,4})\s+(\d{8,12})\s+(.+)$/,
          // Patrón más flexible
          /^([+\d\s\-]{7,20})\s+(.+)$/
        ];
        
        let matched = false;
        
        for (const pattern of patterns) {
          const match = body.trim().match(pattern);
          if (match) {
            console.log(`📞 Pattern matched: ${pattern.source}`);
            if (match.length === 3) {
              // Patrón simple: teléfono + mensaje
              requestData = {
                NotificationTitle: match[1].trim(),
                NotificationMessage: match[2].trim() || ''
              };
            } else if (match.length === 4) {
              // Patrón con código de país: código + teléfono + mensaje
              requestData = {
                NotificationTitle: `${match[1].trim()}${match[2].trim()}`,
                NotificationMessage: match[3].trim() || ''
              };
            }
            console.log('✅ Extracted data:', requestData);
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          console.log('⚠️ No pattern matched, trying fallback extraction...');
          // Último recurso: dividir por espacio y tomar el primer elemento como teléfono
          const parts = body.trim().split(/\s+/);
          if (parts.length >= 2) {
            requestData = {
              NotificationTitle: parts[0],
              NotificationMessage: parts.slice(1).join(' ')
            };
            console.log('🔄 Fallback extraction result:', requestData);
          } else {
            console.error('❌ Could not extract phone and message from text');
            requestData = {
              NotificationTitle: 'Unknown',
              NotificationMessage: body.trim()
            };
          }
        }
      }
    } catch (parseError) {
      console.error('❌ Critical error parsing request body:', parseError);
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
    
    console.log('📋 Final parsed notification data:', requestData);

    const phoneNumber = requestData.NotificationTitle || '';
    const messageText = requestData.NotificationMessage || requestData.message || '';
    
    console.log(`📞 Processing - Phone: "${phoneNumber}" | Message: "${messageText}" | Length: ${messageText.length}`);

    // Validación más estricta del número de teléfono
    if (!phoneNumber || phoneNumber.trim() === '' || phoneNumber === 'Unknown' || phoneNumber.length < 7) {
      console.error('❌ Invalid phone number detected:', phoneNumber);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number',
          message: `Número de teléfono inválido: "${phoneNumber}"`,
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
      console.error('❌ No message content found');
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

    console.log('✅ Validation passed - proceeding with database lookup');

    // Configurar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      throw new Error('Missing Supabase configuration');
    }
    
    console.log('🔗 Connecting to Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Limpiar y normalizar número de teléfono
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
    console.log(`🧹 Cleaned phone number: "${cleanPhoneNumber}"`);

    // Función MEJORADA para generar patrones de búsqueda específicos para países problemáticos
    const generateSearchPatterns = (phone: string) => {
      const patterns = new Set<string>();
      const clean = phone.replace(/[\s\-\(\)\.]/g, '');
      
      // Agregar número original y limpio
      patterns.add(phone);
      patterns.add(clean);
      
      // Variantes con/sin +
      if (clean.startsWith('+')) {
        patterns.add(clean.substring(1));
      } else {
        patterns.add('+' + clean);
      }
      
      // Patrones específicos mejorados para países problemáticos
      const countryMappings = {
        '593': { lengths: [9], name: 'Ecuador' },      // Ecuador - ESPECÍFICO
        '52': { lengths: [10, 11, 12], name: 'México' }, // México - ESPECÍFICO  
        '57': { lengths: [10, 11, 12], name: 'Colombia' }, // Colombia - ESPECÍFICO
        '1': { lengths: [10, 11], name: 'USA/Canadá' },
        '54': { lengths: [10, 11, 12], name: 'Argentina' },
        '55': { lengths: [10, 11, 12], name: 'Brasil' },
        '34': { lengths: [9], name: 'España' },
        '505': { lengths: [8], name: 'Nicaragua' },
        '506': { lengths: [8], name: 'Costa Rica' },
        '507': { lengths: [8], name: 'Panamá' },
        '51': { lengths: [9], name: 'Perú' },
        '56': { lengths: [9], name: 'Chile' },
        '58': { lengths: [10, 11], name: 'Venezuela' },
        '503': { lengths: [8], name: 'El Salvador' },
        '502': { lengths: [8], name: 'Guatemala' },
        '504': { lengths: [8], name: 'Honduras' },
      };
      
      // Detectar y generar variantes por país
      const cleanWithoutPlus = clean.startsWith('+') ? clean.substring(1) : clean;
      
      for (const [countryCode, config] of Object.entries(countryMappings)) {
        if (cleanWithoutPlus.startsWith(countryCode)) {
          const withoutCountry = cleanWithoutPlus.substring(countryCode.length);
          console.log(`🏁 Detected country: ${config.name} (${countryCode}), processing number: ${withoutCountry}`);
          
          // Variantes básicas
          patterns.add(withoutCountry);
          patterns.add(countryCode + withoutCountry);
          patterns.add('+' + countryCode + withoutCountry);
          
          // Variantes de longitud específicas del país
          for (const len of config.lengths) {
            if (withoutCountry.length >= len) {
              const lengthVariant = withoutCountry.slice(-len);
              patterns.add(lengthVariant);
              patterns.add(countryCode + lengthVariant);
              patterns.add('+' + countryCode + lengthVariant);
              
              // Para países problemáticos, agregar más variantes
              if (['593', '52', '57'].includes(countryCode)) {
                // Variantes sin ceros iniciales
                const withoutLeadingZero = lengthVariant.replace(/^0+/, '');
                if (withoutLeadingZero && withoutLeadingZero !== lengthVariant) {
                  patterns.add(withoutLeadingZero);
                  patterns.add(countryCode + withoutLeadingZero);
                  patterns.add('+' + countryCode + withoutLeadingZero);
                }
                
                // Variantes con cero inicial
                if (!lengthVariant.startsWith('0') && lengthVariant.length < 10) {
                  const withLeadingZero = '0' + lengthVariant;
                  patterns.add(withLeadingZero);
                  patterns.add(countryCode + withLeadingZero);
                  patterns.add('+' + countryCode + withLeadingZero);
                }
              }
            }
          }
        }
      }
      
      // Generar variantes de longitud más agresivas (para casos edge)
      if (clean.length >= 8) {
        for (let i = 8; i <= Math.min(clean.length, 15); i++) {
          const suffix = clean.slice(-i);
          patterns.add(suffix);
          if (!suffix.startsWith('+')) {
            patterns.add('+' + suffix);
          }
        }
      }
      
      return Array.from(patterns).filter(p => p && p.length >= 7);
    };

    const searchPatterns = generateSearchPatterns(cleanPhoneNumber);
    console.log(`🔍 Generated ${searchPatterns.length} search patterns:`, searchPatterns);

    let matchedProcess = null;
    let matchedPattern = '';

    // ESTRATEGIA 1: Búsqueda directa en phone_number (MÁS AGRESIVA)
    console.log('🎯 STRATEGY 1: Direct phone_number search...');
    for (const pattern of searchPatterns) {
      console.log(`  🔍 Searching phone_number field with pattern: "${pattern}"`);
      
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
        .limit(5);

      if (queryError) {
        console.error(`❌ Database query error for pattern "${pattern}":`, queryError);
        continue;
      }

      if (processes && processes.length > 0) {
        matchedProcess = processes[0];
        matchedPattern = pattern;
        console.log(`✅ MATCH FOUND with direct pattern: "${pattern}" -> Process: ${matchedProcess.client_name}`);
        break;
      }
    }

    // ESTRATEGIA 2: Búsqueda combinada country_code + phone_number (MEJORADA)
    if (!matchedProcess) {
      console.log('🎯 STRATEGY 2: Combined country_code + phone_number search...');
      
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
        .limit(200);

      if (!combinedError && allProcesses) {
        console.log(`🔍 Checking ${allProcesses.length} processes for combined patterns...`);
        
        for (const proc of allProcesses) {
          const fullNumber = `${proc.country_code || ''}${proc.phone_number || ''}`.replace(/[\s\-\(\)\.]/g, '');
          const fullNumberWithPlus = fullNumber.startsWith('+') ? fullNumber : `+${fullNumber}`;
          
          // Crear variantes del número completo
          const procVariants = [
            proc.phone_number,
            fullNumber,
            fullNumberWithPlus,
            proc.phone_number?.replace(/[\s\-\(\)\.]/g, ''),
            // Variantes adicionales para países problemáticos
            proc.country_code + proc.phone_number,
            '+' + proc.country_code + proc.phone_number,
          ].filter(Boolean);
          
          // Comprobar todas las combinaciones de forma más flexible
          for (const pattern of searchPatterns) {
            for (const variant of procVariants) {
              if (variant === pattern || 
                  variant?.endsWith(pattern) || 
                  pattern.endsWith(variant || '') ||
                  variant?.includes(pattern) ||
                  pattern.includes(variant || '') ||
                  // Comparación sin espacios ni caracteres especiales
                  variant?.replace(/[\s\-\(\)\.]/g, '') === pattern.replace(/[\s\-\(\)\.]/g, '') ||
                  // Comparación de los últimos N dígitos
                  (variant && pattern.length >= 8 && variant.slice(-8) === pattern.slice(-8)) ||
                  (variant && pattern.length >= 9 && variant.slice(-9) === pattern.slice(-9))) {
                matchedProcess = proc;
                matchedPattern = pattern;
                console.log(`✅ MATCH FOUND with combined pattern: "${pattern}" matching variant: "${variant}" -> Process: ${proc.client_name}`);
                break;
              }
            }
            if (matchedProcess) break;
          }
          if (matchedProcess) break;
        }
      }
    }

    // ESTRATEGIA 3: Búsqueda ultra-flexible para países problemáticos
    if (!matchedProcess) {
      console.log('🎯 STRATEGY 3: Ultra-flexible search for problematic countries...');
      
      // Extraer solo los dígitos del número entrante
      const incomingDigits = cleanPhoneNumber.replace(/\D/g, '');
      
      // Identificar si es de países problemáticos
      const isProblematicCountry = incomingDigits.startsWith('593') || // Ecuador
                                  incomingDigits.startsWith('52') ||  // México
                                  incomingDigits.startsWith('57');   // Colombia
      
      if (isProblematicCountry && incomingDigits.length >= 8) {
        console.log(`🚨 Detected problematic country number: ${incomingDigits}, applying ultra-flexible search...`);
        
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
          .limit(300);

        if (!flexError && flexibleProcesses) {
          console.log(`🔍 Ultra-flexible search checking ${flexibleProcesses.length} processes...`);
          
          // Tomar diferentes variantes de los últimos dígitos
          const lastDigitsVariants = [
            incomingDigits.slice(-10), // Últimos 10
            incomingDigits.slice(-9),  // Últimos 9
            incomingDigits.slice(-8),  // Últimos 8
            incomingDigits.slice(-7),  // Últimos 7
          ].filter(v => v.length >= 7);
          
          for (const proc of flexibleProcesses) {
            const procDigits = `${proc.country_code || ''}${proc.phone_number || ''}`.replace(/\D/g, '');
            
            if (procDigits.length >= 7) {
              // Comparar con las variantes de últimos dígitos
              for (const variant of lastDigitsVariants) {
                const procLastDigits = procDigits.slice(-variant.length);
                
                if (procLastDigits === variant ||
                    procDigits.endsWith(variant) ||
                    variant.endsWith(procLastDigits) ||
                    // Comparación ultra-flexible de números similares
                    (variant.length >= 8 && procLastDigits.length >= 8 && 
                     Math.abs(variant.length - procLastDigits.length) <= 1 &&
                     variant.slice(-7) === procLastDigits.slice(-7))) {
                  matchedProcess = proc;
                  matchedPattern = `ultra-flexible-${variant}`;
                  console.log(`✅ ULTRA-FLEXIBLE MATCH FOUND: incoming="${variant}" matched process="${procLastDigits}" -> ${proc.client_name}`);
                  break;
                }
              }
              if (matchedProcess) break;
            }
          }
        }
      }
    }

    // Verificar si se encontró un proceso
    if (!matchedProcess) {
      console.error('❌ NO MATCHING PROCESS FOUND after exhaustive search');
      console.log('🔍 Search summary:', {
        original_phone: phoneNumber,
        cleaned_phone: cleanPhoneNumber,
        patterns_tried: searchPatterns.length,
        message_preview: messageText.substring(0, 100),
        is_problematic_country: cleanPhoneNumber.replace(/\D/g, '').startsWith('593') || 
                               cleanPhoneNumber.replace(/\D/g, '').startsWith('52') || 
                               cleanPhoneNumber.replace(/\D/g, '').startsWith('57')
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Process not found',
          message: `❌ No se encontró un proceso con el número: ${cleanPhoneNumber}`,
          phone_searched: cleanPhoneNumber,
          patterns_tried: searchPatterns,
          search_summary: {
            original: phoneNumber,
            cleaned: cleanPhoneNumber,
            patterns_count: searchPatterns.length,
            is_problematic_country: cleanPhoneNumber.replace(/\D/g, '').startsWith('593') || 
                                   cleanPhoneNumber.replace(/\D/g, '').startsWith('52') || 
                                   cleanPhoneNumber.replace(/\D/g, '').startsWith('57')
          },
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

    console.log('✅ PROCESS FOUND:', {
      process_id: process.id,
      client_name: process.client_name,
      user_id: process.user_id,
      matched_pattern: matchedPattern,
      has_bot_token: !!profile.telegram_bot_token,
      has_chat_id: !!profile.telegram_chat_id,
      country_code: process.country_code,
      phone_number: process.phone_number
    });

    // Verificar configuración de Telegram
    if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
      console.error('❌ User has not configured Telegram bot');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Telegram not configured',
          message: 'El usuario no ha configurado su bot de Telegram correctamente',
          process_id: process.id,
          client_name: process.client_name,
          timestamp
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Análisis del mensaje
    const messageAnalysis = analyzeMessage(messageText);
    console.log('📊 Message analysis:', messageAnalysis);

    // Construir mensaje de notificación
    const notificationMessage = buildNotificationMessage(process, phoneNumber, messageText, messageAnalysis);
    console.log(`📝 Built notification message (${notificationMessage.length} chars)`);

    // Enviar a Telegram con sistema de reintentos mejorado
    console.log('🚀 Sending notification to Telegram...');
    
    const telegramUrl = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;
    const maxRetries = 5;
    let attempt = 0;
    let telegramResult = null;
    let lastError = null;
    
    while (attempt < maxRetries) {
      attempt++;
      console.log(`📤 Telegram send attempt ${attempt}/${maxRetries}`);
      
      try {
        const telegramResponse = await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: profile.telegram_chat_id,
            text: notificationMessage,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          }),
        });

        telegramResult = await telegramResponse.json();
        
        if (telegramResponse.ok && telegramResult.ok) {
          console.log(`✅ Notification sent successfully on attempt ${attempt}`);
          break;
        } else {
          lastError = telegramResult;
          console.error(`❌ Telegram API error on attempt ${attempt}:`, telegramResult);
          
          if (attempt === maxRetries) {
            console.error('❌ All Telegram send attempts failed');
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Failed to send Telegram message after all retries',
                details: telegramResult,
                attempts: attempt,
                process_info: {
                  id: process.id,
                  client_name: process.client_name,
                  user_id: process.user_id
                },
                timestamp
              }), 
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
              }
            );
          }
          
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (fetchError) {
        lastError = fetchError;
        console.error(`❌ Network error on attempt ${attempt}:`, fetchError);
        
        if (attempt === maxRetries) {
          console.error('❌ All network attempts failed');
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Network error sending to Telegram after all retries',
              details: fetchError.message,
              attempts: attempt,
              process_info: {
                id: process.id,
                client_name: process.client_name,
                user_id: process.user_id
              },
              timestamp
            }), 
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          );
        }
        
        const waitTime = Math.min(2000 * attempt, 10000);
        console.log(`⏳ Waiting ${waitTime}ms after network error...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    console.log('🎉 NOTIFICATION PROCESS COMPLETED SUCCESSFULLY');
    console.log('📊 Final result:', {
      user_id: process.user_id,
      process_id: process.id,
      client_name: process.client_name,
      country_code: process.country_code,
      phone_number: process.phone_number,
      message_type: messageAnalysis.type,
      matched_pattern: matchedPattern,
      attempts_needed: attempt,
      success: true
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '✅ Notification sent successfully',
        process_id: process.id,
        user_id: process.user_id,
        client_name: process.client_name,
        phone_number: cleanPhoneNumber,
        country_code: process.country_code,
        matched_pattern: matchedPattern,
        message_content: messageText,
        message_type: messageAnalysis.type,
        code_length: messageAnalysis.codeLength,
        attempts_used: attempt,
        telegram_success: true,
        timestamp
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR processing notification:', error);
    console.error('🔍 Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack,
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
