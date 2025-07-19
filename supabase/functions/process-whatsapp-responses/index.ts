
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppResponse {
  id: string;
  user_id: string;
  phone_number: string;
  response_content: string;
  imei: string | null;
  serial_number: string | null;
  telegram_sent: boolean;
}

interface Process {
  id: string;
  user_id: string;
  imei: string;
  serial_number: string;
  phone_number: string;
  client_name: string;
}

interface TelegramBot {
  bot_token: string;
  chat_id: string;
  bot_name: string;
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

    // Obtener respuestas pendientes de WhatsApp
    const { data: responses, error: responsesError } = await supabaseClient
      .from('whatsapp_responses')
      .select('*')
      .eq('telegram_sent', false);

    if (responsesError) {
      throw new Error(`Error getting responses: ${responsesError.message}`);
    }

    if (!responses || responses.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending responses found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;

    for (const response of responses) {
      try {
        // Buscar el proceso correspondiente usando IMEI o número de serie
        let process = null;
        
        if (response.imei) {
          const { data: processData } = await supabaseClient
            .from('processes')
            .select('*')
            .eq('imei', response.imei)
            .single();
          process = processData;
        }
        
        if (!process && response.serial_number) {
          const { data: processData } = await supabaseClient
            .from('processes')
            .select('*')
            .eq('serial_number', response.serial_number)
            .single();
          process = processData;
        }

        if (!process) {
          console.log(`No process found for response ${response.id}`);
          continue;
        }

        // Obtener el bot de Telegram del usuario
        const { data: botData, error: botError } = await supabaseClient
          .from('telegram_bots')
          .select('bot_token, chat_id, bot_name')
          .eq('user_id', process.user_id)
          .eq('is_active', true)
          .single();

        if (botError || !botData) {
          console.log(`No bot found for user ${process.user_id}`);
          continue;
        }

        // Formatear el mensaje para Telegram
        const message = `🔔 *Nueva Respuesta de WhatsApp*\n\n` +
          `📱 *Teléfono:* ${response.phone_number}\n` +
          `👤 *Cliente:* ${process.client_name}\n` +
          `📟 *IMEI:* ${process.imei}\n` +
          `🔢 *Serie:* ${process.serial_number}\n\n` +
          `💬 *Mensaje:*\n${response.response_content}\n\n` +
          `🕐 *Fecha:* ${new Date(response.created_at).toLocaleString('es-ES')}`;

        // Enviar mensaje a Telegram
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${botData.bot_token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: botData.chat_id,
              text: message,
              parse_mode: 'Markdown',
            }),
          }
        );

        if (telegramResponse.ok) {
          // Marcar como enviado
          await supabaseClient
            .from('whatsapp_responses')
            .update({ telegram_sent: true })
            .eq('id', response.id);

          processedCount++;
          console.log(`Response ${response.id} sent to Telegram successfully`);
        } else {
          const telegramError = await telegramResponse.text();
          console.error(`Failed to send to Telegram: ${telegramError}`);
        }

      } catch (error) {
        console.error(`Error processing response ${response.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedCount} responses`,
        total_responses: responses.length,
        processed: processedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-whatsapp-responses function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
