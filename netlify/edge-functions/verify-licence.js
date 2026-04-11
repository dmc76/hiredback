export default async (request, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { licence_key } = await request.json();

    if (!licence_key) {
      return new Response(JSON.stringify({ success: false, message: 'No licence key provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = Deno.env.get('GUMROAD_ACCESS_TOKEN');

    // Verify licence key with Gumroad API
    const res = await fetch(`https://api.gumroad.com/v2/licenses/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_permalink: 'cwqcy', // single use
        license_key: licence_key,
        access_token: token,
        increment_uses_count: 'false'
      })
    });

    const data = await res.json();

    // If not found on single use, try bundle
    if (!data.success) {
      const res2 = await fetch(`https://api.gumroad.com/v2/licenses/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          product_permalink: 'dxvtrb', // 10 uses bundle
          license_key: licence_key,
          access_token: token,
          increment_uses_count: 'false'
        })
      });

      const data2 = await res2.json();

      if (!data2.success) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid licence key. Please check your email and try again.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Bundle key - 10 uses
      return new Response(JSON.stringify({
        success: true,
        uses: 10,
        type: 'bundle',
        product: '10 uses bundle'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Single use key
    return new Response(JSON.stringify({
      success: true,
      uses: 1,
      type: 'single',
      product: 'Single use'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Verification failed. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/verify-licence' };
