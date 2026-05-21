import { CreateZoneForm } from "@/components/create-zone-form";
import { PageHeader } from "@/components/page-header";
import { ZoneActiveToggle } from "@/components/zone-active-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatZAR, getZonesAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ZonesPage() {
  const zones = await getZonesAdmin();

  return (
    <>
      <PageHeader title="Zones" description="Create compliance zones and set pricing." />
      <div className="flex flex-col gap-6 p-8">
        <CreateZoneForm />

        <Card>
          <CardContent className="p-0">
            {zones.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No zones yet. Create one above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Yearly</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell>
                        <p className="font-medium">{z.name}</p>
                        {z.description ? (
                          <p className="text-xs text-muted-foreground">{z.description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatZAR(z.monthlyFee)}</TableCell>
                      <TableCell>{formatZAR(z.yearlyFee)}</TableCell>
                      <TableCell>
                        <Badge tone={z.isActive ? "success" : "neutral"}>
                          {z.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <ZoneActiveToggle id={z.id} isActive={z.isActive} />
                        </div>
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
