// Netlify Edge Function — proxy para a API do Gemini (Google).
// Ver claude-proxy.js para explicação de porquê Edge Function (não Function normal).

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: { message: "Método não permitido." } }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            "GEMINI_API_KEY não está configurada nas variáveis de ambiente do Netlify.",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Corpo do pedido inválido." } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const model = body.__geminiModel || "gemini-3.5-flash";
  delete body.__geminiModel;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: { message: "Erro ao contactar o Gemini: " + err.message },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/api/gemini-proxy" };
