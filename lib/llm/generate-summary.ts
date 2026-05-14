import type { NormalizedGithubCommit } from "@/lib/github/fetch-commits";
import { sanitizeSummaryHtml } from "@/lib/sanitize-html";

import { generateWithGemini } from "./providers/gemini";

type GenerateWorkSummaryInput = {
  dateLabel: string;
  commits: NormalizedGithubCommit[];
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
}: GenerateWorkSummaryInput): Promise<string> {
  if (commits.length === 0) {
    throw new Error("Cannot generate summary from empty commit list.");
  }

  const provider = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();

  if (provider !== "gemini") {
    throw new Error(
      `Unsupported LLM_PROVIDER "${provider}". Currently only "gemini" is supported.`,
    );
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY on server environment.");
  }

  const prompt = buildPrompt({ dateLabel, commits });
  const rawHtml = await generateWithGemini({ prompt, apiKey: geminiApiKey });
  const normalizedHtml = unwrapHtmlCodeFence(rawHtml);
  return sanitizeSummaryHtml(normalizedHtml);
}
