"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DriverVehicleStatusRow } from "@/lib/queries";
import { cn } from "@/lib/utils";

type FilterValue = "all" | "compliant" | "pending" | "issue";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "compliant", label: "Compliant" },
  { value: "pending", label: "Pending" },
  { value: "issue", label: "Issues" },
];

type SortKey =
  | "driver"
  | "vehicle"
  | "plate"
  | "status"
  | "expiry"
  | "zones"
  | "created";

type SortState = { key: SortKey; dir: "asc" | "desc" };

function compare(a: string | number | null, b: string | number | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function expiryTone(date: string | null): { tone: "success" | "warning" | "danger" | "neutral"; label: string } {
  const days = daysUntil(date);
  if (days === null) return { tone: "neutral", label: "—" };
  if (days < 0) return { tone: "danger", label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 30) return { tone: "warning", label: `${days}d left` };
  return { tone: "success", label: `${days}d left` };
}

export function DriverVehicleTable({ rows }: { rows: DriverVehicleStatusRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortState>({ key: "created", dir: "desc" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let out = rows;
    if (q) {
      out = out.filter((r) =>
        [
          r.driverName,
          r.driverEmail ?? "",
          r.driverPhone ?? "",
          r.make,
          r.model,
          r.licensePlate,
          r.activeZones.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    if (filter !== "all") {
      out = out.filter((r) => {
        if (filter === "compliant") return r.fullyCompliant;
        if (filter === "pending") {
          return r.vehicleStatus === "pending" || r.driverStatus === "pending";
        }
        // "issue"
        return (
          r.vehicleStatus === "suspended" ||
          r.vehicleStatus === "rejected" ||
          r.driverStatus === "rejected" ||
          (!r.fullyCompliant && r.vehicleStatus !== "pending")
        );
      });
    }

    const sorted = [...out].sort((a, b) => {
      let result = 0;
      switch (sort.key) {
        case "driver":
          result = compare(a.driverName.toLowerCase(), b.driverName.toLowerCase());
          break;
        case "vehicle":
          result = compare(
            `${a.make} ${a.model}`.toLowerCase(),
            `${b.make} ${b.model}`.toLowerCase(),
          );
          break;
        case "plate":
          result = compare(a.licensePlate.toLowerCase(), b.licensePlate.toLowerCase());
          break;
        case "status":
          result = compare(a.vehicleStatus, b.vehicleStatus);
          break;
        case "expiry":
          result = compare(
            a.roadworthyExpiresAt ?? null,
            b.roadworthyExpiresAt ?? null,
          );
          break;
        case "zones":
          result = compare(a.activeZones.length, b.activeZones.length);
          break;
        case "created":
        default:
          result = compare(a.createdAt, b.createdAt);
          break;
      }
      return sort.dir === "asc" ? result : -result;
    });

    return sorted;
  }, [rows, query, filter, sort]);

  function setSortKey(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <header className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Driver &amp; vehicle status</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {filtered.length} of {rows.length} vehicles
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search driver, plate, zone…"
              className="pl-8 sm:w-72"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md bg-muted p-1 text-xs">
            {FILTERS.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-sm px-3 py-1 font-medium transition-colors",
                  filter === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              label="Status"
              active={sort.key === "status"}
              dir={sort.dir}
              onClick={() => setSortKey("status")}
            />
            <SortableHead
              label="Driver"
              active={sort.key === "driver"}
              dir={sort.dir}
              onClick={() => setSortKey("driver")}
            />
            <SortableHead
              label="Vehicle"
              active={sort.key === "vehicle"}
              dir={sort.dir}
              onClick={() => setSortKey("vehicle")}
            />
            <SortableHead
              label="Plate"
              active={sort.key === "plate"}
              dir={sort.dir}
              onClick={() => setSortKey("plate")}
            />
            <SortableHead
              label="Roadworthy"
              active={sort.key === "expiry"}
              dir={sort.dir}
              onClick={() => setSortKey("expiry")}
            />
            <SortableHead
              label="Subscribed zones"
              active={sort.key === "zones"}
              dir={sort.dir}
              onClick={() => setSortKey("zones")}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                No vehicles match this view.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((row) => {
              const expiry = expiryTone(row.roadworthyExpiresAt);
              return (
                <TableRow key={row.vehicleId}>
                  <TableCell>
                    <StatusBadge status={row.vehicleStatus} />
                  </TableCell>
                  <TableCell>
                    {row.driverId ? (
                      <Link
                        href={`/admin/drivers/${row.driverId}`}
                        className="block hover:underline"
                      >
                        <span className="font-medium">{row.driverName}</span>
                        {row.driverEmail ? (
                          <span className="block text-xs text-muted-foreground">
                            {row.driverEmail}
                          </span>
                        ) : null}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.driverName}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {row.make} {row.model}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">{row.year}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs tracking-wider">
                    {row.licensePlate}
                  </TableCell>
                  <TableCell>
                    <Badge
                      tone={
                        expiry.tone === "neutral"
                          ? "neutral"
                          : expiry.tone === "danger"
                            ? "danger"
                            : expiry.tone === "warning"
                              ? "warning"
                              : "success"
                      }
                    >
                      {expiry.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.activeZones.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.activeZones.map((zone) => (
                          <Badge key={zone} tone="info">
                            {zone}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors",
          active ? "text-foreground" : "hover:text-foreground",
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}
