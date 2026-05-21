import { BarChart3, Download, FileSpreadsheet } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Compliance, revenue and lapse reporting across zones."
      />
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <BarChart3 className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Reports — landing in Phase D</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Time-series revenue by zone, compliance-lapse tracking and exportable CSV
                summaries land alongside the audit log and notifications work. For now the
                key numbers are surfaced on the dashboard.
              </p>
            </div>
            <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              <Placeholder icon={FileSpreadsheet} label="Revenue by zone" />
              <Placeholder icon={Download} label="Compliance exports" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Placeholder({
  icon: Icon,
  label,
}: {
  icon: typeof FileSpreadsheet;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-muted/30 p-3 text-left">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
