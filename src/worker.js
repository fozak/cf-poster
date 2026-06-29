export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (request.method === 'GET' && !key) {
      const prefix = url.searchParams.get('prefix') ?? '';
      const list = await env.MY_BUCKET.list({ prefix });
      return Response.json(list.objects.map(o => o.key), { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      const obj = await env.MY_BUCKET.get(key);
      if (!obj) return new Response('Not Found', { status: 404, headers: corsHeaders });
      return new Response(obj.body, {
        headers: { ...corsHeaders, 'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream' }
      });
    }

    if (request.method === 'PUT') {
      await env.MY_BUCKET.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get('Content-Type') }
      });
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    if (request.method === 'DELETE') {
      await env.MY_BUCKET.delete(key);
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    if (request.method === 'HEAD') {
      const obj = await env.MY_BUCKET.head(key);
      if (!obj) return new Response(null, { status: 404 });
      return new Response(null, {
        headers: { ...corsHeaders, 'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream' }
      });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }
};
