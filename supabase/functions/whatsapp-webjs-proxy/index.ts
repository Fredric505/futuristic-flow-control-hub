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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getUser();
    if (claimsError || !claims.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.user.id;

    // Get VPS config from system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["whatsapp_webjs_api_url", "whatsapp_webjs_api_key"]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => { settingsMap[s.setting_key] = (s.setting_value || "").trim(); });

    const vpsUrl = settingsMap["whatsapp_webjs_api_url"];
    const vpsKey = settingsMap["whatsapp_webjs_api_key"];

    if (!vpsUrl) {
      return new Response(JSON.stringify({ error: "VPS URL not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    const vpsHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (vpsKey) vpsHeaders["Authorization"] = `Bearer ${vpsKey}`;

    let vpsResponse: Response;

    switch (action) {
      case "start-session": {
        vpsResponse = await fetch(`${vpsUrl}/session/start`, {
          method: "POST",
          headers: vpsHeaders,
          body: JSON.stringify({ userId }),
        });
        break;
      }
      case "get-qr": {
        vpsResponse = await fetch(`${vpsUrl}/session/qr/${userId}`, {
          method: "GET",
          headers: vpsHeaders,
        });
        break;
      }
      case "get-status": {
        vpsResponse = await fetch(`${vpsUrl}/session/status/${userId}`, {
          method: "GET",
          headers: vpsHeaders,
        });

        // Update session in DB based on VPS response
        try {
          const statusData = await vpsResponse.clone().json();
          const sessionStatus = statusData.status || "disconnected";
          const connectedPhone = statusData.phone || null;

          // Upsert session record
          const { data: existing } = await supabase
            .from("user_whatsapp_sessions")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("user_whatsapp_sessions")
              .update({ session_status: sessionStatus, connected_phone: connectedPhone })
              .eq("user_id", userId);
          } else {
            await supabase
              .from("user_whatsapp_sessions")
              .insert({ user_id: userId, session_status: sessionStatus, connected_phone: connectedPhone });
          }
        } catch (e) {
          console.error("Error updating session status:", e);
        }

        // Return the original response
        const statusResult = await vpsResponse.json();
        return new Response(JSON.stringify(statusResult), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "destroy-session": {
        vpsResponse = await fetch(`${vpsUrl}/session/destroy/${userId}`, {
          method: "POST",
          headers: vpsHeaders,
        });

        // Mark session as disconnected
        await supabase
          .from("user_whatsapp_sessions")
          .update({ session_status: "disconnected", connected_phone: null })
          .eq("user_id", userId);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const result = await vpsResponse.json();
    return new Response(JSON.stringify(result), {
      status: vpsResponse.ok ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
