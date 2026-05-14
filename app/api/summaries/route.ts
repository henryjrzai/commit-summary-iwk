import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
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

    const summaries = await prisma.workSummary.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        dateLabel: true,
        totalProjects: true,
        totalCommits: true,
        status: true,
        createdAt: true,
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    console.error("GET /api/summaries error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar summary." },
      { status: 500 },
    );
  }
}

