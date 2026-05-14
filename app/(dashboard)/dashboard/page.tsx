import { redirect } from "next/navigation";

import { DashboardSummary } from "@/components/summaries/dashboard-summary";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="container mx-auto min-h-screen max-w-5xl px-4 py-10">
      <DashboardSummary />
    </main>
  );
}
