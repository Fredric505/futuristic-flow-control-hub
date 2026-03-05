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

    // Get Whapi token from system_settings based on language
    const tokenKey = language === 'english' ? 'whapi_token_en' : 'whapi_token';
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [tokenKey, 'whapi_token']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { setting_key: string; setting_value: string | null }) => {
      settingsMap[s.setting_key] = s.setting_value || '';
    });

    const whapiToken = settingsMap[tokenKey] || settingsMap['whapi_token'];

    if (!whapiToken) {
      return new Response(JSON.stringify({ success: false, error: 'Whapi.cloud token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number - Whapi expects number without + prefix
    const cleanNumber = String(number).replace(/\D/g, '');

    let result;

    if (button_text && button_url) {
      // Send interactive button message with cta_url
      console.log(`Sending interactive button message to ${cleanNumber}`);
      const response = await fetch('https://gate.whapi.cloud/messages/interactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whapiToken}`,
        },
        body: JSON.stringify({
          to: cleanNumber,
          type: 'cta_url',
          body: { text: message },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: button_text,
              url: button_url,
            },
          },
        }),
      });
      result = await response.json();
      console.log('Whapi interactive response:', result);
    } else {
      // Send plain text message
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

    // Check for success (Whapi returns message_id on success)
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
