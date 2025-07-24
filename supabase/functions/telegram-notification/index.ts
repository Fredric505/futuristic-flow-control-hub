
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
  console.log(`[${timestamp}] 🚀 INICIANDO PROCESAMIENTO DE NOTIFICACIÓN`);
  console.log(`[${timestamp}] Método: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Manejando solicitud CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Procesando datos de la notificación...');
    
    let requestData: NotificationData;
    
    try {
      const body = await req.text();
      console.log('📝 Cuerpo de la solicitud:', body);
      console.log('📋 Content-Type:', req.headers.get('content-type'));
      
      if (!body || body.trim() === '') {
        console.log('⚠️ Cuerpo vacío, usando datos de prueba');
        requestData = {
          NotificationTitle: 'Número de prueba',
          NotificationMessage: 'Mensaje de prueba masivo'
        };
      } else {
        try {
          requestData = JSON.parse(body);
          console.log('✅ Parseado como JSON exitoso:', requestData);
        } catch (jsonError) {
          console.log('⚠️ Error JSON, intentando formato texto...');
          
          if (body.includes('{{NotificationTitle}}') || body.includes('{{NotificationMessage}}')) {
            console.log('❌ Variables IFTTT no reemplazadas');
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'IFTTT template error',
                message: 'Variables IFTTT no reemplazadas correctamente.',
                received_body: body
              }), 
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
              }
            );
          }
          
          const lines = body.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          console.log('📄 Líneas procesadas:', lines);
          
          if (lines.length >= 2) {
            requestData = {
              NotificationTitle: lines[0],
              NotificationMessage: lines[1]
            };
          } else if (lines.length === 1) {
            requestData = {
              NotificationTitle: 'Número desconocido',
              NotificationMessage: lines[0]
            };
          } else {
            throw new Error('No se pudo procesar el cuerpo de la solicitud');
          }
        }
      }
    } catch (parseError) {
      console.error('❌ Error procesando solicitud:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Formato de solicitud inválido',
          message: 'Debe ser JSON o texto plano.',
          details: parseError.message
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    console.log('📊 Datos de notificación procesados:', requestData);

    let phoneNumber = '';
    let messageText = '';
    
    if (requestData.NotificationTitle || requestData.NotificationMessage) {
      phoneNumber = requestData.NotificationTitle || '';
      messageText = requestData.NotificationMessage || '';
    } else if (requestData.message) {
      messageText = requestData.message;
      phoneNumber = requestData.sender || '';
    }

    console.log('🎯 Datos extraídos:', { phoneNumber, messageText });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔗 Conectando a Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Modo de prueba
    if (!phoneNumber || phoneNumber === 'Número de prueba' || phoneNumber === 'Número desconocido') {
      console.log('🧪 MODO PRUEBA DETECTADO');
      
      const authHeader = req.headers.get('authorization');
      let targetUserId = null;
      
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user }, error: userError } = await supabase.auth.getUser(token);
          
          if (!userError && user) {
            targetUserId = user.id;
            console.log('👤 Usuario encontrado:', user.email);
          }
        } catch (tokenError) {
          console.log('⚠️ Error procesando token:', tokenError);
        }
      }
      
      let processQuery = supabase.from('processes').select('*');
      
      if (targetUserId) {
        processQuery = processQuery.eq('user_id', targetUserId);
        console.log('🎯 Buscando proceso para usuario específico:', targetUserId);
      } else {
        console.log('🔍 Buscando cualquier proceso disponible');
      }
      
      const { data: processes, error: queryError } = await processQuery.limit(1);

      if (queryError) {
        console.error('❌ Error en consulta:', queryError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error en base de datos',
            details: queryError.message 
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      if (!processes || processes.length === 0) {
        console.log('❌ No se encontraron procesos');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No se encontraron procesos',
            message: 'No hay procesos disponibles para modo prueba'
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }

      const process = processes[0];
      console.log('✅ Usando proceso:', process.id, 'usuario:', process.user_id);
      return await sendNotificationToUser(process, phoneNumber || 'Número de prueba', messageText || 'Mensaje de prueba', supabase, true);
    }

    // Modo real - búsqueda exhaustiva
    console.log('🔍 MODO REAL: Buscando proceso para:', phoneNumber);
    const matchedProcess = await findProcessByPhoneNumber(phoneNumber, supabase);

    if (!matchedProcess) {
      console.log('❌ No se encontró proceso para:', phoneNumber);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Proceso no encontrado',
          message: `No se encontró proceso para: ${phoneNumber}`,
          phone_searched: phoneNumber
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log('✅ Proceso encontrado:', matchedProcess.id, 'para usuario:', matchedProcess.user_id);
    return await sendNotificationToUser(matchedProcess, phoneNumber, messageText, supabase, false);

  } catch (error) {
    console.error('💥 ERROR CRÍTICO:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor',
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
  console.log('🔍 Iniciando búsqueda exhaustiva para:', phoneNumber);
  
  const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  console.log('🧹 Número limpio:', cleanPhoneNumber);

  // Patrones de búsqueda más exhaustivos
  const searchPatterns = [
    phoneNumber,                                    // Original
    cleanPhoneNumber,                               // Limpio
    cleanPhoneNumber.startsWith('+') ? cleanPhoneNumber : `+${cleanPhoneNumber}`,
    cleanPhoneNumber.replace('+', ''),              // Sin +
    cleanPhoneNumber.replace(/^\+505/, ''),         // Sin código Nicaragua
    cleanPhoneNumber.replace(/^\+52/, ''),          // Sin código México
    cleanPhoneNumber.replace(/^\+57/, ''),          // Sin código Colombia
    cleanPhoneNumber.replace(/^\+593/, ''),         // Sin código Ecuador
    cleanPhoneNumber.replace(/^\+591/, ''),         // Sin código Bolivia
    cleanPhoneNumber.replace(/^\+56/, ''),          // Sin código Chile
    cleanPhoneNumber.replace(/^\+51/, ''),          // Sin código Perú
    cleanPhoneNumber.replace(/^\+506/, ''),         // Sin código Costa Rica
    cleanPhoneNumber.replace(/^\+502/, ''),         // Sin código Guatemala
    cleanPhoneNumber.replace(/^\+503/, ''),         // Sin código El Salvador
    cleanPhoneNumber.replace(/^\+504/, ''),         // Sin código Honduras
    cleanPhoneNumber.replace(/^\+507/, ''),         // Sin código Panamá
    cleanPhoneNumber.replace(/^505/, ''),           // Sin 505
    cleanPhoneNumber.replace(/^52/, ''),            // Sin 52
    cleanPhoneNumber.replace(/^57/, ''),            // Sin 57
    cleanPhoneNumber.replace(/^593/, ''),           // Sin 593
    cleanPhoneNumber.replace(/^591/, ''),           // Sin 591
    cleanPhoneNumber.replace(/^56/, ''),            // Sin 56
    cleanPhoneNumber.replace(/^51/, ''),            // Sin 51
    cleanPhoneNumber.replace(/^506/, ''),           // Sin 506
    cleanPhoneNumber.replace(/^502/, ''),           // Sin 502
    cleanPhoneNumber.replace(/^503/, ''),           // Sin 503
    cleanPhoneNumber.replace(/^504/, ''),           // Sin 504
    cleanPhoneNumber.replace(/^507/, ''),           // Sin 507
    cleanPhoneNumber.slice(-8),                     // Últimos 8 dígitos
    cleanPhoneNumber.slice(-7),                     // Últimos 7 dígitos
    cleanPhoneNumber.slice(-6),                     // Últimos 6 dígitos
    cleanPhoneNumber.slice(-5),                     // Últimos 5 dígitos
  ];

  const uniquePatterns = [...new Set(searchPatterns)].filter(p => p && p.length > 0);
  console.log('🎯 Patrones de búsqueda:', uniquePatterns);

  // Obtener TODOS los procesos
  const { data: allProcesses, error: allError } = await supabase
    .from('processes')
    .select('*');

  if (allError) {
    console.error('❌ Error obteniendo procesos:', allError);
    return null;
  }

  if (!allProcesses || allProcesses.length === 0) {
    console.log('❌ No hay procesos en la base de datos');
    return null;
  }

  console.log(`🔍 Verificando ${allProcesses.length} procesos`);

  // Búsqueda exhaustiva con múltiples estrategias
  for (const proc of allProcesses) {
    const fullNumber = `${proc.country_code}${proc.phone_number}`;
    const fullNumberClean = fullNumber.replace(/[\s\-\(\)]/g, '');
    const phoneOnly = proc.phone_number.replace(/[\s\-\(\)]/g, '');
    
    console.log(`🔍 Verificando proceso ${proc.id}:`);
    console.log(`   📱 Teléfono almacenado: "${proc.phone_number}"`);
    console.log(`   🌍 Código país: "${proc.country_code}"`);
    console.log(`   🔢 Número completo: "${fullNumber}"`);
    console.log(`   🧹 Número completo limpio: "${fullNumberClean}"`);
    
    // Múltiples estrategias de matching
    for (const pattern of uniquePatterns) {
      // Estrategia 1: Coincidencia exacta
      if (fullNumberClean === pattern || 
          fullNumber === pattern ||
          proc.phone_number === pattern ||
          phoneOnly === pattern) {
        console.log(`✅ COINCIDENCIA EXACTA! Patrón: "${pattern}" = proceso ${proc.id}`);
        return proc;
      }
      
      // Estrategia 2: Coincidencia al final
      if (fullNumberClean.endsWith(pattern) || 
          pattern.endsWith(fullNumberClean) ||
          fullNumberClean.endsWith(phoneOnly) ||
          pattern.endsWith(phoneOnly)) {
        console.log(`✅ COINCIDENCIA AL FINAL! Patrón: "${pattern}" = proceso ${proc.id}`);
        return proc;
      }
      
      // Estrategia 3: Coincidencia sin código de país
      if (phoneOnly === pattern || 
          pattern === phoneOnly) {
        console.log(`✅ COINCIDENCIA SIN CÓDIGO! Patrón: "${pattern}" = proceso ${proc.id}`);
        return proc;
      }
      
      // Estrategia 4: Coincidencia flexible (contiene)
      if (fullNumberClean.includes(pattern) || 
          pattern.includes(fullNumberClean) ||
          fullNumberClean.includes(phoneOnly) ||
          pattern.includes(phoneOnly)) {
        console.log(`✅ COINCIDENCIA FLEXIBLE! Patrón: "${pattern}" = proceso ${proc.id}`);
        return proc;
      }
    }
  }

  console.log('❌ No se encontró coincidencia después de verificar todos los patrones');
  
  // Log de debug para ayudar a diagnosticar
  console.log('📊 RESUMEN DE BÚSQUEDA:');
  console.log('   🔍 Número buscado:', phoneNumber);
  console.log('   🧹 Número limpio:', cleanPhoneNumber);
  console.log('   📱 Procesos en DB:', allProcesses.length);
  console.log('   🎯 Patrones probados:', uniquePatterns.length);
  
  return null;
}

async function sendNotificationToUser(process: any, phoneNumber: string, messageText: string, supabase: any, isTestMode: boolean) {
  console.log(`🔔 ENVIANDO NOTIFICACIÓN:`);
  console.log(`   👤 Usuario: ${process.user_id}`);
  console.log(`   📋 Proceso: ${process.id}`);
  console.log(`   🧪 Modo prueba: ${isTestMode}`);

  // Obtener configuración del usuario
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('telegram_bot_token, telegram_chat_id, email')
    .eq('id', process.user_id)
    .single();

  if (profileError) {
    console.error('❌ Error obteniendo perfil:', profileError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error de perfil',
        message: `Error buscando perfil: ${process.user_id}`,
        details: profileError.message
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }

  if (!profile) {
    console.error('❌ Perfil no encontrado:', process.user_id);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Perfil no encontrado',
        message: `No existe perfil para: ${process.user_id}`
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    );
  }

  console.log(`📧 Perfil encontrado: ${profile.email}`);
  console.log(`🤖 Bot token: ${profile.telegram_bot_token ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
  console.log(`💬 Chat ID: ${profile.telegram_chat_id ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);

  if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
    console.log('❌ Configuración Telegram incompleta');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Telegram no configurado',
        message: `Usuario ${profile.email} no tiene Telegram configurado`,
        user_id: process.user_id,
        user_email: profile.email,
        missing_config: {
          bot_token: !profile.telegram_bot_token,
          chat_id: !profile.telegram_chat_id
        }
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }

  // Crear mensaje personalizado
  const notificationMessage = `🔔 ${isTestMode ? 'PRUEBA - ' : ''}Alerta WhatsApp

👩🏽‍💻 Servidor Astro${isTestMode ? ' - MODO PRUEBA' : ''}

📊 PROCESO:
👤 Cliente: ${process.client_name}
📱 Modelo: ${process.iphone_model}
📞 IMEI: ${process.imei}
🔢 Serie: ${process.serial_number}
${process.owner_name ? `👥 Propietario: ${process.owner_name}` : ''}

📞 De: ${phoneNumber}
📥 Mensaje: ${messageText}

🤖 Bot Astro 🟢
⏰ ${new Date().toLocaleString('es-ES')}

${isTestMode ? '⚠️ MENSAJE DE PRUEBA' : ''}`;

  console.log(`🚀 Enviando a Telegram para: ${profile.email}`);
  
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
    console.log(`📡 Telegram API status: ${telegramResponse.status}`);
    console.log('📡 Telegram respuesta:', telegramResult);
    
    if (!telegramResponse.ok) {
      console.error('❌ Error Telegram API:', telegramResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error enviando a Telegram',
          details: telegramResult,
          user_id: process.user_id,
          user_email: profile.email,
          telegram_status: telegramResponse.status
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log(`✅ NOTIFICACIÓN ENVIADA EXITOSAMENTE a: ${profile.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isTestMode ? 'Prueba enviada exitosamente' : 'Notificación enviada exitosamente',
        process_id: process.id,
        user_id: process.user_id,
        user_email: profile.email,
        phone_number: phoneNumber,
        message_content: messageText,
        test_mode: isTestMode,
        telegram_message_id: telegramResult.result?.message_id,
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (telegramError) {
    console.error('❌ Error conexión Telegram:', telegramError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error conexión Telegram',
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
