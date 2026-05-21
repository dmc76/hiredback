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
    const body = await request.json();
    body.stream = true;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!upstream.ok) {
      const error = await upstream.text();
      return new Response(JSON.stringify({ error }), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Streaming response back to client ─────────────────────
    // Write a byte immediately so Netlify doesn't time out the connection,
    // then write the final JSON result once the Anthropic stream is complete.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Write a leading space immediately — keeps the connection alive
    writer.write(encoder.encode(' '));

    // Process Anthropic stream in background
    (async () => {
      try {
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullText += parsed.delta.text;
              }
            } catch (e) {}
          }
        }

        // Process remaining buffer
        if (buffer.trim().startsWith('data: ')) {
          const data = buffer.trim().slice(6).trim();
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
            }
          } catch (e) {}
        }

        // Find JSON boundaries
        let clean = fullText.replace(/```json|```/g, '').trim();
        const objStart = clean.indexOf('{');
        const arrStart = clean.indexOf('[');
        const isArray = arrStart !== -1 && (objStart === -1 || arrStart < objStart);
        const start = isArray ? arrStart : objStart;
        const end = isArray ? clean.lastIndexOf(']') : clean.lastIndexOf('}');

        if (start === -1 || end === -1) {
          writer.write(encoder.encode(JSON.stringify({ error: 'No JSON found in response' })));
          writer.close();
          return;
        }

        clean = clean.slice(start, end + 1);

        // Robust JSON sanitisation
        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch(e) {
          if (isArray) {
            writer.write(encoder.encode(JSON.stringify({ result: '[]' })));
            writer.close();
            return;
          }
          try {
            const atsBeforeMatch = clean.match(/"ats_score_before"\s*:\s*(\d+)/);
            const atsAfterMatch = clean.match(/"ats_score_after"\s*:\s*(\d+)/);
            const diagMatch = clean.match(/"diagnostic"\s*:\s*(\[[\s\S]*?\])\s*,\s*"rewritten_cv"/);
            const cvMatch = clean.match(/"rewritten_cv"\s*:\s*"([\s\S]*?)"\s*\}?\s*$/);

            if (!atsBeforeMatch || !atsAfterMatch || !cvMatch) {
              writer.write(encoder.encode(JSON.stringify({ error: 'Could not parse response. Please try again.' })));
              writer.close();
              return;
            }

            let cvText = cvMatch[1]
              .replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t')
              .replace(/[\x00-\x1F\x7F]/g, '');

            let diagnostic = [];
            if (diagMatch) {
              try { diagnostic = JSON.parse(diagMatch[1]); } catch(de) { diagnostic = []; }
            }

            parsed = {
              ats_score_before: parseInt(atsBeforeMatch[1]),
              ats_score_after: parseInt(atsAfterMatch[1]),
              diagnostic,
              rewritten_cv: cvText
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
            };
          } catch(repairError) {
            writer.write(encoder.encode(JSON.stringify({ error: 'Response could not be processed. Please try again.' })));
            writer.close();
            return;
          }
        }

        if (!isArray && (!parsed.rewritten_cv || !Array.isArray(parsed.diagnostic))) {
          writer.write(encoder.encode(JSON.stringify({ error: 'Incomplete response received. Please try again.' })));
          writer.close();
          return;
        }

        writer.write(encoder.encode(JSON.stringify({ result: JSON.stringify(parsed) })));
        writer.close();

      } catch(err) {
        try {
          writer.write(encoder.encode(JSON.stringify({ error: err.message })));
          writer.close();
        } catch(e) {}
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/api/analyse' };
