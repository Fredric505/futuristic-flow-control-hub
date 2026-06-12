import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  phone: string;
  message: string;
  language?: "es" | "en";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone, message, language = "es" } = (await req.json()) as Body;
    if (!phone || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Missing phone or message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("ai_chatbot_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.is_enabled) {
      return new Response(JSON.stringify({ ok: false, error: "AI disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Load menu options to include in system prompt
    const { data: menuResponses } = await supabase
      .from("chatbot_responses")
      .select("keyword, response_es, response_en, is_menu, menu_order")
      .eq("is_active", true)
      .order("menu_order", { ascending: true });

    const menuText = (menuResponses || [])
      .map((r: any) => `- "${r.keyword}": ${(language === "en" ? r.response_en : r.response_es).slice(0, 120)}`)
      .join("\n");

    // Load history (last N)
    const limit = settings.history_limit || 12;
    const { data: historyRows } = await supabase
      .from("ai_conversation_history")
      .select("role, content, created_at")
      .eq("phone_number", phone)
      .order("created_at", { ascending: false })
      .limit(limit);

    const history = (historyRows || []).reverse();

    const systemContent = [
      settings.system_prompt,
      settings.personality ? `\nPersonalidad:\n${settings.personality}` : "",
      settings.behavior ? `\nComportamiento:\n${settings.behavior}` : "",
      menuText
        ? `\nOpciones disponibles del menú (guía al cliente hacia ellas de forma natural cuando aplique; el cliente puede responder con la palabra clave entre comillas):\n${menuText}`
        : "",
      settings.custom_link_enabled && settings.custom_link_url
        ? `\nCuando debas enviar un enlace de soporte, utiliza EXACTAMENTE este enlace: ${settings.custom_link_url}${settings.custom_link_preview_text ? ` (texto previo sugerido: "${settings.custom_link_preview_text}")` : ""}`
        : "",
      `\nResponde en ${language === "en" ? "inglés" : "español"}.`,
    ]
      .filter(Boolean)
      .join("\n");

    const messages = [
      { role: "system", content: systemContent },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    // Resolve provider
    const provider = settings.provider || "deepseek";
    let apiUrl = "";
    let apiKey = "";
    let model = settings.model || "deepseek-chat";

    if (provider === "lovable") {
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
      if (!settings.model) model = "google/gemini-3-flash-preview";
    } else if (provider === "openai") {
      apiUrl = ((settings.base_url || "https://api.openai.com").replace(/\/$/, "")) + "/v1/chat/completions";
      apiKey = (settings.api_key || "").trim();
      if (!settings.model) model = "gpt-4o-mini";
    } else {
      // deepseek
      apiUrl = ((settings.base_url || "https://api.deepseek.com").replace(/\/$/, "")) + "/v1/chat/completions";
      apiKey = (settings.api_key || "").trim();
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing API key for provider " + provider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (provider === "lovable") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const aiBody = {
      model,
      messages,
      temperature: Number(settings.temperature) || 0.7,
      max_tokens: Number(settings.max_tokens) || 350,
    };

    console.log(`🤖 Calling ${provider} model=${model}`);
    const aiResp = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(aiBody),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error(`❌ AI provider error ${aiResp.status}:`, errText);
      return new Response(JSON.stringify({ ok: false, error: `AI provider ${aiResp.status}`, detail: errText.slice(0, 500) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const aiJson = await aiResp.json();
    const reply = aiJson?.choices?.[0]?.message?.content?.trim() || "";

    if (!reply) {
      return new Response(JSON.stringify({ ok: false, error: "Empty AI reply" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Save history (user + assistant)
    await supabase.from("ai_conversation_history").insert([
      { phone_number: phone, role: "user", content: message },
      { phone_number: phone, role: "assistant", content: reply },
    ]);

    // Prune old: keep last 50 per number
    try {
      const { data: keepIds } = await supabase
        .from("ai_conversation_history")
        .select("id")
        .eq("phone_number", phone)
        .order("created_at", { ascending: false })
        .limit(50);
      const keepSet = new Set((keepIds || []).map((r: any) => r.id));
      if (keepSet.size >= 50) {
        await supabase
          .from("ai_conversation_history")
          .delete()
          .eq("phone_number", phone)
          .not("id", "in", `(${[...keepSet].map((id) => `"${id}"`).join(",")})`);
      }
    } catch (e) {
      console.warn("history prune skipped", e);
    }

    return new Response(JSON.stringify({ ok: true, reply, activation_mode: settings.activation_mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("ai-chatbot-respond error:", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || "internal" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});