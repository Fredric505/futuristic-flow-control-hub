
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode: string;
}

Deno.serve(async (req) => {
  console.log(`[${new Date().toISOString()}] 🚀 WEBHOOK GLOBAL INICIADO`);
  console.log(`[${new Date().toISOString()}] Método: ${req.method}`);
  console.log(`[${new Date().toISOString()}] URL: ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Conectar a Supabase con Service Role Key
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

    // Extraer información del mensaje de diferentes fuentes
    let phoneNumber = '';
    let message = '';
    let source = 'whatsapp';

    // Intentar extraer de diferentes formatos (IFTTT, Zapier, etc.)
    if (data.message || data.Text) {
      message = data.message || data.Text || '';
      phoneNumber = data.sender || data.FromNumber || data.phone || '';
    } else if (data.NotificationTitle || data.NotificationMessage) {
      phoneNumber = data.NotificationTitle || '';
      message = data.NotificationMessage || '';
    } else if (data.from || data.body) {
      phoneNumber = data.from || '';
      message = data.body || '';
    }

    // Limpiar y normalizar el número de teléfono
    phoneNumber = phoneNumber.replace(/\D/g, '');
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    console.log('📊 Datos extraídos:', { phoneNumber, message, source });

    // Validar que tengamos datos mínimos
    if (!phoneNumber || !message) {
      console.log('⚠️ Datos insuficientes para procesar notificación');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Datos insuficientes',
          message: 'Se requiere número de teléfono y mensaje',
          received_data: data
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar usuario por número de teléfono usando la función SQL
    console.log('🔍 Buscando usuario por número:', phoneNumber);
    const { data: userResult, error: userError } = await supabase
      .rpc('find_user_by_phone', { phone_input: phoneNumber });

    if (userError) {
      console.log('❌ Error buscando usuario:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error interno',
          message: 'Error al buscar usuario',
          phone_number: phoneNumber
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!userResult) {
      console.log('❌ Usuario no encontrado para número:', phoneNumber);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Usuario no encontrado',
          message: `No se encontró usuario para el número: ${phoneNumber}`,
          phone_number: phoneNumber
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = userResult;
    console.log('✅ Usuario encontrado:', userId);

    // Guardar mensaje entrante en la base de datos
    const { error: messageError } = await supabase
      .from('incoming_messages')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        message_content: message,
        source: source,
        metadata: data
      });

    if (messageError) {
      console.log('⚠️ Error guardando mensaje:', messageError);
    } else {
      console.log('✅ Mensaje guardado en base de datos');
    }

    // Obtener configuración de Telegram del usuario
    console.log('🔍 Obteniendo configuración de Telegram del usuario...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, telegram_bot_token, telegram_chat_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.log('❌ Error obteniendo perfil:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error interno',
          message: 'Error al obtener configuración del usuario',
          user_id: userId
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📧 Usuario:', profile.email);
    console.log('🤖 Bot token:', profile.telegram_bot_token ? 'CONFIGURADO ✅' : 'NO CONFIGURADO ❌');
    console.log('💬 Chat ID:', profile.telegram_chat_id ? 'CONFIGURADO ✅' : 'NO CONFIGURADO ❌');

    // Verificar si el usuario tiene Telegram configurado
    if (!profile.telegram_bot_token || !profile.telegram_chat_id) {
      console.log('⚠️ Usuario sin configuración de Telegram');
      
      // Marcar como procesado pero no enviado
      await supabase
        .from('incoming_messages')
        .update({ processed: true, telegram_sent: false })
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber)
        .eq('message_content', message);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notificación recibida pero no enviada - Telegram no configurado',
          user_id: userId,
          user_email: profile.email,
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
    const telegramMessage = `🔔 *Mensaje de WhatsApp recibido*\n\n` +
                           `📱 Número: ${phoneNumber}\n` +
                           `💬 Mensaje: ${message}\n` +
                           `🕐 ${new Date().toLocaleString('es-ES', { 
                             timeZone: 'America/New_York' 
                           })}`;

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

      // Marcar como procesado y enviado
      await supabase
        .from('incoming_messages')
        .update({ 
          processed: true, 
          telegram_sent: telegramResult.ok || false 
        })
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber)
        .eq('message_content', message);

      if (telegramResult.ok) {
        console.log('✅ Notificación enviada exitosamente');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Notificación enviada exitosamente',
            user_id: userId,
            user_email: profile.email,
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
            user_id: userId,
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
      
      // Marcar como procesado pero no enviado
      await supabase
        .from('incoming_messages')
        .update({ processed: true, telegram_sent: false })
        .eq('user_id', userId)
        .eq('phone_number', phoneNumber)
        .eq('message_content', message);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error conectando con Telegram',
          message: String(telegramError),
          user_id: userId
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
