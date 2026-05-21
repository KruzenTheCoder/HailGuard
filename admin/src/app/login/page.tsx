"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Stage = "password" | "otp-email" | "otp-code";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "unauthorized"
      ? "That account is not an administrator."
      : null
  );

  function goTo(next: Stage) {
    setStage(next);
    setCode("");
    setError(null);
    if (next !== "password") setPassword("");
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStage("otp-code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  const description =
    stage === "password"
      ? "Sign in with your administrator email and password."
      : stage === "otp-email"
        ? "We'll email you a 6-digit code to sign in."
        : `Enter the 6-digit code sent to ${email}.`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <BrandLogo height={72} className="mb-2" />
          <CardTitle>HailGuard Admin</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "password" ? (
            <form onSubmit={signInWithPassword} className="flex flex-col gap-3">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => goTo("otp-email")}
              >
                Sign in with email code instead
              </Button>
            </form>
          ) : stage === "otp-email" ? (
            <form onSubmit={sendCode} className="flex flex-col gap-3">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => goTo("password")}
              >
                Use password instead
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="flex flex-col gap-3">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={loading}>
                {loading ? "Verifying…" : "Verify & sign in"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => goTo("otp-email")}
              >
                Use a different email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
