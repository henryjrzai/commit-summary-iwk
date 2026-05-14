import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

const deleteSummariesSchema = z.object({
  summaryIds: z.array(z.string().min(1)).min(1),
});

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

export async function DELETE(request: Request) {
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

    const body = (await request.json()) as unknown;
    const validation = deleteSummariesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Data hapus tidak valid." },
        { status: 400 },
      );
    }

    const summaryIds = Array.from(new Set(validation.data.summaryIds));

    const deleteResult = await prisma.workSummary.deleteMany({
      where: {
        userId: user.id,
        id: { in: summaryIds },
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada summary yang berhasil dihapus.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error("DELETE /api/summaries error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus summary." },
      { status: 500 },
    );
  }
}
