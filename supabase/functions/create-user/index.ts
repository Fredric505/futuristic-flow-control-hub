
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("Create user function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("Supabase client initialized");

    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    
    const { email, password, credits, expirationDate } = requestBody;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    console.log("Creating user with email:", email);

    // Create user with admin privileges
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }

    console.log("User created successfully:", authData.user.id);

    // Create profile with credits and expiration
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: authData.user.id,
        email: email,
        credits: parseInt(credits) || 0,
        expire_at: expirationDate || null,
      });

    if (profileError) {
      console.error("Profile error:", profileError);
      throw profileError;
    }

    console.log("Profile updated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Error creating user",
        details: error.toString()
      }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
        status: 400,
      }
    );
  }
});
