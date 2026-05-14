type GeminiGenerateSummaryInput = {
  prompt: string;
  apiKey: string;
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
}: GeminiGenerateSummaryInput): Promise<string> {
  // const model = "gemini-2.0-flash";
  const model = "gemini-2.5-flash-lite";
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
  console.log("Gemini API response status:", response.status, response.statusText);

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
