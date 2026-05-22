"use client";

import type { UserRole } from "@hailguard/shared";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createPortalUser } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("admin");
  const [password, setPassword] = useState(randomPassword());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    startTransition(async () => {
      try {
        await createPortalUser({ email, fullName, role, password });
        toast.success("User created", {
          description: `${email} — share the password securely.`,
        });
        setEmail("");
        setFullName("");
        setRole("admin");
        setPassword(randomPassword());
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not create user.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add a user</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="admin">Admin (portal access)</option>
            <option value="driver">Driver (mobile only)</option>
          </select>
          <div className="flex gap-2">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button
              type="button"
              variant="outline"
              onClick={() => setPassword(randomPassword())}
              title="Generate"
            >
              ↻
            </Button>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div>
          <Button disabled={pending} onClick={submit}>
            {pending ? "Creating…" : "Create user"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
