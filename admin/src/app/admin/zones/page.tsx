import { CreateZoneForm } from "@/components/create-zone-form";
import { DeleteZoneButton } from "@/components/delete-zone-button";
import { PageHeader } from "@/components/page-header";
import { ZoneActiveToggle } from "@/components/zone-active-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatZAR, getZonesAdmin, type ZoneListItem } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ZonesPage() {
  const zones = await getZonesAdmin();

  // Group by province (nulls last).
  const groups = new Map<string, ZoneListItem[]>();
  for (const z of zones) {
    const key = z.province ?? "Unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(z);
  }

  return (
    <>
      <PageHeader title="Zones" description="Create compliance zones and set pricing by province." />
      <div className="flex flex-col gap-6 p-8">
        <CreateZoneForm />

        {zones.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No zones yet. Create one above.
            </CardContent>
          </Card>
        ) : (
          [...groups.entries()].map(([province, items]) => (
            <Card key={province}>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">{province}</CardTitle>
                <Badge tone="info">{items.length} zone{items.length === 1 ? "" : "s"}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Yearly</TableHead>
                      <TableHead>Subs</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((z) => (
                      <TableRow key={z.id}>
                        <TableCell>
                          <p className="font-medium">{z.name}</p>
                          {z.description ? (
                            <p className="text-xs text-muted-foreground">{z.description}</p>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatZAR(z.monthlyFee)}</TableCell>
                        <TableCell>{formatZAR(z.yearlyFee)}</TableCell>
                        <TableCell className="text-muted-foreground">{z.activeSubscriptions}</TableCell>
                        <TableCell>
                          <Badge tone={z.isActive ? "success" : "neutral"}>
                            {z.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <ZoneActiveToggle id={z.id} isActive={z.isActive} />
                            <DeleteZoneButton id={z.id} name={z.name} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
