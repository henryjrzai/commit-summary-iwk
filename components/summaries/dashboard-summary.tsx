"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SummaryStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

type SummaryRow = {
  id: string;
  dateLabel: string;
  totalProjects: number;
  totalCommits: number;
  status: SummaryStatus;
  createdAt: string;
};

type SummaryListResponse = {
  success: boolean;
  message?: string;
  data?: Array<{
    id: string;
    dateLabel: string;
    totalProjects: number;
    totalCommits: number;
    status: SummaryStatus;
    createdAt: string;
  }>;
};

type GenerateSummaryResponse = {
  success: boolean;
  message?: string;
  summaryId?: string;
  totalCommits?: number;
  totalProjects?: number;
};

type LlmOption = {
  label: string;
  provider: "gemini" | "openrouter";
  model: string;
};

const llmOptions: LlmOption[] = [
  {
    label: "Gemini 2.5 Flash Lite",
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
  },
  {
    label: "OpenRouter MiniMax M2.5 (Free)",
    provider: "openrouter",
    model: "minimax/minimax-m2.5:free",
  },
];

type SummaryDetailResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    title: string;
    dateLabel: string;
    summaryHtml: string;
    totalCommits: number;
    totalProjects: number;
    status: SummaryStatus;
    createdAt: string;
  };
};

function statusVariant(status: SummaryStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "PROCESSING") return "secondary";
  if (status === "FAILED") return "destructive";
  return "outline";
}

function statusLabel(status: SummaryStatus) {
  if (status === "COMPLETED") return "Completed";
  if (status === "PROCESSING") return "Processing";
  if (status === "FAILED") return "Failed";
  return "Pending";
}

