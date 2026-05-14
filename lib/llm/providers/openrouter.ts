type OpenRouterGenerateSummaryInput = {
  prompt: string;
  apiKey: string;
  model: string;
};

type OpenRouterMessage = {
  content?: string;
};

type OpenRouterChoice = {
  message?: OpenRouterMessage;
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
};

export async function generateWithOpenRouter({
  prompt,
  apiKey,
  model,
}: OpenRouterGenerateSummaryInput): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenRouter request failed (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const data = (await response.json()) as OpenRouterResponse;
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("OpenRouter returned empty summary output.");
  }

  return text;
}

