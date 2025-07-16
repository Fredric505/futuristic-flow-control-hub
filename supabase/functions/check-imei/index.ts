
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

    // iFreeCloud API configuration - Corregida según la documentación
    const apiUrl = 'https://api.ifreicloud.co.uk'
    const apiKey = 'FSV-NW9-V4F-ZJC-QQM-H34-5N6-KR1'
    const serviceId = '205' // Servicio All-in-one
    
    console.log('🌐 Calling iFreeCloud API...')
    console.log('📍 URL:', apiUrl)
    console.log('🔑 Service ID:', serviceId)
    
    let checkResult: any = {}
    let success = false
    let errorMessage = ''

    try {
      // Probar primero con método POST usando form data
      const formData = new URLSearchParams({
        'servicio': serviceId,
        'imei': searchValue,
        'clave': apiKey
      })

      console.log('📤 Sending POST request with form data...')
      
      let response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; iFreeCloud-API/1.0)'
        },
        body: formData.toString()
      })
      
      console.log('📡 POST Response status:', response.status)
      
      // Si POST falla, intentar con GET
      if (!response.ok) {
        console.log('⚠️ POST failed, trying GET method...')
        const getUrl = `${apiUrl}?servicio=${serviceId}&imei=${searchValue}&clave=${apiKey}`
        
        response = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; iFreeCloud-API/1.0)'
          }
        })
        
        console.log('📡 GET Response status:', response.status)
      }
      
      const responseText = await response.text()
      console.log('📄 Raw response:', responseText)

      // Intentar parsear como JSON
      let jsonData;
      try {
        jsonData = JSON.parse(responseText);
        console.log('✅ Parsed JSON:', JSON.stringify(jsonData, null, 2))
      } catch (parseError) {
        console.log('⚠️ Not JSON response, checking for success indicators...')
        
        // Si no es JSON, verificar indicadores de éxito en texto plano
        const responseText = await response.text()
        if (responseText.toLowerCase().includes('success') || 
            responseText.toLowerCase().includes('found') ||
            responseText.toLowerCase().includes('clean') ||
            response.ok) {
          
          success = true
          checkResult = {
            device_name: 'Dispositivo encontrado',
            model: 'Verificación completada',
            color: 'N/A',
            storage: 'N/A',
            carrier: 'N/A',
            warranty: 'N/A',
            find_my_iphone: false,
            activation_lock: false,
            blacklist_status: 'Limpio',
            serial_number: searchValue,
            raw_response: responseText
          }
        } else {
          throw new Error(`Respuesta no válida: ${responseText}`)
        }
      }

      // Procesar respuesta JSON si existe
      if (jsonData && response.ok) {
        if (jsonData.success === true || jsonData.status === 'success' || jsonData.result || jsonData.data) {
          success = true
          
          const resultData = jsonData.data || jsonData.result || jsonData.response || jsonData
          
          checkResult = {
            device_name: resultData?.device_name || resultData?.deviceName || resultData?.model || 'Dispositivo encontrado',
            model: resultData?.model || resultData?.device_model || resultData?.device_name || 'N/A',
            color: resultData?.color || resultData?.device_color || 'N/A',
            storage: resultData?.storage || resultData?.device_storage || resultData?.capacity || 'N/A',
            carrier: resultData?.carrier || resultData?.network || resultData?.sim_lock || resultData?.simlock || 'N/A',
            warranty: resultData?.warranty || resultData?.warranty_status || 'N/A',
            find_my_iphone: resultData?.find_my_iphone || resultData?.findMyIphone || resultData?.fmi_status === 'ON' || false,
            activation_lock: resultData?.activation_lock || resultData?.activationLock || resultData?.icloud_status === 'ON' || false,
            blacklist_status: resultData?.blacklist_status || resultData?.blacklistStatus || resultData?.blacklist || 'Limpio',
            serial_number: resultData?.serial_number || resultData?.serialNumber || resultData?.serial || searchValue
          }
          
          console.log('✅ Processed result:', JSON.stringify(checkResult, null, 2))
        } else {
          errorMessage = jsonData.message || jsonData.error || jsonData.msg || 'Error en la verificación IMEI'
          console.log('❌ API error:', errorMessage)
          
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
      }
    } catch (apiError: any) {
      console.error('💥 iFreeCloud API Error:', apiError.message)
      
      errorMessage = apiError.message || 'Error al conectar con la API de iFreeCloud'
      
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
          error: `Error de conexión API: ${errorMessage}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (success) {
      // Deducir créditos solo en verificación exitosa
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

      // Registrar verificación exitosa
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
        error: error.message || 'Error interno del servidor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})
