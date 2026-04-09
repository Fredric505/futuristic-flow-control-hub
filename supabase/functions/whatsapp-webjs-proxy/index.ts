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
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getUser();
    if (claimsError || !claims.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized: " + (claimsError?.message || "no user") }), {
        status: 200,
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
      return new Response(JSON.stringify({ ok: false, error: "VPS URL not configured in system_settings" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Proxy: VPS URL = ${vpsUrl}, has key = ${!!vpsKey}`);

    const body = await req.json();
    const { action } = body;

    const vpsHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (vpsKey) vpsHeaders["Authorization"] = `Bearer ${vpsKey}`;

    let vpsResponse: Response;
    let targetUrl: string;

    switch (action) {
      case "start-session": {
        targetUrl = `${vpsUrl}/session/start`;
        console.log(`Proxy: POST ${targetUrl}`);
        try {
          vpsResponse = await fetch(targetUrl, {
            method: "POST",
            headers: vpsHeaders,
            body: JSON.stringify({ userId }),
          });
        } catch (fetchErr) {
          console.error("Proxy fetch error:", fetchErr);
          return new Response(JSON.stringify({ ok: false, error: `Cannot connect to VPS: ${fetchErr.message}`, vpsUrl: targetUrl }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }
      case "get-qr": {
        targetUrl = `${vpsUrl}/session/qr/${userId}`;
        console.log(`Proxy: GET ${targetUrl}`);
        try {
          vpsResponse = await fetch(targetUrl, {
            method: "GET",
            headers: vpsHeaders,
          });
        } catch (fetchErr) {
          console.error("Proxy fetch error:", fetchErr);
          return new Response(JSON.stringify({ ok: false, error: `Cannot connect to VPS: ${fetchErr.message}`, vpsUrl: targetUrl }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }
      case "get-status": {
        targetUrl = `${vpsUrl}/session/status/${userId}`;
        console.log(`Proxy: GET ${targetUrl}`);
        try {
          vpsResponse = await fetch(targetUrl, {
            method: "GET",
            headers: vpsHeaders,
          });
        } catch (fetchErr) {
          console.error("Proxy fetch error:", fetchErr);
          return new Response(JSON.stringify({ ok: false, error: `Cannot connect to VPS: ${fetchErr.message}`, vpsUrl: targetUrl }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update session in DB based on VPS response
        try {
          const statusData = await vpsResponse.clone().json();
          const sessionStatus = statusData.status || "disconnected";
          const connectedPhone = statusData.phone || null;

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

        const statusResult = await vpsResponse.json();
        return new Response(JSON.stringify({ ok: true, ...statusResult }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "destroy-session": {
        targetUrl = `${vpsUrl}/session/destroy/${userId}`;
        console.log(`Proxy: POST ${targetUrl}`);
        try {
          vpsResponse = await fetch(targetUrl, {
            method: "POST",
            headers: vpsHeaders,
          });
        } catch (fetchErr) {
          console.error("Proxy fetch error:", fetchErr);
          return new Response(JSON.stringify({ ok: false, error: `Cannot connect to VPS: ${fetchErr.message}`, vpsUrl: targetUrl }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("user_whatsapp_sessions")
          .update({ session_status: "disconnected", connected_phone: null })
          .eq("user_id", userId);
        break;
      }
      default:
        return new Response(JSON.stringify({ ok: false, error: `Invalid action: ${action}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const result = await vpsResponse!.json();
    return new Response(JSON.stringify({ ok: vpsResponse!.ok, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message || "Internal error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
