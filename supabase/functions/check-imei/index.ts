
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imei, serial, apiKey, username, apiUrl } = await req.json()

    if (!apiKey || !username || !apiUrl) {
      throw new Error('Missing API configuration')
    }

    if (!imei && !serial) {
      throw new Error('IMEI or Serial Number is required')
    }

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization required')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Check user credits first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new Error('Error checking user credits')
    }

    if (!profile || profile.credits < 0.25) {
      throw new Error('Insufficient credits. Required: 0.25 credits')
    }

    const searchParam = imei ? imei : serial
    const searchType = imei ? 'imei' : 'serial'

    // Call iFreeCloud API
    const response = await fetch(`${apiUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        username: username,
        [searchType]: searchParam
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()

    // Deduct credits after successful API call
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ 
        credits: profile.credits - 0.25,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (creditError) {
      console.error('Error deducting credits:', creditError)
      // Note: We don't throw here to avoid failing the response after successful API call
    }

    // Format the response data
    const result = {
      device_name: data.device_name || 'N/A',
      model: data.model || 'N/A',
      color: data.color || 'N/A',
      storage: data.storage || 'N/A',
      carrier: data.carrier || 'N/A',
      warranty: data.warranty || 'N/A',
      find_my_iphone: data.find_my_iphone || false,
      activation_lock: data.activation_lock || false,
      blacklist_status: data.blacklist_status || 'Unknown',
      serial_number: data.serial_number || 'N/A',
      credits_deducted: 0.25,
      remaining_credits: profile.credits - 0.25
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error checking IMEI:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to check device'
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
