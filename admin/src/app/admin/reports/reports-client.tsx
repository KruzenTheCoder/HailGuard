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

  const totalCount = useMemo(() => {
    return distributionData.reduce((sum, d) => sum + d[1], 0);
  }, [distributionData]);

  const donutSegments = useMemo(() => {
    let accumulatedPercent = 0;
    const COLORS = [
      "#16BE66", // Emerald
      "#0D2236", // Navy
      "#F5A623", // Amber
      "#3B82F6", // Blue
      "#8B5CF6", // Purple
      "#EC4899", // Pink
      "#E5484D", // Red
    ];

    return distributionData.map(([label, count], idx) => {
      const percent = totalCount > 0 ? (count / totalCount) * 100 : 0;
      const strokeLength = (percent / 100) * 314.16;
      const strokeOffset = 314.16 - ((accumulatedPercent / 100) * 314.16) + 78.54;
      accumulatedPercent += percent;

      return {
        label,
        count,
        percent: Math.round(percent),
        strokeLength,
        strokeOffset,
        color: COLORS[idx % COLORS.length],
      };
    });
  }, [distributionData, totalCount]);

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
          {/* Enhanced Mixed Bar & Line Trend Chart */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {activeTab === "incidents" ? "Incident Volumetrics Trend Analysis" : activeTab === "drivers" ? "New Registrations Profile Timeline" : "Active Compliance Passes Issued"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-4">
              <div className="relative w-full h-56">
                <svg className="w-full h-full" viewBox="0 0 500 240">
                  {/* Grid Lines & Y-Axis Labels */}
                  {(() => {
                    const maxVal = Math.max(1, ...chartData);
                    const yTicks = [
                      maxVal,
                      Math.round(maxVal * 0.75),
                      Math.round(maxVal * 0.5),
                      Math.round(maxVal * 0.25),
                      0
                    ];
                    const yGridCoords = [30, 72.5, 115, 157.5, 200];

                    return (
                      <>
                        {/* Grid lines */}
                        {yGridCoords.map((y, idx) => (
                          <g key={idx}>
                            <line
                              x1="45"
                              y1={y}
                              x2="480"
                              y2={y}
                              stroke="#E3E8ED"
                              strokeWidth="1"
                              strokeDasharray={idx === 4 ? "0" : "3 3"}
                            />
                            <text
                              x="38"
                              y={y + 4}
                              textAnchor="end"
                              fontSize="9"
                              fontWeight="bold"
                              className="fill-muted-foreground"
                            >
                              {yTicks[idx]}
                            </text>
                          </g>
                        ))}

                        {/* X-Axis Ticks & Dates */}
                        <line x1="45" y1="200" x2="480" y2="200" stroke="#0B1B2D" strokeWidth="1.5" />
                        <line x1="45" y1="200" x2="45" y2="205" stroke="#0B1B2D" strokeWidth="1.5" />
                        <line x1="262.5" y1="200" x2="262.5" y2="205" stroke="#0B1B2D" strokeWidth="1.5" />
                        <line x1="480" y1="200" x2="480" y2="205" stroke="#0B1B2D" strokeWidth="1.5" />

                        {/* X-Axis Dates */}
                        <text x="45" y="218" fontSize="9" fontWeight="bold" className="fill-muted-foreground">
                          {dateRange.start.toLocaleDateString("en-ZA")}
                        </text>
                        <text x="262.5" y="218" textAnchor="middle" fontSize="9" fontWeight="bold" className="fill-muted-foreground">
                          {new Date((dateRange.start.getTime() + dateRange.end.getTime()) / 2).toLocaleDateString("en-ZA")}
                        </text>
                        <text x="480" y="218" textAnchor="end" fontSize="9" fontWeight="bold" className="fill-muted-foreground">
                          {dateRange.end.toLocaleDateString("en-ZA")}
                        </text>

                        {/* Mixed Bar and Line plot */}
                        {chartData.length > 0 && (() => {
                          const barWidth = Math.max(2, (435 - 3 * (chartData.length - 1)) / chartData.length);
                          
                          // Line point coordinates
                          const points = chartData.map((val, idx) => {
                            const x = 45 + idx * (barWidth + 3) + barWidth / 2;
                            const y = 200 - (val / maxVal) * 170;
                            return { x, y, val };
                          });

                          const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");

                          return (
                            <>
                              {/* Draw Bars */}
                              {points.map((p, i) => {
                                const barHeight = (p.val / maxVal) * 170;
                                return (
                                  <rect
                                    key={i}
                                    x={p.x - barWidth / 2}
                                    y={200 - barHeight}
                                    width={barWidth}
                                    height={Math.max(1, barHeight)}
                                    fill="#16BE66"
                                    opacity="0.35"
                                    rx="2.5"
                                    ry="2.5"
                                    className="transition-all duration-300 hover:opacity-75"
                                  />
                                );
                              })}

                              {/* Line Curve Overlay */}
                              {chartData.length > 1 && (
                                <path
                                  d={`M ${linePath}`}
                                  fill="none"
                                  stroke="#16BE66"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* Anchor Interactive Dots */}
                              {points.map((p, i) => (
                                <circle
                                  key={i}
                                  cx={p.x}
                                  cy={p.y}
                                  r="3"
                                  fill="#FFFFFF"
                                  stroke="#16BE66"
                                  strokeWidth="2"
                                />
                              ))}
                            </>
                          );
                        })()}

                        {/* Axis Title Labels */}
                        <text
                          transform="rotate(-90)"
                          x="-115"
                          y="10"
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          className="fill-muted-foreground uppercase tracking-wider"
                        >
                          Audit Volume (Count)
                        </text>
                        <text
                          x="262.5"
                          y="235"
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          className="fill-muted-foreground uppercase tracking-wider"
                        >
                          Reporting Timeline
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Premium Donut Chart Breakdown Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {activeTab === "incidents" ? "Incident Breakdowns" : activeTab === "drivers" ? "Drivers Profile Status Distribution" : "Subscriptions Density per Zone"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-4">
              {distributionData.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12 my-auto">
                  No active dataset matching the filters.
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center justify-around gap-6 h-full">
                  {/* Left: Donut Circle SVG */}
                  <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 220 220">
                      {/* Background circle ring */}
                      <circle
                        cx="110"
                        cy="110"
                        r="50"
                        fill="none"
                        stroke="#E3E8ED"
                        strokeWidth="18"
                      />
                      
                      {/* Segments */}
                      {donutSegments.map((seg, idx) => (
                        <circle
                          key={idx}
                          cx="110"
                          cy="110"
                          r="50"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="18"
                          strokeDasharray={`${seg.strokeLength} 314.16`}
                          strokeDashoffset={seg.strokeOffset}
                          strokeLinecap="butt"
                        />
                      ))}

                      {/* Donut Center text */}
                      <text
                        x="110"
                        y="108"
                        textAnchor="middle"
                        fontSize="20"
                        fontWeight="bold"
                        className="fill-foreground"
                      >
                        {totalCount}
                      </text>
                      <text
                        x="110"
                        y="124"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        className="fill-muted-foreground uppercase tracking-wider"
                      >
                        Total
                      </text>
                    </svg>
                  </div>

                  {/* Right: Premium Tabular Legend */}
                  <div className="flex-1 w-full flex flex-col gap-2 bg-muted/20 border border-border/40 p-4 rounded-xl max-h-48 overflow-y-auto">
                    {donutSegments.map((seg, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2 truncate max-w-[120px]">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                          <span className="capitalize truncate text-foreground/80">
                            {seg.label.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-right shrink-0">
                          <span className="text-muted-foreground">{seg.count} qty</span>
                          <span className="text-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                            {seg.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
