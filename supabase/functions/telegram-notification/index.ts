
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log(`[${new Date().toISOString()}] 🚀 INICIANDO PROCESAMIENTO DE NOTIFICACIÓN GLOBAL`);
  console.log(`[${new Date().toISOString()}] Método: ${req.method}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${new Date().toISOString()}] Headers:`, Object.fromEntries(req.headers.entries()));

    console.log('🔗 Conectando a Supabase con Service Role Key...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Leer el cuerpo de la petición
    const contentType = req.headers.get('content-type');
    console.log('📋 Content-Type:', contentType);
    
    let body = '';
    try {
      body = await req.text();
    } catch (error) {
      console.log('⚠️ Error leyendo body:', error);
    }
    
    console.log('📝 Cuerpo completo de la solicitud:', body);

    let data: any = {};
    
    // Procesar diferentes tipos de contenido
    if (contentType?.includes('application/json') && body) {
      try {
        data = JSON.parse(body);
        console.log('✅ Parseado como JSON exitoso:', data);
      } catch (error) {
        console.log('❌ Error parseando JSON:', error);
        data = {};
      }
    } else if (contentType?.includes('application/x-www-form-urlencoded') && body) {
      try {
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params);
        console.log('✅ Parseado como URL encoded exitoso:', data);
      } catch (error) {
        console.log('❌ Error parseando URL encoded:', error);
        data = {};
      }
    }

    // Extraer información del mensaje
    let phoneNumber = '';
    let message = '';
    let sender = '';

    // Intentar extraer de diferentes formatos
    if (data.message || data.Text) {
      message = data.message || data.Text || '';
      phoneNumber = data.sender || data.FromNumber || '';
      sender = data.sender || data.FromNumber || '';
    } else if (data.NotificationTitle || data.NotificationMessage) {
      phoneNumber = data.NotificationTitle || '';
      message = data.NotificationMessage || '';
    }

    // Si no hay datos, usar datos de prueba
    if (!phoneNumber && !message) {
      console.log('⚠️ Cuerpo vacío, usando datos de prueba');
      phoneNumber = 'Número de prueba';
      message = 'Mensaje de prueba';
    }

    console.log('📊 Datos finales procesados:', { NotificationTitle: phoneNumber, NotificationMessage: message });

    console.log('🔍 Procesando datos de la notificación GLOBAL...');
    console.log('🎯 Datos extraídos para procesamiento:');
    console.log('   📱 Número de teléfono:', phoneNumber);
    console.log('   📧 Mensaje:', message);

    // Detectar si es modo prueba
    const isTestMode = phoneNumber.toLowerCase().includes('prueba') || 
                      phoneNumber.toLowerCase().includes('test') ||
                      phoneNumber === 'Número de prueba';
    
    if (isTestMode) {
      console.log('🧪 MODO PRUEBA DETECTADO - Patrón:', phoneNumber);
    }

    // Buscar proceso que coincida con el número de teléfono
    let matchingProcess = null;
    
    if (isTestMode) {
      // En modo prueba, buscar cualquier proceso para testing
      console.log('🔍 Buscando proceso de prueba...');
      const { data: testProcesses, error: testError } = await supabase
        .from('processes')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log('❌ Error buscando proceso de prueba:', testError);
      } else if (testProcesses && testProcesses.length > 0) {
        matchingProcess = testProcesses[0];
        console.log('✅ Proceso de prueba seleccionado:', matchingProcess.id, 'usuario:', matchingProcess.user_id);
      }
    } else {
      // Buscar proceso real por número de teléfono
      console.log('🔍 Buscando proceso real por número:', phoneNumber);
      
      // Limpiar número de teléfono para búsqueda
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      console.log('🧹 Número limpio para búsqueda:', cleanPhone);
      
      const { data: processes, error: processError } = await supabase
        .from('processes')
        .select('*');
      
      if (processError) {
        console.log('❌ Error buscando procesos:', processError);
      } else if (processes) {
        console.log('📋 Total de procesos encontrados:', processes.length);
        
        // Buscar coincidencia en diferentes formatos
        for (const process of processes) {
          const fullPhone = `${process.country_code}${process.phone_number}`;
          const cleanProcessPhone = fullPhone.replace(/\D/g, '');
          
          console.log(`🔍 Comparando: "${cleanPhone}" vs "${cleanProcessPhone}" (${process.client_name})`);
          
          if (cleanPhone === cleanProcessPhone || 
              phoneNumber.includes(fullPhone) || 
              fullPhone.includes(phoneNumber) ||
              cleanPhone.includes(cleanProcessPhone) ||
              cleanProcessPhone.includes(cleanPhone)) {
            matchingProcess = process;
            console.log('✅ Proceso encontrado:', process.id, 'para usuario:', process.user_id);
            break;
          }
        }
      }
    }

    if (!matchingProcess) {
      console.log('❌ No se encontró proceso para el número:', phoneNumber);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Proceso no encontrado',
          message: `No se encontró proceso para el número: ${phoneNumber}`,
          phone_searched: phoneNumber
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('\n🔔 === ENVIANDO NOTIFICACIÓN AL USUARIO CORRECTO ===');
    console.log('   👤 Usuario ID:', matchingProcess.user_id);
    console.log('   📱 Número:', phoneNumber);
    console.log('   💬 Mensaje:', message);
    console.log('   👨‍💼 Cliente:', matchingProcess.client_name);
    console.log('   🧪 Modo prueba:', isTestMode);
    console.log('   📋 Proceso ID:', matchingProcess.id);

    // Buscar configuración de Telegram del usuario dueño del proceso
    console.log('🔍 Buscando configuración de Telegram del usuario...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, telegram_bot_token, telegram_chat_id')
      .eq('id', matchingProcess.user_id)
      .single();

    if (profileError) {
      console.log('❌ Error obteniendo perfil del usuario:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario no encontrado',
          message: `Error obteniendo perfil del usuario: ${profileError.message}`,
          user_id: matchingProcess.user_id
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📧 Perfil del propietario encontrado:', profile.email);
    console.log('🤖 Bot token:', profile.telegram_bot_token ? 'CONFIGURADO ✅' : 'NO CONFIGURADO ❌');
    console.log('💬 Chat ID:', profile.telegram_chat_id ? 'CONFIGURADO ✅' : 'NO CONFIGURADO ❌');

    // Verificar si el usuario tiene Telegram configurado
    if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
      console.log('⚠️ Usuario sin configuración de Telegram, pero continuando...');
      
      // En lugar de fallar, simplemente registrar y continuar
      console.log('📝 Registrando notificación sin enviar a Telegram...');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notificación procesada pero no enviada - Telegram no configurado',
          user_id: matchingProcess.user_id,
          user_email: profile.email,
          process_id: matchingProcess.id,
          client_name: matchingProcess.client_name,
          phone_number: phoneNumber,
          telegram_configured: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enviar notificación a Telegram
    console.log('📱 Enviando notificación a Telegram...');
    const telegramMessage = `🔔 *Respuesta de WhatsApp recibida*\n\n` +
                           `👤 Cliente: ${matchingProcess.client_name}\n` +
                           `📱 Número: ${phoneNumber}\n` +
                           `💬 Mensaje: ${message}\n` +
                           `📋 Proceso ID: ${matchingProcess.id}\n\n` +
                           `🕐 ${new Date().toLocaleString('es-ES')}`;

    try {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: profile.telegram_chat_id,
            text: telegramMessage,
            parse_mode: 'Markdown',
          }),
        }
      );

      const telegramResult = await telegramResponse.json();
      console.log('📤 Respuesta de Telegram:', telegramResult);

      if (telegramResult.ok) {
        console.log('✅ Notificación enviada exitosamente a Telegram');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Notificación enviada exitosamente',
            user_id: matchingProcess.user_id,
            user_email: profile.email,
            process_id: matchingProcess.id,
            client_name: matchingProcess.client_name,
            phone_number: phoneNumber,
            telegram_sent: true
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        console.log('❌ Error enviando a Telegram:', telegramResult);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Error enviando a Telegram',
            message: telegramResult.description || 'Error desconocido',
            user_id: matchingProcess.user_id,
            telegram_error: telegramResult
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (telegramError) {
      console.log('❌ Error conectando con Telegram:', telegramError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error conectando con Telegram',
          message: String(telegramError),
          user_id: matchingProcess.user_id
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.log('❌ Error general:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        message: String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
