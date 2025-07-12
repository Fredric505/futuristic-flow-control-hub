
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
    const { username, apiKey, apiUrl } = await req.json()

    if (!username || !apiKey || !apiUrl) {
      throw new Error('Missing required parameters')
    }

    // Test the connection with a dummy IMEI check
    const response = await fetch(`${apiUrl}/api/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        username: username
      })
    })

    if (!response.ok) {
      throw new Error(`Connection failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Connection successful',
        data: data
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error testing connection:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || 'Connection test failed'
      }),
      { 
        status: 200, // Return 200 to handle error gracefully in frontend
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
