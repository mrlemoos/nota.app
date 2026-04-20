/**
 * Semantic search uses **OpenAI-compatible** `POST /v1/embeddings`.
 *
 * xAI does not document a public standalone embeddings endpoint for pushing vectors
 * into your own database (their Collections product embeds documents on their side).
 * Use any provider with the same request/response shape (OpenAI, Voyage, many hosts).
 */

const DEFAULT_BASE = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'text-embedding-3-small';

export function embeddingDimensionsExpected(): number {
  const raw = process.env.NOTA_SEMANTIC_EMBEDDINGS_DIMENSIONS?.trim();
  if (!raw) {
    return 1536;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      'nota-server: NOTA_SEMANTIC_EMBEDDINGS_DIMENSIONS must be a positive integer',
    );
  }
  return n;
}

export function embeddingModel(): string {
  const m = process.env.NOTA_SEMANTIC_EMBEDDINGS_MODEL?.trim();
  return m && m.length > 0 ? m : DEFAULT_MODEL;
}

function requireEmbeddingsApiKey(): string {
  const k = process.env.NOTA_SEMANTIC_EMBEDDINGS_API_KEY?.trim();
  if (!k) {
    throw new Error(
      'nota-server: set NOTA_SEMANTIC_EMBEDDINGS_API_KEY for semantic search (OpenAI-compatible embeddings API)',
    );
  }
  return k;
}

function embeddingsBaseUrl(): string {
  const raw = process.env.NOTA_SEMANTIC_EMBEDDINGS_API_BASE?.trim();
  const b = raw && raw.length > 0 ? raw : DEFAULT_BASE;
  return b.replace(/\/$/, '');
}

/** OpenAI-compatible embeddings response shape. */
type EmbeddingsOk = {
  data: Array<{ embedding: number[]; index?: number }>;
};

export async function embedTextsForSemanticSearch(
  inputs: string[],
): Promise<number[][]> {
  if (inputs.length === 0) {
    return [];
  }

  const model = embeddingModel();
  const apiKey = requireEmbeddingsApiKey();
  const expectedDim = embeddingDimensionsExpected();

  const res = await fetch(`${embeddingsBaseUrl()}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: inputs }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`semantic embeddings failed: ${res.status} ${errText}`);
  }

  const json = (await res.json()) as EmbeddingsOk;
  const rows = [...(json.data ?? [])].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  const vectors = rows.map((r) => r.embedding);

  for (const v of vectors) {
    if (v.length !== expectedDim) {
      throw new Error(
        `nota-server: embedding length ${v.length} does not match NOTA_SEMANTIC_EMBEDDINGS_DIMENSIONS=${expectedDim}; align migration vector(N) and env.`,
      );
    }
  }

  return vectors;
}

export async function embedTextForSemanticSearch(text: string): Promise<number[]> {
  const [v] = await embedTextsForSemanticSearch([text]);
  if (!v) {
    throw new Error('nota-server: empty embedding response');
  }
  return v;
}
