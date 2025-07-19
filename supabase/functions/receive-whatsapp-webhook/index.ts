
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookData {
  phone_number: string;
  message: string;
  imei?: string;
  serial_number?: string;
  subdomain?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData: WebhookData = await req.json();
    console.log('Received webhook data:', webhookData);

    const { phone_number, message, imei, serial_number, subdomain } = webhookData;

    if (!phone_number || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone_number, message' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar el proceso correspondiente
    let process = null;
    let user_id = null;

    // Opción 1: Buscar por subdominio si se proporciona
    if (subdomain) {
      const { data: userConfig } = await supabaseClient
        .rpc('get_user_config_by_subdomain', { subdomain_param: subdomain });

      if (userConfig && userConfig.length > 0) {
        user_id = userConfig[0].user_id;
      }
    }

    // Opción 2: Buscar por IMEI si se proporciona
    if (!user_id && imei) {
      const { data: processData } = await supabaseClient
        .from('processes')
        .select('user_id, id')
        .eq('imei', imei)
        .single();

      if (processData) {
        user_id = processData.user_id;
        process = processData;
      }
    }

    // Opción 3: Buscar por número de serie si se proporciona
    if (!user_id && serial_number) {
      const { data: processData } = await supabaseClient
        .from('processes')
        .select('user_id, id')
        .eq('serial_number', serial_number)
        .single();

      if (processData) {
        user_id = processData.user_id;
        process = processData;
      }
    }

    // Opción 4: Buscar por número de teléfono como último recurso
    if (!user_id) {
      const { data: processData } = await supabaseClient
        .from('processes')
        .select('user_id, id')
        .eq('phone_number', phone_number)
        .single();

      if (processData) {
        user_id = processData.user_id;
        process = processData;
      }
    }

    if (!user_id) {
      console.log('No user found for this WhatsApp response');
      // Aún así guardamos la respuesta para análisis posterior
      user_id = null;
    }

    // Guardar la respuesta en la base de datos
    const { error: insertError } = await supabaseClient
      .from('whatsapp_responses')
      .insert({
        user_id: user_id,
        process_id: process?.id || null,
        phone_number: phone_number,
        response_content: message,
        imei: imei || null,
        serial_number: serial_number || null,
        telegram_sent: false
      });

    if (insertError) {
      throw new Error(`Error saving response: ${insertError.message}`);
    }

    // Si encontramos un usuario, intentar enviar inmediatamente a Telegram
    if (user_id) {
      try {
        // Obtener el bot de Telegram del usuario
        const { data: botData } = await supabaseClient
          .from('telegram_bots')
          .select('bot_token, chat_id, bot_name')
          .eq('user_id', user_id)
          .eq('is_active', true)
          .single();

        if (botData) {
          // Obtener información del proceso para el mensaje
          let processInfo = '';
          if (process) {
            const { data: fullProcess } = await supabaseClient
              .from('processes')
              .select('client_name, imei, serial_number')
              .eq('id', process.id)
              .single();

            if (fullProcess) {
              processInfo = `👤 *Cliente:* ${fullProcess.client_name}\n` +
                          `📟 *IMEI:* ${fullProcess.imei}\n` +
                          `🔢 *Serie:* ${fullProcess.serial_number}\n\n`;
            }
          }

          // Formatear mensaje para Telegram
          const telegramMessage = `🔔 *Nueva Respuesta de WhatsApp*\n\n` +
            `📱 *Teléfono:* ${phone_number}\n` +
            processInfo +
            `💬 *Mensaje:*\n${message}\n\n` +
            `🕐 *Fecha:* ${new Date().toLocaleString('es-ES')}`;

          // Enviar a Telegram
          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${botData.bot_token}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: botData.chat_id,
                text: telegramMessage,
                parse_mode: 'Markdown',
              }),
            }
          );

          if (telegramResponse.ok) {
            // Marcar como enviado
            await supabaseClient
              .from('whatsapp_responses')
              .update({ telegram_sent: true })
              .eq('phone_number', phone_number)
              .eq('response_content', message);

            console.log('Message sent to Telegram successfully');
          }
        }
      } catch (telegramError) {
        console.error('Error sending to Telegram:', telegramError);
        // No fallar el webhook por errores de Telegram
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Response processed successfully',
        user_found: !!user_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in receive-whatsapp-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
