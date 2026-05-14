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

const mockSummaries: SummaryRow[] = [
  {
    id: "sum-1",
    dateLabel: "Rabu, 13 Mei 2026",
    totalProjects: 2,
    totalCommits: 9,
    status: "COMPLETED",
    createdAt: "2026-05-13 18:15",
  },
  {
    id: "sum-2",
    dateLabel: "Selasa, 12 Mei 2026",
    totalProjects: 1,
    totalCommits: 4,
    status: "PROCESSING",
    createdAt: "2026-05-12 17:04",
  },
];

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSummaries(mockSummaries);
      setIsLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  const isDateInvalid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return endDate < startDate;
  }, [startDate, endDate]);

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
                  Pilih rentang tanggal untuk membuat summary. Proses generate API
                  belum diaktifkan pada tahap ini.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
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
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Tutup
                </Button>
                <Button disabled>
                  Generate (Segera)
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
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

