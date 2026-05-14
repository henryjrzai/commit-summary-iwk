import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    const summary = await prisma.workSummary.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        dateLabel: true,
        summaryHtml: true,
        totalCommits: true,
        totalProjects: true,
        status: true,
        createdAt: true,
      },
    });

    if (!summary) {
      return NextResponse.json(
        { success: false, message: "Summary tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("GET /api/summaries/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail summary." },
      { status: 500 },
    );
  }
}

