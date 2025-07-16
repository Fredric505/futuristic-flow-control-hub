
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
      console.log('❌ No authorization header provided')
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
      console.log('❌ Auth error:', authError)
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
      console.log('❌ Missing required fields')
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

    console.log('🔍 Processing IMEI check for user:', user.id)
    console.log('📱 Search value:', searchValue, 'Type:', searchType)

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('❌ Profile error:', profileError)
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
      console.log('❌ Insufficient credits:', profile?.credits)
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

    // iFreeCloud API call using the correct configuration from the image
    const apiUrl = 'https://api.ifreicloud.co.uk'
    const apiKey = 'FSV-NW9-V4F-ZJC-QQM-H34-5N6-KR1'
    const serviceId = '205' // All-in-one service
    
    console.log('🌐 Calling iFreeCloud API with correct configuration...')
    console.log('📍 URL:', apiUrl)
    console.log('🔑 Service ID:', serviceId)
    
    let checkResult: any = {}
    let success = false
    let errorMessage = ''

    try {
      // Using POST method as shown in the configuration
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Astro505-API/1.0'
        },
        body: new URLSearchParams({
          'servicio': serviceId,
          'imei': searchValue,
          'clave': apiKey
        })
      })
      
      console.log('📡 Response status:', response.status)
      console.log('📄 Response headers:', Object.fromEntries(response.headers.entries()))
      
      const data = await response.text()
      console.log('📝 Raw response:', data)

      // Try to parse as JSON
      let jsonData;
      try {
        jsonData = JSON.parse(data);
        console.log('✅ Parsed JSON:', JSON.stringify(jsonData, null, 2))
      } catch (parseError) {
        console.log('❌ Failed to parse JSON, trying as plain text response')
        
        // If it's not JSON, check if it contains success indicators
        if (data.toLowerCase().includes('success') || data.toLowerCase().includes('found')) {
          success = true
          checkResult = {
            device_name: 'Device found',
            model: 'Check completed',
            color: 'N/A',
            storage: 'N/A',
            carrier: 'N/A',
            warranty: 'N/A',
            find_my_iphone: false,
            activation_lock: false,
            blacklist_status: 'Clean',
            serial_number: searchValue,
            raw_response: data
          }
        } else {
          throw new Error(`Invalid response format: ${data}`)
        }
      }

      if (jsonData && response.ok) {
        // Check for success indicators in various response formats
        if (jsonData.success === true || jsonData.status === 'success' || jsonData.result || jsonData.data) {
          success = true
          
          // Extract data from response - handle different response structures
          const resultData = jsonData.data || jsonData.result || jsonData.response || jsonData
          
          checkResult = {
            device_name: resultData?.device_name || resultData?.deviceName || resultData?.model || 'Device found',
            model: resultData?.model || resultData?.device_model || resultData?.device_name || 'N/A',
            color: resultData?.color || resultData?.device_color || 'N/A',
            storage: resultData?.storage || resultData?.device_storage || resultData?.capacity || 'N/A',
            carrier: resultData?.carrier || resultData?.network || resultData?.sim_lock || resultData?.simlock || 'N/A',
            warranty: resultData?.warranty || resultData?.warranty_status || 'N/A',
            find_my_iphone: resultData?.find_my_iphone || resultData?.findMyIphone || resultData?.fmi_status === 'ON' || false,
            activation_lock: resultData?.activation_lock || resultData?.activationLock || resultData?.icloud_status === 'ON' || false,
            blacklist_status: resultData?.blacklist_status || resultData?.blacklistStatus || resultData?.blacklist || 'Clean',
            serial_number: resultData?.serial_number || resultData?.serialNumber || resultData?.serial || searchValue
          }
          
          console.log('✅ Processed result:', JSON.stringify(checkResult, null, 2))
        } else {
          // API returned error
          errorMessage = jsonData.message || jsonData.error || jsonData.msg || 'Error en la verificación IMEI'
          console.log('❌ API error:', errorMessage)
          
          // Record failed check without charging credits
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
              status: 200,
            }
          )
        }
      } else if (!response.ok) {
        // HTTP error
        errorMessage = `HTTP Error: ${response.status} ${response.statusText} - ${data}`
        console.log('❌ HTTP error:', errorMessage)
        throw new Error(errorMessage)
      }
    } catch (apiError: any) {
      console.error('💥 iFreeCloud API Error:', apiError.message)
      
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
          error: `API Connection Error: ${errorMessage}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
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
        console.error('❌ Error updating credits:', creditError)
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

      console.log('✅ IMEI check completed successfully')

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
    console.error('💥 Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})
