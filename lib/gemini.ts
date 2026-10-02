import { CATEGORY_LIST, resolveCategory, type CategoryId } from "./categories";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// Segundo intento si el primero está saturado (503), con límite (429) o tarda demasiado.
const FALLBACK_MODEL = "gemini-3.1-flash-lite";
const TIMEOUT_MS = 6000;

/**
 * Pregunta a Gemini (API REST, sin SDK) en qué categoría encaja un comercio.
 * Nunca lanza errores: si algo falla o la respuesta no es una categoría válida, devuelve null.
 */
export async function classifyWithGemini(merchant: string, card?: string | null): Promise<CategoryId | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[gemini] GEMINI_API_KEY no está configurada");
    return null;
  }
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const list = CATEGORY_LIST.map((c) => `- ${c.id}: ${c.name}`).join("\n");
  const prompt =
    `Clasifica un pago hecho en España en UNA de estas categorías:\n${list}\n\n` +
    `Comercio: "${merchant.slice(0, 120)}"` +
    (card ? `\nTarjeta: "${card.slice(0, 60)}"` : "") +
    `\n\nNotas: "padel" es solo pádel (pistas, clubs, Playtomic); otros deportes van en "deporte". ` +
    `Comida a domicilio va en "restaurantes".` +
    `\nResponde solo con el id de la categoría. Si no lo tienes claro, responde "otros".`;

  for (const m of model === FALLBACK_MODEL ? [model] : [model, FALLBACK_MODEL]) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 50,
            // Obliga a responder {"categoria": "<una de la lista>"}
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              properties: { categoria: { type: "string", enum: CATEGORY_LIST.map((c) => c.id) } },
              required: ["categoria"],
            },
          },
        }),
      });
      if (!res.ok) {
        console.error(`[gemini] ${m} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        if (res.status === 429 || res.status >= 500) continue; // saturado: probamos el otro modelo
        return null; // clave inválida, modelo inexistente...: no tiene sentido reintentar
      }
      const data = await res.json();
      const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
      return parseAnswer(text);
    } catch (err) {
      console.error(`[gemini] ${m} error:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/** Respuesta rara o vacía → null (y se usará "otros"). */
function parseAnswer(text: string): CategoryId | null {
  try {
    return resolveCategory(JSON.parse(text)?.categoria);
  } catch {
    return null;
  }
}
