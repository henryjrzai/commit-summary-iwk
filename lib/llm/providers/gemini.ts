type GeminiGenerateSummaryInput = {
  prompt: string;
  apiKey: string;
  model: string;
};

type GeminiCandidatePart = {
  text?: string;
};

type GeminiCandidateContent = {
  parts?: GeminiCandidatePart[];
};

type GeminiCandidate = {
  content?: GeminiCandidateContent;
};

type GeminiGenerateContentResponse = {
  candidates?: GeminiCandidate[];
};

export async function generateWithGemini({
  prompt,
  apiKey,
  model,
}: GeminiGenerateSummaryInput): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Gemini request failed (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw new Error("Gemini returned empty summary output.");
  }

  return text;
}
