// Netlify Edge Function — proxy para a API da Anthropic.
// Ao contrário de uma Function normal (limite de 10s), o tempo de espera
// pela resposta da Anthropic NÃO conta para o limite de execução de uma
// Edge Function — por isso é a escolha certa para pedidos de IA, que
// podem demorar mais de 10 segundos.

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: { message: "Método não permitido." } }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            "ANTHROPIC_API_KEY não está configurada nas variáveis de ambiente do Netlify.",
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

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  // O cliente pode pedir um cabeçalho "beta" opcional (ex.: suporte a PDFs)
  // através de um campo especial no corpo, que removemos antes de reenviar.
  if (body.__anthropicBeta) {
    headers["anthropic-beta"] = body.__anthropicBeta;
    delete body.__anthropicBeta;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
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
        error: { message: "Erro ao contactar a Anthropic: " + err.message },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/api/claude-proxy" };
