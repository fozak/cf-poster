export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    if (request.method === "POST") {
      const filename = path.split("/").pop();
      const dir = path.split("/").slice(0, -1).join("/");
      const prefix = path + "/";
      const existing = await env.KV.list({ prefix });
      const counter = String(existing.keys.length + 1).padStart(2, "0");
      const key = `${dir}/${counter}-${filename}`;
      const { html } = await request.json();
      await env.KV.put(key, html);
      return Response.json({ key, url: url.origin + "/" + key }, { headers: corsHeaders });
    }

    const html = await env.KV.get(path);
    if (!html) return new Response("not found", { status: 404, headers: corsHeaders });
    return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html" } });
  }
};