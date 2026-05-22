import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditActionTypes, getAuditTrail } from "@/lib/audit-queries";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const filters = { action: sp.action, actor: sp.actor, from: sp.from, to: sp.to };
  const [entries, actions] = await Promise.all([getAuditTrail(filters), getAuditActionTypes()]);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Immutable, read-only record of every system action — for full accountability."
      />
      <div className="flex flex-col gap-6 p-8">
        <Card>
          <CardContent className="p-4">
            <form method="get" className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Action
                <select
                  name="action"
                  defaultValue={sp.action ?? ""}
                  className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All actions</option>
                  {actions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Actor email
                <Input name="actor" defaultValue={sp.actor ?? ""} placeholder="name@…" className="w-48" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                From
                <Input type="date" name="from" defaultValue={sp.from ?? ""} className="w-40" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                To
                <Input type="date" name="to" defaultValue={sp.to ?? ""} className="w-40" />
              </label>
              <Button type="submit">Filter</Button>
              <Link
                href="/admin/audit"
                className="inline-flex h-10 items-center px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </Link>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No audit entries match these filters.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString("en-ZA")}
                      </TableCell>
                      <TableCell>{e.actorEmail ?? "System"}</TableCell>
                      <TableCell className="text-muted-foreground">{e.actorRole ?? "—"}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.actionType}</code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.targetTable ? `${e.targetTable} · ${e.targetId?.slice(0, 8) ?? ""}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
