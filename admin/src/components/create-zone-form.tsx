"use client";

import { useState, useTransition } from "react";

import { createZone } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CreateZoneForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [yearlyFee, setYearlyFee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const monthly = Number(monthlyFee);
    const yearly = Number(yearlyFee);
    if (!name.trim()) return setError("Name is required.");
    if (Number.isNaN(monthly) || Number.isNaN(yearly)) return setError("Fees must be numbers.");

    startTransition(async () => {
      try {
        await createZone({ name, description, monthlyFee: monthly, yearlyFee: yearly });
        setName("");
        setDescription("");
        setMonthlyFee("");
        setYearlyFee("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create zone.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create a zone</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input placeholder="Zone name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            placeholder="Monthly fee (ZAR)"
            inputMode="decimal"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
          />
          <Input
            placeholder="Yearly fee (ZAR)"
            inputMode="decimal"
            value={yearlyFee}
            onChange={(e) => setYearlyFee(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div>
          <Button disabled={pending} onClick={submit}>
            {pending ? "Creating…" : "Create zone"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
