"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createZone } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

export function CreateZoneForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("Gauteng");
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
        await createZone({ name, description, province, monthlyFee: monthly, yearlyFee: yearly });
        setName("");
        setDescription("");
        setMonthlyFee("");
        setYearlyFee("");
        toast.success("Zone created", { description: `${name} added to ${province}.` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not create zone.";
        setError(msg);
        toast.error(msg);
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
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Monthly (ZAR)"
              inputMode="decimal"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
            />
            <Input
              placeholder="Yearly (ZAR)"
              inputMode="decimal"
              value={yearlyFee}
              onChange={(e) => setYearlyFee(e.target.value)}
            />
          </div>
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
