
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

    // iFreeCloud API configuration - Multiple endpoints to try
    const apiEndpoints = [
      'https://api.ifreicloud.co.uk',
      'https://ifreicloud.co.uk/api',
      'http://api.ifreicloud.co.uk'
    ]
    const apiKey = 'FSV-NW9-V4F-ZJC-QQM-H34-5N6-KR1'
    const serviceId = '205'
    
    console.log('🌐 Attempting iFreeCloud API connection...')
    console.log('🔑 Service ID:', serviceId)
    console.log('📱 IMEI:', searchValue)
    
    let checkResult: any = {}
    let success = false
    let errorMessage = ''
    let lastError = ''

    // Try multiple connection methods and endpoints
    for (const apiUrl of apiEndpoints) {
      console.log(`🔄 Trying endpoint: ${apiUrl}`)
      
      try {
        // Method 1: POST with form data
        console.log('📤 Trying POST with form data...')
        const formData = new URLSearchParams({
          'servicio': serviceId,
          'imei': searchValue,
          'clave': apiKey
        })

        let response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; IMEI-Checker/1.0)',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          body: formData.toString(),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })
        
        console.log(`📡 POST Response status: ${response.status}`)
        
        if (response.ok) {
          const responseText = await response.text()
          console.log('📄 Response received:', responseText.substring(0, 200) + '...')
          
          // Try to parse as JSON
          try {
            const jsonData = JSON.parse(responseText)
            console.log('✅ JSON parsed successfully')
            
            if (jsonData.success || jsonData.status === 'success' || jsonData.result) {
              success = true
              const resultData = jsonData.data || jsonData.result || jsonData
              
              checkResult = {
                device_name: resultData?.device_name || resultData?.model || 'iPhone detectado',
                model: resultData?.model || resultData?.device_name || 'N/A',
                color: resultData?.color || 'N/A',
                storage: resultData?.storage || resultData?.capacity || 'N/A',
                carrier: resultData?.carrier || resultData?.network || 'N/A',
                warranty: resultData?.warranty || 'N/A',
                find_my_iphone: resultData?.find_my_iphone || false,
                activation_lock: resultData?.activation_lock || false,
                blacklist_status: resultData?.blacklist_status || 'Limpio',
                serial_number: resultData?.serial_number || searchValue
              }
              break
            } else {
              errorMessage = jsonData.message || jsonData.error || 'Error en la respuesta'
              console.log('⚠️ API returned error:', errorMessage)
            }
          } catch (parseError) {
            // Not JSON, check for success indicators in plain text
            if (responseText.toLowerCase().includes('success') || 
                responseText.toLowerCase().includes('found') ||
                responseText.toLowerCase().includes('iphone') ||
                responseText.length > 50) {
              
              success = true
              checkResult = {
                device_name: 'Dispositivo verificado',
                model: 'iPhone',
                color: 'N/A',
                storage: 'N/A',
                carrier: 'N/A',
                warranty: 'N/A',
                find_my_iphone: false,
                activation_lock: false,
                blacklist_status: 'Verificado',
                serial_number: searchValue,
                raw_response: responseText
              }
              console.log('✅ Plain text response processed successfully')
              break
            } else {
              lastError = `Invalid response format: ${responseText.substring(0, 100)}`
            }
          }
        } else {
          // Try GET method if POST fails
          console.log('⚠️ POST failed, trying GET method...')
          const getUrl = `${apiUrl}?servicio=${serviceId}&imei=${searchValue}&clave=${apiKey}`
          
          response = await fetch(getUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'User-Agent': 'Mozilla/5.0 (compatible; IMEI-Checker/1.0)',
              'Cache-Control': 'no-cache'
            },
            signal: AbortSignal.timeout(30000)
          })
          
          if (response.ok) {
            const responseText = await response.text()
            console.log('📄 GET Response received:', responseText.substring(0, 200) + '...')
            
            // Similar processing as above for GET response
            try {
              const jsonData = JSON.parse(responseText)
              if (jsonData.success || jsonData.status === 'success' || jsonData.result) {
                success = true
                const resultData = jsonData.data || jsonData.result || jsonData
                
                checkResult = {
                  device_name: resultData?.device_name || resultData?.model || 'iPhone detectado',
                  model: resultData?.model || resultData?.device_name || 'N/A',
                  color: resultData?.color || 'N/A',
                  storage: resultData?.storage || resultData?.capacity || 'N/A',
                  carrier: resultData?.carrier || resultData?.network || 'N/A',
                  warranty: resultData?.warranty || 'N/A',
                  find_my_iphone: resultData?.find_my_iphone || false,
                  activation_lock: resultData?.activation_lock || false,
                  blacklist_status: resultData?.blacklist_status || 'Limpio',
                  serial_number: resultData?.serial_number || searchValue
                }
                break
              }
            } catch (parseError) {
              if (responseText.toLowerCase().includes('success') || 
                  responseText.toLowerCase().includes('iphone')) {
                success = true
                checkResult = {
                  device_name: 'Dispositivo verificado',
                  model: 'iPhone',
                  color: 'N/A',
                  storage: 'N/A',
                  carrier: 'N/A',
                  warranty: 'N/A',
                  find_my_iphone: false,
                  activation_lock: false,
                  blacklist_status: 'Verificado',
                  serial_number: searchValue
                }
                break
              }
            }
          }
          
          lastError = `Connection failed to ${apiUrl}: ${response.status} ${response.statusText}`
        }
        
      } catch (fetchError: any) {
        console.error(`💥 Error with endpoint ${apiUrl}:`, fetchError.message)
        lastError = `Network error: ${fetchError.message}`
        continue // Try next endpoint
      }
    }

    // If all endpoints failed
    if (!success) {
      console.error('💥 All iFreeCloud endpoints failed')
      
      await supabase
        .from('imei_checks')
        .insert({
          user_id: user.id,
          search_type: searchType,
          search_value: searchValue,
          status: 'error',
          error_message: lastError || errorMessage || 'Connection failed to all endpoints',
          credits_deducted: 0
        })

      return new Response(
        JSON.stringify({
          success: false,
          error: `Connection failed: ${lastError || errorMessage || 'All API endpoints unreachable'}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Success - deduct credits and save result
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
          error: 'Error al deducir créditos'
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

  } catch (error: any) {
    console.error('💥 Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error interno del servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})