export function DashboardSummary() {
  const [isLoading, setIsLoading] = useState(true);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedLlm, setSelectedLlm] = useState<string>(llmOptions[0].model);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<SummaryDetailResponse["data"] | null>(
    null,
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  async function loadSummaries(showLoading = true) {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const response = await fetch("/api/summaries", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as SummaryListResponse;

      if (!response.ok || !payload.success) {
        setSummaries([]);
        return;
      }

      const mapped: SummaryRow[] = (payload.data ?? []).map((item) => ({
        id: item.id,
        dateLabel: item.dateLabel,
        totalProjects: item.totalProjects,
        totalCommits: item.totalCommits,
        status: item.status,
        createdAt: new Date(item.createdAt).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour12: false,
        }),
      }));

      setSummaries(mapped);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      await loadSummaries(false);
    };
    void bootstrap();
  }, []);

  const isDateInvalid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return endDate < startDate;
  }, [startDate, endDate]);

  async function handleGenerate() {
    setFormError(null);

    if (!startDate || !endDate) {
      setFormError("Tanggal mulai dan tanggal selesai wajib diisi.");
      return;
    }

    if (isDateInvalid) {
      setFormError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }

    const selectedOption = llmOptions.find((item) => item.model === selectedLlm);
    if (!selectedOption) {
      setFormError("Model LLM tidak valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/summaries/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          llmProvider: selectedOption.provider,
          llmModel: selectedOption.model,
        }),
      });

      const payload = (await response.json()) as GenerateSummaryResponse;

      if (!response.ok || !payload.success) {
        setFormError(payload.message ?? "Gagal membuat summary.");
        return;
      }

      setDialogOpen(false);
      setStartDate("");
      setEndDate("");
      await loadSummaries();
    } catch {
      setFormError("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleViewDetail(summaryId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedSummary(null);

    try {
      const response = await fetch(`/api/summaries/${summaryId}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as SummaryDetailResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setDetailError(payload.message ?? "Gagal memuat detail summary.");
        return;
      }

      setSelectedSummary(payload.data);
    } catch {
      setDetailError("Terjadi kesalahan saat mengambil detail summary.");
    } finally {
      setDetailLoading(false);
    }
  }

  const isExportDateInvalid = useMemo(() => {
    if (!exportStartDate || !exportEndDate) return false;
    return exportEndDate < exportStartDate;
  }, [exportStartDate, exportEndDate]);

  async function handleExport() {
    setExportError(null);

    if (!exportStartDate || !exportEndDate) {
      setExportError("Tanggal mulai dan tanggal selesai wajib diisi.");
      return;
    }
    if (isExportDateInvalid) {
      setExportError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }

    setExportLoading(true);
    try {
      const query = new URLSearchParams({
        startDate: exportStartDate,
        endDate: exportEndDate,
      });
      const response = await fetch(`/api/summaries/export?${query.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        let message = "Gagal export summary.";
        try {
          const payload = (await response.json()) as { message?: string };
          if (payload.message) message = payload.message;
        } catch {
          // Ignore non-JSON error body.
        }
        setExportError(message);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `summary-${exportStartDate}_to_${exportEndDate}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setExportOpen(false);
      setExportStartDate("");
      setExportEndDate("");
    } catch {
      setExportError("Terjadi kesalahan saat export.");
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Summary Harian</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Buat Summary</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Summary</DialogTitle>
                <DialogDescription>
                  Pilih rentang tanggal untuk membuat summary berdasarkan commit
                  GitHub.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="llm-model">Model LLM</Label>
                  <Select value={selectedLlm} onValueChange={setSelectedLlm}>
                    <SelectTrigger id="llm-model" className="w-full">
                      <SelectValue placeholder="Pilih model LLM" />
                    </SelectTrigger>
                    <SelectContent>
                      {llmOptions.map((option) => (
                        <SelectItem key={option.model} value={option.model}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date">Tanggal Mulai</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">Tanggal Selesai</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>

                {isDateInvalid ? (
                  <p className="text-sm text-destructive">
                    Tanggal selesai tidak boleh sebelum tanggal mulai.
                  </p>
                ) : null}

                {formError ? (
                  <p className="text-sm text-destructive">{formError}</p>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Tutup
                </Button>
                <Button onClick={handleGenerate} disabled={isSubmitting}>
                  {isSubmitting ? "Generating..." : "Generate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Export Excel</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Summary</DialogTitle>
                <DialogDescription>
                  Pilih rentang tanggal untuk export summary dari database ke file
                  Excel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-start-date">Tanggal Mulai</Label>
                  <Input
                    id="export-start-date"
                    type="date"
                    value={exportStartDate}
                    onChange={(event) => setExportStartDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-end-date">Tanggal Selesai</Label>
                  <Input
                    id="export-end-date"
                    type="date"
                    value={exportEndDate}
                    onChange={(event) => setExportEndDate(event.target.value)}
                  />
                </div>
                {isExportDateInvalid ? (
                  <p className="text-sm text-destructive">
                    Tanggal selesai tidak boleh sebelum tanggal mulai.
                  </p>
                ) : null}
                {exportError ? (
                  <p className="text-sm text-destructive">{exportError}</p>
                ) : null}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={exportLoading}
                  onClick={() => setExportOpen(false)}
                >
                  Tutup
                </Button>
                <Button onClick={handleExport} disabled={exportLoading}>
                  {exportLoading ? "Exporting..." : "Export"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Detail Summary</DialogTitle>
                <DialogDescription>
                  Ringkasan aktivitas kerja berdasarkan commit pada rentang tanggal
                  yang dipilih.
                </DialogDescription>
              </DialogHeader>

              {detailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : null}

              {!detailLoading && detailError ? (
                <p className="text-sm text-destructive">{detailError}</p>
              ) : null}

              {!detailLoading && !detailError && selectedSummary ? (
                <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <p>Total Project: {selectedSummary.totalProjects}</p>
                    <p>Total Commit: {selectedSummary.totalCommits}</p>
                    <p>Status: {statusLabel(selectedSummary.status)}</p>
                  </div>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: selectedSummary.summaryHtml }}
                  />
                </div>
              ) : null}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Tutup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal Summary</TableHead>
                <TableHead>Total Project</TableHead>
                <TableHead>Total Commit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Belum ada summary.
                  </TableCell>
                </TableRow>
              ) : (
                summaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell>{summary.dateLabel}</TableCell>
                    <TableCell>{summary.totalProjects}</TableCell>
                    <TableCell>{summary.totalCommits}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(summary.status)}>
                        {statusLabel(summary.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{summary.createdAt}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleViewDetail(summary.id)}
                      >
                        Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
