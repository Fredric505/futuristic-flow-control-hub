import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { userId, phone, message, imageUrl } = body;

    if (!userId || !phone || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: userId, phone, message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has active session
    const { data: session } = await supabase
      .from("user_whatsapp_sessions")
      .select("session_status")
      .eq("user_id", userId)
      .maybeSingle();

    // Get VPS config
    const { data: settings } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "whatsapp_webjs_api_url", "whatsapp_webjs_api_key",
        "whatsapp_instance", "whatsapp_token",
        "whatsapp_instance_en", "whatsapp_token_en",
      ]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => { settingsMap[s.setting_key] = (s.setting_value || "").trim(); });

    const vpsUrl = settingsMap["whatsapp_webjs_api_url"];
    const vpsKey = settingsMap["whatsapp_webjs_api_key"];

    let sentVia = "ultramsg";
    let success = false;
    let responseData: any = {};

    // Try VPS first if session is connected
    if (session?.session_status === "connected" && vpsUrl) {
      try {
        const vpsHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (vpsKey) vpsHeaders["Authorization"] = `Bearer ${vpsKey}`;

        const vpsPayload: any = { userId, phone, message };
        if (imageUrl) vpsPayload.imageUrl = imageUrl;

        const vpsResponse = await fetch(`${vpsUrl}/session/send/${userId}`, {
          method: "POST",
          headers: vpsHeaders,
          body: JSON.stringify(vpsPayload),
        });

        const vpsResult = await vpsResponse.json();

        if (vpsResponse.ok && vpsResult.success !== false) {
          sentVia = "whatsapp-webjs";
          success = true;
          responseData = vpsResult;
        } else {
          console.log("VPS send failed, falling back to UltraMsg:", vpsResult);
          // Mark session as disconnected if send fails
          await supabase
            .from("user_whatsapp_sessions")
            .update({ session_status: "disconnected", connected_phone: null })
            .eq("user_id", userId);
        }
      } catch (vpsError) {
        console.error("VPS error, falling back to UltraMsg:", vpsError);
        await supabase
          .from("user_whatsapp_sessions")
          .update({ session_status: "disconnected", connected_phone: null })
          .eq("user_id", userId);
      }
    }

    // Fallback: UltraMsg
    if (!success) {
      const language = body.language || "spanish";
      const instanceKey = language === "english" ? "whatsapp_instance_en" : "whatsapp_instance";
      const tokenKey = language === "english" ? "whatsapp_token_en" : "whatsapp_token";

      const instanceId = settingsMap[instanceKey];
      const token = settingsMap[tokenKey];

      if (!instanceId || !token) {
        return new Response(JSON.stringify({
          success: false,
          error: "No UltraMsg configuration found for fallback",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ultraUrl = `https://api.ultramsg.com/${instanceId}/messages/chat`;
      const ultraBody = new URLSearchParams({
        token: token,
        to: phone,
        body: message,
      });

      const ultraResponse = await fetch(ultraUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: ultraBody.toString(),
      });

      responseData = await ultraResponse.json();
      success = ultraResponse.ok;
      sentVia = "ultramsg";

      // Send image if available
      if (success && imageUrl) {
        const imgUrl = `https://api.ultramsg.com/${instanceId}/messages/image`;
        const imgBody = new URLSearchParams({
          token: token,
          to: phone,
          image: imageUrl,
        });
        await fetch(imgUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: imgBody.toString(),
        });
      }
    }

    return new Response(JSON.stringify({
      success,
      sent_via: sentVia,
      response: responseData,
    }), {
      status: success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Send error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
