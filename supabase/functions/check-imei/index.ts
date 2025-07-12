
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
      serial_number: data.serial_number || 'N/A'
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
