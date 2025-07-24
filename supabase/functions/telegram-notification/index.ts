
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
  console.log(`[${timestamp}] Headers:`, Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Manejando solicitud CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Procesando datos de la notificación...');
    
    let requestData: NotificationData;
    
    try {
      const body = await req.text();
      console.log('📝 Cuerpo completo de la solicitud:', body);
      console.log('📋 Content-Type:', req.headers.get('content-type'));
      
      if (!body || body.trim() === '') {
        console.log('⚠️ Cuerpo vacío, usando datos de prueba');
        requestData = {
          NotificationTitle: 'Número de prueba',
          NotificationMessage: 'Mensaje de prueba'
        };
      } else {
        try {
          requestData = JSON.parse(body);
          console.log('✅ Parseado como JSON exitoso:', requestData);
        } catch (jsonError) {
          console.log('⚠️ Error JSON, procesando como texto plano...');
          
          // Verificar si son variables IFTTT no reemplazadas
          if (body.includes('{{NotificationTitle}}') || body.includes('{{NotificationMessage}}')) {
            console.log('❌ Variables IFTTT no reemplazadas detectadas');
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
          
          // Procesar como texto plano
          const lines = body.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          console.log('📄 Líneas extraídas del texto:', lines);
          
          if (lines.length >= 2) {
            requestData = {
              NotificationTitle: lines[0],
              NotificationMessage: lines[1]
            };
          } else if (lines.length === 1) {
            requestData = {
              NotificationTitle: lines[0],
              NotificationMessage: 'Sin mensaje'
            };
          } else {
            console.log('❌ No se pudo extraer información del cuerpo');
            requestData = {
              NotificationTitle: 'Número desconocido',
              NotificationMessage: 'Mensaje sin contenido'
            };
          }
        }
      }
    } catch (parseError) {
      console.error('❌ Error crítico procesando solicitud:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error procesando solicitud',
          message: 'No se pudo procesar la solicitud entrante',
          details: parseError.message
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    console.log('📊 Datos finales procesados:', requestData);

    let phoneNumber = '';
    let messageText = '';
    
    if (requestData.NotificationTitle || requestData.NotificationMessage) {
      phoneNumber = requestData.NotificationTitle || '';
      messageText = requestData.NotificationMessage || '';
    } else if (requestData.message) {
      messageText = requestData.message;
      phoneNumber = requestData.sender || '';
    }

    console.log('🎯 Datos extraídos para procesamiento:');
    console.log('   📱 Número de teléfono:', phoneNumber);
    console.log('   📧 Mensaje:', messageText);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔗 Conectando a Supabase...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Modo de prueba - detectar si es una prueba
    const isTestMode = !phoneNumber || 
                      phoneNumber === 'Número de prueba' || 
                      phoneNumber === 'Número desconocido' ||
                      phoneNumber.includes('prueba') ||
                      phoneNumber.includes('test');

    if (isTestMode) {
      console.log('🧪 MODO PRUEBA DETECTADO - Patrón:', phoneNumber);
      
      const authHeader = req.headers.get('authorization');
      let targetUserId = null;
      
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user }, error: userError } = await supabase.auth.getUser(token);
          
          if (!userError && user) {
            targetUserId = user.id;
            console.log('👤 Usuario de prueba identificado:', user.email);
          }
        } catch (tokenError) {
          console.log('⚠️ Error procesando token de prueba:', tokenError);
        }
      }
      
      let processQuery = supabase.from('processes').select('*');
      
      if (targetUserId) {
        processQuery = processQuery.eq('user_id', targetUserId);
        console.log('🎯 Buscando proceso para usuario específico:', targetUserId);
      } else {
        console.log('🔍 Buscando cualquier proceso disponible para prueba');
      }
      
      const { data: processes, error: queryError } = await processQuery.limit(1);

      if (queryError) {
        console.error('❌ Error en consulta de prueba:', queryError);
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
        console.log('❌ No se encontraron procesos para prueba');
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
      console.log('✅ Proceso de prueba seleccionado:', process.id, 'usuario:', process.user_id);
      return await sendNotificationToUser(process, phoneNumber || 'Número de prueba', messageText || 'Mensaje de prueba', supabase, true);
    }

    // Modo real - búsqueda exhaustiva mejorada
    console.log('🔍 MODO REAL: Iniciando búsqueda para número:', phoneNumber);
    
    if (!phoneNumber || phoneNumber.trim() === '') {
      console.log('❌ Número de teléfono vacío o inválido');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Número inválido',
          message: 'No se proporcionó un número de teléfono válido'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const matchedProcess = await findProcessByPhoneNumber(phoneNumber, supabase);

    if (!matchedProcess) {
      console.log('❌ No se encontró proceso para número:', phoneNumber);
      
      // Mostrar todos los procesos disponibles para debugging
      const { data: allProcesses } = await supabase.from('processes').select('client_name, country_code, phone_number, user_id');
      console.log('📋 Procesos disponibles en base de datos:');
      allProcesses?.forEach((proc, index) => {
        console.log(`   ${index + 1}. ${proc.client_name} - ${proc.country_code}${proc.phone_number} (${proc.user_id})`);
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Proceso no encontrado',
          message: `No se encontró proceso para el número: ${phoneNumber}`,
          phone_searched: phoneNumber,
          available_processes: allProcesses?.length || 0
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
    console.error('💥 ERROR CRÍTICO EN FUNCIÓN:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor',
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

async function findProcessByPhoneNumber(phoneNumber: string, supabase: any) {
  console.log('🔍 === BÚSQUEDA EXHAUSTIVA INICIADA ===');
  console.log('📱 Número original recibido:', phoneNumber);
  
  const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
  console.log('🧹 Número limpio:', cleanPhoneNumber);

  // Patrones de búsqueda ultra-exhaustivos
  const searchPatterns = [
    phoneNumber,                                    // Original exacto
    cleanPhoneNumber,                              // Limpio
    cleanPhoneNumber.startsWith('+') ? cleanPhoneNumber : `+${cleanPhoneNumber}`,
    cleanPhoneNumber.replace(/^\+/, ''),           // Sin + inicial
    
    // Códigos de país latinoamericanos
    cleanPhoneNumber.replace(/^\+?505/, ''),       // Nicaragua
    cleanPhoneNumber.replace(/^\+?52/, ''),        // México
    cleanPhoneNumber.replace(/^\+?57/, ''),        // Colombia
    cleanPhoneNumber.replace(/^\+?593/, ''),       // Ecuador
    cleanPhoneNumber.replace(/^\+?591/, ''),       // Bolivia
    cleanPhoneNumber.replace(/^\+?56/, ''),        // Chile
    cleanPhoneNumber.replace(/^\+?51/, ''),        // Perú
    cleanPhoneNumber.replace(/^\+?506/, ''),       // Costa Rica
    cleanPhoneNumber.replace(/^\+?502/, ''),       // Guatemala
    cleanPhoneNumber.replace(/^\+?503/, ''),       // El Salvador
    cleanPhoneNumber.replace(/^\+?504/, ''),       // Honduras
    cleanPhoneNumber.replace(/^\+?507/, ''),       // Panamá
    cleanPhoneNumber.replace(/^\+?1/, ''),         // USA/Canadá
    
    // Variaciones de longitud
    cleanPhoneNumber.slice(-10),                   // Últimos 10 dígitos
    cleanPhoneNumber.slice(-9),                    // Últimos 9 dígitos
    cleanPhoneNumber.slice(-8),                    // Últimos 8 dígitos
    cleanPhoneNumber.slice(-7),                    // Últimos 7 dígitos
    cleanPhoneNumber.slice(-6),                    // Últimos 6 dígitos
    
    // Con códigos añadidos
    `+505${cleanPhoneNumber.replace(/^\+?505/, '')}`,
    `+52${cleanPhoneNumber.replace(/^\+?52/, '')}`,
    `+57${cleanPhoneNumber.replace(/^\+?57/, '')}`,
    `505${cleanPhoneNumber.replace(/^\+?505/, '')}`,
    `52${cleanPhoneNumber.replace(/^\+?52/, '')}`,
    `57${cleanPhoneNumber.replace(/^\+?57/, '')}`,
  ];

  const uniquePatterns = [...new Set(searchPatterns)].filter(p => p && p.length > 0);
  console.log('🎯 Patrones de búsqueda generados:', uniquePatterns);

  // Obtener TODOS los procesos de la base de datos
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

  console.log(`🔍 Verificando ${allProcesses.length} procesos en base de datos`);

  // Búsqueda exhaustiva proceso por proceso
  for (const [index, proc] of allProcesses.entries()) {
    console.log(`\n🔍 === PROCESO ${index + 1}/${allProcesses.length} ===`);
    console.log(`   📋 ID: ${proc.id}`);
    console.log(`   👤 Cliente: ${proc.client_name}`);
    console.log(`   📱 Teléfono: "${proc.phone_number}"`);
    console.log(`   🌍 Código país: "${proc.country_code}"`);
    console.log(`   👨‍💼 Usuario: ${proc.user_id}`);
    
    const fullNumber = `${proc.country_code}${proc.phone_number}`;
    const fullNumberClean = fullNumber.replace(/[\s\-\(\)\.]/g, '');
    const phoneOnly = proc.phone_number.replace(/[\s\-\(\)\.]/g, '');
    
    console.log(`   🔢 Número completo: "${fullNumber}"`);
    console.log(`   🧹 Número completo limpio: "${fullNumberClean}"`);
    console.log(`   📞 Solo teléfono: "${phoneOnly}"`);
    
    // Probar cada patrón contra este proceso
    for (const pattern of uniquePatterns) {
      if (!pattern) continue;
      
      // Múltiples estrategias de coincidencia
      const matches = [
        fullNumberClean === pattern,
        fullNumber === pattern,
        proc.phone_number === pattern,
        phoneOnly === pattern,
        fullNumberClean.endsWith(pattern),
        pattern.endsWith(fullNumberClean),
        fullNumberClean.endsWith(phoneOnly),
        pattern.endsWith(phoneOnly),
        fullNumberClean.includes(pattern),
        pattern.includes(fullNumberClean),
        phoneOnly.includes(pattern),
        pattern.includes(phoneOnly),
        // Coincidencia parcial más flexible
        fullNumberClean.slice(-8) === pattern.slice(-8) && pattern.length >= 8,
        fullNumberClean.slice(-7) === pattern.slice(-7) && pattern.length >= 7,
      ];
      
      if (matches.some(match => match)) {
        console.log(`\n✅ ¡COINCIDENCIA ENCONTRADA!`);
        console.log(`   🎯 Patrón exitoso: "${pattern}"`);
        console.log(`   📱 Proceso: ${proc.id}`);
        console.log(`   👤 Usuario: ${proc.user_id}`);
        console.log(`   📞 Teléfono proceso: ${proc.country_code}${proc.phone_number}`);
        return proc;
      }
    }
  }

  console.log('\n❌ === BÚSQUEDA COMPLETADA SIN RESULTADOS ===');
  console.log('📊 RESUMEN FINAL:');
  console.log(`   🔍 Número buscado: "${phoneNumber}"`);
  console.log(`   🧹 Número limpio: "${cleanPhoneNumber}"`);
  console.log(`   📱 Procesos verificados: ${allProcesses.length}`);
  console.log(`   🎯 Patrones probados: ${uniquePatterns.length}`);
  console.log(`   ❌ Resultado: SIN COINCIDENCIAS`);
  
  return null;
}

async function sendNotificationToUser(process: any, phoneNumber: string, messageText: string, supabase: any, isTestMode: boolean) {
  console.log(`\n🔔 === ENVIANDO NOTIFICACIÓN ===`);
  console.log(`   📋 Proceso ID: ${process.id}`);
  console.log(`   👤 Usuario ID: ${process.user_id}`);
  console.log(`   📱 Número: ${phoneNumber}`);
  console.log(`   💬 Mensaje: ${messageText}`);
  console.log(`   🧪 Modo prueba: ${isTestMode}`);

  // Obtener configuración del usuario
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('telegram_bot_token, telegram_chat_id, email')
    .eq('id', process.user_id)
    .single();

  if (profileError) {
    console.error('❌ Error obteniendo perfil del usuario:', profileError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error de perfil',
        message: `Error buscando perfil para usuario: ${process.user_id}`,
        details: profileError.message
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }

  if (!profile) {
    console.error('❌ Perfil no encontrado para usuario:', process.user_id);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Perfil no encontrado',
        message: `No existe perfil para usuario: ${process.user_id}`
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    );
  }

  console.log(`📧 Perfil encontrado: ${profile.email}`);
  console.log(`🤖 Bot token: ${profile.telegram_bot_token ? 'CONFIGURADO ✅' : 'NO CONFIGURADO ❌'}`);
  console.log(`💬 Chat ID: ${profile.telegram_chat_id ? 'CONFIGURADO ✅' : 'NO CONFIGURADO ❌'}`);

  if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
    console.log('❌ Configuración Telegram incompleta');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Telegram no configurado',
        message: `Usuario ${profile.email} no tiene Telegram configurado correctamente`,
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

  // Crear mensaje de notificación
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
⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'America/Managua' })}

${isTestMode ? '⚠️ MENSAJE DE PRUEBA' : ''}`;

  console.log(`🚀 Enviando notificación a Telegram...`);
  console.log(`   📧 Usuario: ${profile.email}`);
  console.log(`   🤖 Bot: ${profile.telegram_bot_token.substring(0, 10)}...`);
  console.log(`   💬 Chat: ${profile.telegram_chat_id}`);
  
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
    console.log(`📡 Telegram API Status: ${telegramResponse.status}`);
    console.log('📡 Telegram Response:', telegramResult);
    
    if (!telegramResponse.ok) {
      console.error('❌ Error en Telegram API:', telegramResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error enviando a Telegram',
          telegram_error: telegramResult,
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

    console.log(`\n✅ === NOTIFICACIÓN ENVIADA EXITOSAMENTE ===`);
    console.log(`   📧 Usuario: ${profile.email}`);
    console.log(`   📱 Número: ${phoneNumber}`);
    console.log(`   🆔 Message ID: ${telegramResult.result?.message_id}`);
    console.log(`   ⏰ Timestamp: ${new Date().toISOString()}`);

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
    console.error('❌ Error de conexión con Telegram:', telegramError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error de conexión con Telegram',
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
