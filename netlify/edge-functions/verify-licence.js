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
    const { licence_key, decrement } = await request.json();

    if (!licence_key) {
      return new Response(JSON.stringify({ success: false, message: 'No licence key provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = Deno.env.get('GUMROAD_ACCESS_TOKEN');
    
    // Only increment Gumroad's counter when actually using a credit (decrement=true)
    const incrementUses = decrement ? 'true' : 'false';

    // Try single use product
    const res1 = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_id: 'HYQ5gAf0U9djB2V9ijUrdw==',
        product_permalink: 'cwqcy',
        license_key: licence_key,
        access_token: token,
        increment_uses_count: incrementUses
      })
    });

    const data1 = await res1.json();

    if (data1.success) {
      const usesCount = data1.purchase?.uses_count || 0;
      const maxUses = 1;
      const remaining = Math.max(0, maxUses - usesCount);
      
      if (decrement && remaining <= 0) {
        return new Response(JSON.stringify({
          success: false,
          message: 'This single use licence has already been used. Please purchase a new one.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        uses: remaining || maxUses,
        type: 'single',
        product: 'Single use'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try bundle product
    const res2 = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        product_id: 'oLrZu9bgRifmPXzeymAkkg==',
        product_permalink: 'dxvtrb',
        license_key: licence_key,
        access_token: token,
        increment_uses_count: incrementUses
      })
    });

    const data2 = await res2.json();

    if (data2.success) {
      const usesCount = data2.purchase?.uses_count || 0;
      const maxUses = 10;
      const remaining = Math.max(0, maxUses - usesCount);

      if (decrement && remaining <= 0) {
        return new Response(JSON.stringify({
          success: false,
          message: 'You have used all 10 credits on this licence. Please purchase a new one.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        uses: remaining || maxUses,
        type: 'bundle',
        product: '10 uses bundle'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid licence key. Please check your email and try again.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Verification failed: ' + err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/verify-licence' };
