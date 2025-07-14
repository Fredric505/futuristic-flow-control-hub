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
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request body
    const { searchValue, searchType } = await req.json()

    if (!searchValue || !searchType) {
      throw new Error('Missing required fields: searchValue and searchType')
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new Error('Error checking user credits')
    }

    if ((profile?.credits || 0) < 0.25) {
      throw new Error('Insufficient credits')
    }

    // Get iFreeCloud credentials
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', ['ifree_username', 'ifree_key'])

    if (settingsError) {
      throw new Error('Error loading API settings')
    }

    const config = settings?.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {})

    const username = config?.ifree_username
    const apiKey = config?.ifree_key

    if (!username || !apiKey) {
      throw new Error('iFreeCloud API credentials not configured')
    }

    let checkResult: any = {}
    let success = false
    let errorMessage = ''

    try {
      // Call iFreeCloud API
      const serviceId = '205' // All-in-one service
      const apiUrl = `https://ifreecloud.com/api/v2/imei-check/${searchValue}?username=${username}&key=${apiKey}&service=${serviceId}`
      
      console.log('Calling iFreeCloud API:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Astro505-API/1.0'
        }
      })
      
      const data = await response.json()
      console.log('iFreeCloud API response:', { status: response.status, data })

      if (response.ok && (data.success === true || data.result === true || data.status === 'success')) {
        success = true
        
        // Extract data from various possible response formats
        const resultData = data.data || data.result || data
        
        checkResult = {
          device_name: resultData?.device_name || resultData?.deviceName || null,
          model: resultData?.model || null,
          color: resultData?.color || null,
          storage: resultData?.storage || null,
          carrier: resultData?.carrier || resultData?.network || null,
          warranty: resultData?.warranty || resultData?.warrantyStatus || null,
          find_my_iphone: resultData?.find_my_iphone || resultData?.findMyIphone || false,
          activation_lock: resultData?.activation_lock || resultData?.activationLock || false,
          blacklist_status: resultData?.blacklist_status || resultData?.blacklistStatus || null,
          serial_number: resultData?.serial_number || resultData?.serialNumber || null
        }
      } else {
        errorMessage = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }
    } catch (apiError: any) {
      console.error('iFreeCloud API Error:', apiError)
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
          credits_deducted: 0 // Don't charge for failed requests
        })

      throw new Error(`API Error: ${errorMessage}`)
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
        throw new Error('Error deducting credits')
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
        status: 400,
      }
    )
  }
})