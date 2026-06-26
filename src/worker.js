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
    const contentType = request.headers.get("Content-Type") || "";

    // ── POST ──────────────────────────────────────────────
    if (request.method === "POST") {

      // binary/file upload → R2
      if (contentType.includes("multipart/form-data") || contentType.includes("application/octet-stream")) {
        const formData = await request.formData();
        const file = formData.get("file");
        await env.R2.put(path, file.stream(), {
          httpMetadata: { contentType: file.type }
        });
        return Response.json({
          key: path,
          url: `https://pub-81b8dd1189104563a1807c5d629c594c.r2.dev/${path}`
        }, { headers: corsHeaders });
      }

      // JSON with html → KV (existing behavior)
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

    // ── GET ───────────────────────────────────────────────

    // try R2 first
    const r2obj = await env.R2.get(path);
    if (r2obj) {
      const ct = r2obj.httpMetadata?.contentType || "application/octet-stream";
      return new Response(r2obj.body, {
        headers: { ...corsHeaders, "Content-Type": ct }
      });
    }

    // fall back to KV
    const html = await env.KV.get(path);
    if (!html) return new Response("not found", { status: 404, headers: corsHeaders });
    return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html" } });
  }
};
