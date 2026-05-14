import type { NormalizedGithubCommit } from "@/lib/github/fetch-commits";
import { sanitizeSummaryHtml } from "@/lib/sanitize-html";

import { generateWithGemini } from "./providers/gemini";
import { generateWithOpenRouter } from "./providers/openrouter";

type GenerateWorkSummaryInput = {
  dateLabel: string;
  commits: NormalizedGithubCommit[];
  llmSelection?: LlmSelection;
};

export type LlmSelection = {
  provider: "gemini" | "openrouter";
  model: string;
};

function buildPrompt({ dateLabel, commits }: GenerateWorkSummaryInput) {
  const groupedByProject = commits.reduce<Record<string, NormalizedGithubCommit[]>>(
    (accumulator, commit) => {
      const projectKey = `${commit.owner}/${commit.repo}`;
      if (!accumulator[projectKey]) {
        accumulator[projectKey] = [];
      }
      accumulator[projectKey].push(commit);
      return accumulator;
    },
    {},
  );

  const commitsJson = JSON.stringify(groupedByProject, null, 2);

  return `Kamu adalah asisten yang membantu developer merangkum aktivitas coding harian untuk laporan ke project manager.

  Tugas kamu:
  Ubah daftar commit GitHub berikut menjadi summary pekerjaan dalam Bahasa Indonesia yang profesional, ringkas, dan mudah dipahami.

  Aturan:
  1. Jangan menerjemahkan commit secara kaku.
  2. Ubah menjadi kalimat kegiatan manusiawi.
  3. Jangan menambahkan pekerjaan yang tidak ada di commit.
  4. Kelompokkan berdasarkan nama project.
  5. Gunakan status "- done" untuk semua commit yang berasal dari GitHub.
  6. Jika ada commit yang duplikat atau maknanya sama, gabungkan menjadi satu poin.
  7. Jangan menampilkan SHA commit kecuali diminta.
  8. Jangan menyebut "commit" dalam hasil akhir kecuali benar-benar perlu.
  9. Hasil akhir harus berupa HTML yang rapi.
  10. Gunakan tag HTML sederhana saja: h2, h3, ul, li, p, strong.
  11. Jangan gunakan script, style inline berbahaya, iframe, atau event handler HTML.

  Tanggal laporan:
  ${dateLabel}

  Data commit:
  ${commitsJson}

  Format output HTML:
  <h2>${dateLabel}</h2>
  <h3>{{projectName}}</h3>
  <ul>
    <li>Mengembangkan ... - done</li>
    <li>Memperbaiki ... - done</li>
</ul>`;
}

function unwrapHtmlCodeFence(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  return trimmed;
}

export async function generateWorkSummaryHtml({
  dateLabel,
  commits,
  llmSelection,
}: GenerateWorkSummaryInput): Promise<string> {
  if (commits.length === 0) {
    throw new Error("Cannot generate summary from empty commit list.");
  }

  const prompt = buildPrompt({ dateLabel, commits });
  const defaultProvider = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  const provider = llmSelection?.provider ?? (defaultProvider as "gemini" | "openrouter");

  let rawHtml = "";
  if (provider === "gemini") {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY on server environment.");
    }
    const geminiModel = llmSelection?.model || "gemini-2.5-flash-lite";
    rawHtml = await generateWithGemini({
      prompt,
      apiKey: geminiApiKey,
      model: geminiModel,
    });
  } else if (provider === "openrouter") {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      throw new Error("Missing OPENROUTER_API_KEY on server environment.");
    }
    const selectedModel = llmSelection?.model;
    const openRouterModel =
      !selectedModel || selectedModel === "openrouter/free"
        ? process.env.OPENROUTER_MODEL_FREE || "minimax/minimax-m2.5:free"
        : selectedModel;
    rawHtml = await generateWithOpenRouter({
      prompt,
      apiKey: openRouterApiKey,
      model: openRouterModel,
    });
  } else {
    throw new Error(`Unsupported LLM provider "${provider}".`);
  }

  const normalizedHtml = unwrapHtmlCodeFence(rawHtml);
  return sanitizeSummaryHtml(normalizedHtml);
}

