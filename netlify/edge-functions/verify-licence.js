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
    const incrementUses = decrement ? 'true' : 'false';

    // All products to try
    const products = [
      { id: 'HYQ5gAf0U9djB2V9ijUrdw==', permalink: 'cwqcy', uses: 1, type: 'single', label: 'Single use' },
      { id: 'oLrZu9bgRifmPXzeymAkkg==', permalink: 'dxvtrb', uses: 10, type: 'bundle', label: '10 uses' },
      { id: 'nYbn7PJtYDc6AL1K-cpSkg==', permalink: 'hojdyr', uses: 25, type: 'bundle25', label: '25 uses' },
      { id: 'OihS1PjCKqDX0UqQJ-Ps0g==', permalink: 'sobsa', uses: 50, type: 'bundle50', label: '50 uses' }
    ];

    for (const product of products) {
      const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          product_id: product.id,
          product_permalink: product.permalink,
          license_key: licence_key,
          access_token: token,
          increment_uses_count: incrementUses
        })
      });

      const data = await res.json();

      if (data.success) {
        const usesCount = data.purchase?.uses_count || 0;
        const maxUses = product.uses;
        const remaining = Math.max(0, maxUses - usesCount);

        if (decrement && remaining <= 0) {
          return new Response(JSON.stringify({
            success: false,
            message: `You have used all ${maxUses} credits on this licence. Please purchase a new one.`
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          uses: remaining || maxUses,
          type: product.type,
          product: product.label
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
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
