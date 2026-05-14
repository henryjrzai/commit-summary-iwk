import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

function parseRange(searchParams: URLSearchParams) {
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return { error: "startDate dan endDate wajib diisi." };
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Format tanggal tidak valid." };
  }

  if (end < start) {
    return { error: "endDate tidak boleh sebelum startDate." };
  }

  return { start, end, startDate, endDate };
}

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h2|h3|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSpreadsheetXml(rows: Array<Record<string, string | number>>) {
  const headers = [
    "Tanggal Summary",
    "Total Project",
    "Total Commit",
    "Status",
    "Dibuat",
    "Isi Summary",
  ];

  const headerXml = headers
    .map(
      (header) =>
        `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`,
    )
    .join("");

  const rowXml = rows
    .map((row) => {
      return `<Row>
        <Cell><Data ss:Type="String">${escapeXml(String(row.dateLabel ?? ""))}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(row.totalProjects ?? 0)}</Data></Cell>
        <Cell><Data ss:Type="Number">${Number(row.totalCommits ?? 0)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(String(row.status ?? ""))}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(String(row.createdAt ?? ""))}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(String(row.summaryText ?? ""))}</Data></Cell>
      </Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Summary">
  <Table>
   <Row>${headerXml}</Row>
   ${rowXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const parsed = parseRange(url.searchParams);
    if ("error" in parsed) {
      return NextResponse.json(
        { success: false, message: parsed.error },
        { status: 400 },
      );
    }

    const summaries = await prisma.workSummary.findMany({
      where: {
        userId: user.id,
        startDate: {
          gte: parsed.start,
        },
        endDate: {
          lte: parsed.end,
        },
      },
      orderBy: {
        startDate: "asc",
      },
      select: {
        dateLabel: true,
        totalProjects: true,
        totalCommits: true,
        status: true,
        createdAt: true,
        summaryHtml: true,
        summaryText: true,
      },
    });

    if (summaries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada summary pada rentang tanggal tersebut.",
        },
        { status: 404 },
      );
    }

    const rows = summaries.map((item) => ({
      dateLabel: item.dateLabel,
      totalProjects: item.totalProjects,
      totalCommits: item.totalCommits,
      status: item.status,
      createdAt: new Date(item.createdAt).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour12: false,
      }),
      summaryText: item.summaryText ?? stripHtml(item.summaryHtml),
    }));

    const xml = buildSpreadsheetXml(rows);
    const filename = `summary-${parsed.startDate}_to_${parsed.endDate}.xls`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/summaries/export error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal export summary." },
      { status: 500 },
    );
  }
}

