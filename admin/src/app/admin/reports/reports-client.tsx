"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Printer,
  ShieldAlert,
  Users,
  CheckCircle,
  FileText,
  ChevronRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Tab = "incidents" | "drivers" | "compliance";
type DatePreset = "7d" | "30d" | "90d" | "all";

export function ReportsClient({
  initialIncidents,
  initialDrivers,
  initialSubscriptions,
}: {
  initialIncidents: any[];
  initialDrivers: any[];
  initialSubscriptions: any[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("incidents");
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Report specific filters
  const [incidentStatus, setIncidentStatus] = useState("all");
  const [incidentType, setIncidentType] = useState("all");
  const [driverStatus, setDriverStatus] = useState("all");
  const [subscriptionStatus, setSubscriptionStatus] = useState("all");

  // --- Date filtering logic ---
  const dateRange = useMemo(() => {
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    let start = new Date();
    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    } else {
      if (datePreset === "7d") {
        start.setDate(end.getDate() - 7);
      } else if (datePreset === "30d") {
        start.setDate(end.getDate() - 30);
      } else if (datePreset === "90d") {
        start.setDate(end.getDate() - 90);
      } else {
        start = new Date(0); // All time
      }
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }, [datePreset, startDate, endDate]);

  // Filtered lists
  const filteredIncidents = useMemo(() => {
    return initialIncidents.filter((i) => {
      const d = new Date(i.createdAt);
      if (d < dateRange.start || d > dateRange.end) return false;
      if (incidentStatus !== "all" && i.status !== incidentStatus) return false;
      if (incidentType !== "all" && i.incidentType !== incidentType) return false;
      return true;
    });
  }, [initialIncidents, dateRange, incidentStatus, incidentType]);

  const filteredDrivers = useMemo(() => {
    return initialDrivers.filter((d) => {
      const date = new Date(d.profile.createdAt);
      if (date < dateRange.start || date > dateRange.end) return false;
      if (driverStatus !== "all" && d.profile.status !== driverStatus) return false;
      return true;
    });
  }, [initialDrivers, dateRange, driverStatus]);

  const filteredSubscriptions = useMemo(() => {
    return initialSubscriptions.filter((s) => {
      const d = new Date(s.startDate || s.createdAt);
      if (d < dateRange.start || d > dateRange.end) return false;
      if (subscriptionStatus !== "all" && s.status !== subscriptionStatus) return false;
      return true;
    });
  }, [initialSubscriptions, dateRange, subscriptionStatus]);

  // Daily trend builder (last 30/7 days sparkline SVG)
  const chartData = useMemo(() => {
    const dataList =
      activeTab === "incidents"
        ? filteredIncidents
        : activeTab === "drivers"
        ? filteredDrivers
        : filteredSubscriptions;

    const daysCount = datePreset === "7d" ? 7 : datePreset === "90d" ? 90 : 30;
    const buckets = new Array(daysCount).fill(0);
    const dayMs = 86400000;
    const nowMs = dateRange.end.getTime();

    dataList.forEach((item) => {
      const createdAt = item.createdAt || item.profile?.createdAt || item.startDate;
      const t = Date.parse(createdAt);
      if (Number.isNaN(t)) return;
      const diffDays = Math.floor((nowMs - t) / dayMs);
      if (diffDays >= 0 && diffDays < daysCount) {
        buckets[daysCount - 1 - diffDays]++;
      }
    });

    return buckets;
  }, [activeTab, filteredIncidents, filteredDrivers, filteredSubscriptions, datePreset, dateRange]);

  // Distribution helper
  const distributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    if (activeTab === "incidents") {
      filteredIncidents.forEach((i) => {
        counts[i.incidentType] = (counts[i.incidentType] || 0) + 1;
      });
    } else if (activeTab === "drivers") {
      filteredDrivers.forEach((d) => {
        counts[d.profile.status] = (counts[d.profile.status] || 0) + 1;
      });
    } else {
      filteredSubscriptions.forEach((s) => {
        counts[s.zoneName] = (counts[s.zoneName] || 0) + 1;
      });
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [activeTab, filteredIncidents, filteredDrivers, filteredSubscriptions]);

  // Max value in distribution for styling widths
  const distMax = useMemo(() => {
    return Math.max(1, ...distributionData.map((d) => d[1]));
  }, [distributionData]);

  // Printing PDF
  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print Friendly Style Injection */}
      <style jsx global>{`
        @media print {
          /* Hide sidebar, page header, filter tools, CSV card and print button */
          aside, 
          header, 
          .no-print, 
          .reports-nav-card,
          button,
          input,
          select {
            display: none !important;
          }
          
          body, html {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #report-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            padding: 20px !important;
          }

          .print-header {
            display: block !important;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 24px;
          }

          .card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
        }
        
        .print-header {
          display: none;
        }
      `}</style>

      {/* Main reporting view container */}
      <div className="flex flex-col gap-6 p-8" id="report-print-area">
        {/* Printable Executive Header */}
        <div className="print-header">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">HAILGUARD REPORT</h1>
              <p className="text-xs text-slate-500 mt-1">
                Generated: {new Date().toLocaleDateString("en-ZA")} · Standard SA Time
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                {activeTab === "incidents" ? "Safety & Fatigue Incident Audit" : activeTab === "drivers" ? "Driver Fleet Compliance Status" : "Zone Density & Subscription Audit"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Controls bar (hidden in print) */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
          {/* Preset navigation tabs */}
          <div className="flex rounded-xl bg-card border border-border p-1 text-sm shadow-sm w-full md:w-auto">
            <button
              onClick={() => setActiveTab("incidents")}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${
                activeTab === "incidents" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Incidents
            </button>
            <button
              onClick={() => setActiveTab("drivers")}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${
                activeTab === "drivers" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Drivers
            </button>
            <button
              onClick={() => setActiveTab("compliance")}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${
                activeTab === "compliance" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              Compliance & Passes
            </button>
          </div>

          {/* Quick actions (Export PDF) */}
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <Button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10 px-4 text-sm font-medium"
            >
              <Printer className="h-4 w-4" />
              Export PDF Report
            </Button>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <Card className="no-print">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 flex-wrap items-center">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</span>
            </div>

            {/* Date range selection */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md bg-muted p-1 text-xs">
                {(["7d", "30d", "90d", "all"] as DatePreset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setDatePreset(p);
                      setStartDate("");
                      setEndDate("");
                    }}
                    className={`rounded px-2.5 py-1 font-semibold uppercase ${
                      datePreset === p && !startDate ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "all" ? "All" : p}
                  </button>
                ))}
              </div>

              {/* Custom dates */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">or custom:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset("all");
                  }}
                  className="h-8 py-0 px-2 w-32 rounded-lg"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset("all");
                  }}
                  className="h-8 py-0 px-2 w-32 rounded-lg"
                />
              </div>
            </div>

            {/* Tab specific dropdown filters */}
            <div className="flex-1 flex gap-2 justify-end w-full md:w-auto">
              {activeTab === "incidents" && (
                <>
                  <select
                    value={incidentStatus}
                    onChange={(e) => setIncidentStatus(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-36"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="under_investigation">Under Investigation</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-36"
                  >
                    <option value="all">All Types</option>
                    <option value="sos">SOS Panic</option>
                    <option value="fatigue">Fatigue Risk</option>
                    <option value="speeding">Speeding</option>
                    <option value="zone_breach">Zone Breach</option>
                  </select>
                </>
              )}

              {activeTab === "drivers" && (
                <select
                  value={driverStatus}
                  onChange={(e) => setDriverStatus(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-40"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved / Compliant</option>
                  <option value="pending">Pending Review</option>
                  <option value="rejected">Rejected</option>
                </select>
              )}

              {activeTab === "compliance" && (
                <select
                  value={subscriptionStatus}
                  onChange={(e) => setSubscriptionStatus(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-44"
                >
                  <option value="all">All Subscription States</option>
                  <option value="active">Active Pass</option>
                  <option value="pending_payment">Payment Pending</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Trend Line/Histogram Chart Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {activeTab === "incidents" ? "Incident Frequency Trend" : activeTab === "drivers" ? "New Registrations Profile Timeline" : "Active Compliance Passes Issued"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end min-h-[220px] gap-4 pt-4">
              {/* SVG Trend Area Chart */}
              <div className="relative flex-1 w-full h-36 flex items-end">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 400 120"
                  preserveAspectRatio="none"
                >
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16BE66" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#16BE66" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Draw area */}
                  {chartData.length > 1 && (() => {
                    const maxVal = Math.max(1, ...chartData);
                    const widthUnit = 400 / (chartData.length - 1);
                    const points = chartData.map((val, idx) => {
                      const x = idx * widthUnit;
                      const y = 110 - (val / maxVal) * 90;
                      return `${x},${y}`;
                    });

                    const areaPath = `0,120 ${points.join(" ")} 400,120`;
                    const linePath = points.join(" ");

                    return (
                      <>
                        <path d={areaPath} fill="url(#chartGrad)" />
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#16BE66"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {/* Interactive Data Dots */}
                        {points.map((p, i) => {
                          const [x, y] = p.split(",");
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="3.5"
                              fill="#FFFFFF"
                              stroke="#16BE66"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Chart Footer description */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border-t border-border pt-2">
                <span>{dateRange.start.toLocaleDateString("en-ZA")}</span>
                <span>Trend Histogram over active date range</span>
                <span>{dateRange.end.toLocaleDateString("en-ZA")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown distribution list card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {activeTab === "incidents" ? "Incidents Breakdown by Category" : activeTab === "drivers" ? "Drivers Profile Status Distribution" : "Subscriptions Density per Zone"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3.5 pt-4">
              {distributionData.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8 my-auto">
                  No active dataset matching the filters.
                </div>
              ) : (
                distributionData.map(([key, count]) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="capitalize text-foreground/80">{key.replace("_", " ")}</span>
                      <span className="font-semibold text-foreground">{count} {count === 1 ? "entry" : "entries"}</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border border-border/20">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(count / distMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Data Table */}
        <Card className="mt-4">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border bg-muted/10">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
              Audit Data Record log ({activeTab === "incidents" ? filteredIncidents.length : activeTab === "drivers" ? filteredDrivers.length : filteredSubscriptions.length})
            </CardTitle>
            <span className="text-[10px] text-muted-foreground font-semibold no-print">
              Fitted for standard landscape or vertical document prints
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {activeTab === "incidents" && (
                      <>
                        <th className="px-4 py-3">Occurred At</th>
                        <th className="px-4 py-3">Driver</th>
                        <th className="px-4 py-3">Incident Category</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Details / Resolution Notes</th>
                      </>
                    )}
                    {activeTab === "drivers" && (
                      <>
                        <th className="px-4 py-3">Registered At</th>
                        <th className="px-4 py-3">Driver Name</th>
                        <th className="px-4 py-3">SA ID Number</th>
                        <th className="px-4 py-3">Licence Number</th>
                        <th className="px-4 py-3">PrDP status</th>
                        <th className="px-4 py-3">Compliance Status</th>
                      </>
                    )}
                    {activeTab === "compliance" && (
                      <>
                        <th className="px-4 py-3">Issued Date</th>
                        <th className="px-4 py-3">Driver Name</th>
                        <th className="px-4 py-3">Zone Location</th>
                        <th className="px-4 py-3">Pass Tier</th>
                        <th className="px-4 py-3">Vehicle details</th>
                        <th className="px-4 py-3">State</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* Render Incidents rows */}
                  {activeTab === "incidents" &&
                    filteredIncidents.map((i) => (
                      <tr key={i.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(i.createdAt).toLocaleDateString("en-ZA")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{i.driverName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-semibold uppercase tracking-wider text-[10px] border border-rose-100">
                            {i.incidentType}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            tone={
                              i.status === "resolved"
                                ? "success"
                                : i.status === "under_investigation"
                                ? "info"
                                : "danger"
                            }
                          >
                            {i.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                          {i.resolutionNotes || i.notes || "—"}
                        </td>
                      </tr>
                    ))}

                  {/* Render Drivers rows */}
                  {activeTab === "drivers" &&
                    filteredDrivers.map((d) => (
                      <tr key={d.profile.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(d.profile.createdAt).toLocaleDateString("en-ZA")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {d.user?.full_name || d.user?.email || "Unknown driver"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{d.profile.idNumber || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{d.profile.licenseNumber || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge tone={d.profile.prdpStatus === "verified" ? "success" : "warning"}>
                            PrDP: {d.profile.prdpStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge tone={d.profile.status === "approved" ? "success" : d.profile.status === "rejected" ? "danger" : "warning"}>
                            {d.profile.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}

                  {/* Render Compliance rows */}
                  {activeTab === "compliance" &&
                    filteredSubscriptions.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(s.startDate || s.createdAt).toLocaleDateString("en-ZA")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{s.driverName}</td>
                        <td className="px-4 py-3 text-muted-foreground font-semibold">{s.zoneName}</td>
                        <td className="px-4 py-3 text-muted-foreground uppercase">{s.planType}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{s.vehicleLabel}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge tone={s.status === "active" ? "success" : s.status === "expired" || s.status === "cancelled" ? "neutral" : "warning"}>
                            {s.status.replace("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Empty check */}
            {((activeTab === "incidents" && filteredIncidents.length === 0) ||
              (activeTab === "drivers" && filteredDrivers.length === 0) ||
              (activeTab === "compliance" && filteredSubscriptions.length === 0)) && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No matching records found in this range.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
