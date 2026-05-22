import { Banknote, Download, MapPin, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

const REPORTS = [
  {
    type: "financial",
    icon: Banknote,
    title: "Financial Audit",
    description: "Every payment — subscriptions paid vs failed — with zone, vehicle and driver.",
  },
  {
    type: "density",
    icon: MapPin,
    title: "Density Report",
    description: "Active vehicles and subscriptions per zone, to manage congestion.",
  },
  {
    type: "regulatory",
    icon: ShieldCheck,
    title: "Regulatory Audit",
    description:
      "Active drivers with ID, licence and PrDP details — formatted for transport authorities (e.g. NPTR).",
  },
] as const;

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate CSV exports for finance, congestion and regulatory submissions."
      />
      <div className="grid grid-cols-1 gap-4 p-8 md:grid-cols-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.type} className="flex h-full flex-col">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h2 className="font-semibold tracking-tight">{report.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                </div>
                <a
                  href={`/admin/reports/export/${report.type}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
