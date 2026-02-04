import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsRequest {
  number: string;
  message: string;
  api_id: number;
  sender_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    if (user.email !== 'fredric@gmail.com') {
      return new Response(
        JSON.stringify({ error: 'Only admin can send SMS' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get SMS API credentials from system_settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['sms_api_key', 'sms_api_token']);

    if (settingsError) {
      console.error('Error fetching SMS settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching SMS settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settingsMap = settings?.reduce((acc: Record<string, string>, s) => {
      acc[s.setting_key] = s.setting_value || '';
      return acc;
    }, {}) || {};

    const apiKey = settingsMap['sms_api_key'];
    const apiToken = settingsMap['sms_api_token'];

    if (!apiKey || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'SMS API credentials not configured. Please configure them in Instance Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { number, message, api_id, sender_id }: SmsRequest = await req.json();

    if (!number || !message || !api_id || !sender_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: number, message, api_id, sender_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Build API URL
    const smsApiUrl = `https://senders-global.com/api/envioApi/?envioApi&api_key=${apiKey}&api_token=${apiToken}&sender_id=${sender_id}&api_id=${api_id}&number=${number}&msj=${encodedMessage}`;

    console.log('Sending SMS to:', number, 'with api_id:', api_id, 'sender_id:', sender_id);

    // Send SMS via senders-global.com API
    const smsResponse = await fetch(smsApiUrl, {
      method: 'GET',
    });

    const smsResult = await smsResponse.text();
    console.log('SMS API response:', smsResult);

    let parsedResult;
    try {
      parsedResult = JSON.parse(smsResult);
    } catch {
      parsedResult = { raw: smsResult };
    }

    // Check if SMS was sent successfully
    const success = parsedResult.ok === true || parsedResult.status === 'success' || smsResponse.ok;

    // Log the SMS in messages table (optional - for audit)
    await supabase.from('messages').insert({
      user_id: user.id,
      process_id: '00000000-0000-0000-0000-000000000000', // Placeholder since SMS doesn't require a process
      message_content: `[SMS via api_id:${api_id}] ${message}`,
      recipient_phone: number,
      status: success ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
    });

    if (success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'SMS sent successfully',
          response: parsedResult 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS sending failed',
          response: parsedResult 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-sms function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
