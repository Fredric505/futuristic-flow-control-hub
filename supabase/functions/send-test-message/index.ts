import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { phone, message } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Missing phone or message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const cleanPhone = String(phone).replace(/[\s\-\(\)\.\+]/g, "");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: vpsSettings } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["whatsapp_webjs_api_url", "whatsapp_webjs_api_key"]);
    const vpsMap: Record<string, string> = {};
    vpsSettings?.forEach((s: any) => { vpsMap[s.setting_key] = (s.setting_value || "").trim(); });
    const vpsUrl = vpsMap["whatsapp_webjs_api_url"];
    const vpsKey = vpsMap["whatsapp_webjs_api_key"];

    if (!vpsUrl) {
      return new Response(JSON.stringify({ ok: false, error: "VPS URL no configurado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (vpsKey) headers["Authorization"] = `Bearer ${vpsKey}`;

    const resp = await fetch(`${vpsUrl}/session/send/${user.id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: user.id, phone: cleanPhone, message }),
    });
    const result = await resp.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: resp.ok, status: resp.status, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "internal" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});