import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchGithubCommits, type NormalizedGithubCommit } from "@/lib/github/fetch-commits";
import { generateWorkSummaryHtml } from "@/lib/llm/generate-summary";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

const generateSummarySchema = z
  .object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    llmProvider: z.enum(["gemini", "openrouter"]).optional(),
    llmModel: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);

    if (Number.isNaN(start.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate tidak valid.",
        path: ["startDate"],
      });
    }

    if (Number.isNaN(end.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate tidak valid.",
        path: ["endDate"],
      });
    }

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate tidak boleh sebelum startDate.",
        path: ["endDate"],
      });
    }
  });

function buildUtcDayRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);
  return { start, end };
}

function formatDateLabel(startDate: Date, endDate: Date) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  if (startDate.toDateString() === endDate.toDateString()) {
    return formatter.format(startDate);
  }

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function uniqueCommits(commits: NormalizedGithubCommit[]) {
  const seen = new Set<string>();
  const result: NormalizedGithubCommit[] = [];

  for (const commit of commits) {
    const key = `${commit.owner}/${commit.repo}/${commit.sha}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(commit);
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User belum login." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = generateSummarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Input tanggal tidak valid.",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { startDate, endDate, llmProvider, llmModel } = parsed.data;
    const { start, end } = buildUtcDayRange(startDate, endDate);
    const since = start.toISOString();
    const until = end.toISOString();

    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email ?? null,
      },
      create: {
        id: user.id,
        email: user.email ?? null,
        name: user.user_metadata?.name ?? null,
      },
    });

    const repositories = await prisma.userRepository.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        owner: true,
        repo: true,
        projectName: true,
      },
    });

    if (repositories.length === 0) {
      return NextResponse.json(
        { success: false, message: "Repository aktif tidak ditemukan." },
        { status: 400 },
      );
    }

    const githubUsername =
      process.env.GITHUB_USERNAME ??
      user.user_metadata?.user_name ??
      user.user_metadata?.preferred_username;

    if (!githubUsername) {
      return NextResponse.json(
        {
          success: false,
          message: "GITHUB_USERNAME belum dikonfigurasi di server.",
        },
        { status: 400 },
      );
    }

    const fetchedPerRepo = await Promise.all(
      repositories.map(async (repository) => {
        const commits = await fetchGithubCommits({
          owner: repository.owner,
          repo: repository.repo,
          username: githubUsername,
          since,
          until,
        });

        return commits.map((commit) => ({
          ...commit,
          projectName: repository.projectName,
        }));
      }),
    );

    const flatCommits = uniqueCommits(fetchedPerRepo.flat());

    if (flatCommits.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada commit pada rentang tanggal yang dipilih.",
        },
        { status: 200 },
      );
    }

    await prisma.commitLog.createMany({
      data: flatCommits.map((commit) => ({
        userId: user.id,
        owner: commit.owner,
        repo: commit.repo,
        projectName: commit.projectName,
        sha: commit.sha,
        message: commit.message,
        authorName: commit.authorName,
        authorEmail: commit.authorEmail,
        authorLogin: commit.authorLogin,
        committedAt: commit.committedAt,
        htmlUrl: commit.htmlUrl,
      })),
      skipDuplicates: true,
    });

    const dateLabel = formatDateLabel(start, end);
    const summaryHtml = await generateWorkSummaryHtml({
      dateLabel,
      commits: flatCommits,
      llmSelection:
        llmProvider && llmModel
          ? {
              provider: llmProvider,
              model: llmModel,
            }
          : undefined,
    });

    const totalProjects = new Set(flatCommits.map((commit) => `${commit.owner}/${commit.repo}`))
      .size;

    const summary = await prisma.workSummary.create({
      data: {
        userId: user.id,
        startDate: start,
        endDate: end,
        dateLabel,
        title: `Summary ${dateLabel}`,
        summaryHtml,
        summaryText: null,
        totalCommits: flatCommits.length,
        totalProjects,
        llmProvider: llmProvider ?? process.env.LLM_PROVIDER ?? "gemini",
      },
      select: {
        id: true,
        totalCommits: true,
        totalProjects: true,
      },
    });

    await prisma.$transaction(
      flatCommits.map((commit) =>
        prisma.commitLog.update({
          where: {
            owner_repo_sha: {
              owner: commit.owner,
              repo: commit.repo,
              sha: commit.sha,
            },
          },
          data: {
            summaryId: summary.id,
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      summaryId: summary.id,
      totalCommits: summary.totalCommits,
      totalProjects: summary.totalProjects,
    });
  } catch (error) {
    console.error("POST /api/summaries/generate error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat summary. Silakan coba lagi.",
      },
      { status: 500 },
    );
  }
}
