"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace("/dashboard");
      }
    }

    void checkSession();
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(
        "Login gagal. Periksa email dan password Anda, lalu coba lagi.",
      );
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="container mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage ? (
              <Alert variant="destructive">
                <AlertTitle>Autentikasi gagal</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

