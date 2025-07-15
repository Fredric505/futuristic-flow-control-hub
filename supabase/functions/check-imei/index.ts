
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No authorization header'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.log('Auth error:', authError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Get request body
    const { searchValue, searchType } = await req.json()

    if (!searchValue || !searchType) {
      console.log('Missing required fields')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: searchValue and searchType'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Processing IMEI check for user:', user.id, 'IMEI:', searchValue)

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('Profile error:', profileError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error checking user credits'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if ((profile?.credits || 0) < 0.25) {
      console.log('Insufficient credits:', profile?.credits)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient credits'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get iFreeCloud credentials
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', ['ifree_username', 'ifree_key'])

    if (settingsError) {
      console.log('Settings error:', settingsError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error loading API settings'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const config = settings?.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {})

    const username = config?.ifree_username
    const apiKey = config?.ifree_key

    if (!username || !apiKey) {
      console.log('Missing iFreeCloud credentials')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'iFreeCloud API credentials not configured'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    let checkResult: any = {}
    let success = false
    let errorMessage = ''

    try {
      // Call iFreeCloud API
      const serviceId = '205' // All-in-one service
      const apiUrl = `https://api.ifreeicloud.co.uk/api/v2/imei-check`
      
      console.log('Calling iFreeCloud API with username:', username, 'service:', serviceId, 'imei:', searchValue)
      
      const requestBody = {
        username: username,
        key: apiKey,
        service: serviceId,
        imei: searchValue
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Astro505-API/1.0'
        },
        body: JSON.stringify(requestBody)
      })
      
      const data = await response.json()
      console.log('iFreeCloud API response status:', response.status)
      console.log('iFreeCloud API response data:', JSON.stringify(data, null, 2))

      // Handle different response structures from iFreeCloud
      if (response.ok && data) {
        if (data.success === true || data.status === 'success' || data.result) {
          success = true
          
          // Extract data from response
          const resultData = data.data || data.result || data.response || data
          
          checkResult = {
            device_name: resultData?.device_name || resultData?.deviceName || resultData?.model || null,
            model: resultData?.model || resultData?.device_model || null,
            color: resultData?.color || resultData?.device_color || null,
            storage: resultData?.storage || resultData?.device_storage || null,
            carrier: resultData?.carrier || resultData?.network || resultData?.sim_lock || null,
            warranty: resultData?.warranty || resultData?.warranty_status || null,
            find_my_iphone: resultData?.find_my_iphone || resultData?.findMyIphone || resultData?.fmi_status === 'ON',
            activation_lock: resultData?.activation_lock || resultData?.activationLock || resultData?.icloud_status === 'ON',
            blacklist_status: resultData?.blacklist_status || resultData?.blacklistStatus || resultData?.blacklist || null,
            serial_number: resultData?.serial_number || resultData?.serialNumber || resultData?.serial || null
          }
          
          console.log('Processed result:', checkResult)
        } else {
          // API returned error but with 200 status
          errorMessage = data.message || data.error || data.msg || 'Error en la verificación'
          console.log('API error with 200 status:', errorMessage)
          
          // Don't throw error, just record failed check without charging
          await supabase
            .from('imei_checks')
            .insert({
              user_id: user.id,
              search_type: searchType,
              search_value: searchValue,
              status: 'error',
              error_message: errorMessage,
              credits_deducted: 0
            })

          return new Response(
            JSON.stringify({
              success: false,
              error: errorMessage
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }
      } else {
        // HTTP error
        errorMessage = data?.message || data?.error || `HTTP Error: ${response.status} ${response.statusText}`
        console.log('HTTP error:', errorMessage)
        throw new Error(errorMessage)
      }
    } catch (apiError: any) {
      console.error('iFreeCloud API Error:', apiError.message)
      
      errorMessage = apiError.message || 'Failed to connect to iFreeCloud API'
      
      // Record failed check in database
      await supabase
        .from('imei_checks')
        .insert({
          user_id: user.id,
          search_type: searchType,
          search_value: searchValue,
          status: 'error',
          error_message: errorMessage,
          credits_deducted: 0
        })

      return new Response(
        JSON.stringify({
          success: false,
          error: `API Error: ${errorMessage}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (success) {
      // Deduct credits only on successful verification
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ 
          credits: (profile?.credits || 0) - 0.25,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (creditError) {
        console.error('Error updating credits:', creditError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Error deducting credits'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }

      // Record successful check
      await supabase
        .from('imei_checks')
        .insert({
          user_id: user.id,
          search_type: searchType,
          search_value: searchValue,
          device_name: checkResult.device_name,
          model: checkResult.model,
          color: checkResult.color,
          storage: checkResult.storage,
          carrier: checkResult.carrier,
          warranty: checkResult.warranty,
          find_my_iphone: checkResult.find_my_iphone,
          activation_lock: checkResult.activation_lock,
          blacklist_status: checkResult.blacklist_status,
          serial_number: checkResult.serial_number,
          status: 'success',
          credits_deducted: 0.25
        })

      console.log('IMEI check completed successfully')

      return new Response(
        JSON.stringify({
          success: true,
          data: checkResult
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

  } catch (error: any) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
