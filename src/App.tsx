/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gavel,
  Shield,
  Scale,
  Users,
  FileText,
  AlertTriangle,
  Info,
  ChevronRight,
  Download,
  Sun,
  Moon,
  Search,
  X,
  Printer,
  BookOpen,
  Sparkles,
  BarChart2,
  Table as TableIcon,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  HelpCircle,
  AlertOctagon,
  Map
} from "lucide-react";

import { BHP_CASES, SH_LIST, RISK_COLOR, RISK_BG_LIGHT, RISK_BG_DARK } from "./data";
import { CaseData, StatSummary } from "./types";
import { MetricCard } from "./components/MetricCard";
import { FloatingPreview } from "./components/FloatingPreview";
import { DonutTooltip } from "./components/DonutTooltip";
import { BhpMap } from "./components/BhpMap";

export function getRiskColor(risiko: string, dark?: boolean) {
  if (dark) {
    switch (risiko) {
      case "Sangat Tinggi": return "#F87171"; // red-400
      case "Tinggi": return "#FB923C";        // orange-400
      case "Sedang": return "#FBBF24";        // amber-400
      case "Rendah": return "#4ADE80";        // green-400
      case "Preventif": return "#60A5FA";     // blue-400
      default: return "#94A3B8";
    }
  } else {
    switch (risiko) {
      case "Sangat Tinggi": return "#DC2626"; // red-600
      case "Tinggi": return "#EA580C";        // orange-600
      case "Sedang": return "#D97706";        // amber-600
      case "Rendah": return "#16A34A";        // green-600
      case "Preventif": return "#2563EB";     // blue-600
      default: return "#475569";
    }
  }
}

export default function App() {
  const [sh, setSh] = useState<string>("Semua");
  const [bhp, setBhp] = useState<boolean>(false);
  const [sel, setSel] = useState<CaseData | null>(BHP_CASES[0]);
  const [tab, setTab] = useState<"chart" | "table" | "map">("chart");
  const [selectedOffice, setSelectedOffice] = useState<string>("BHP Medan");
  const [dark, setDark] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<keyof CaseData>("jumlah");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [donutFocus, setDonutFocus] = useState<"global" | "perkara">("global");
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  // Mouse tracking state for dynamic hover cards
  const [hoveredCase, setHoveredCase] = useState<CaseData | null>(null);
  const [hoveredDonut, setHoveredDonut] = useState<{ v: number; c: string; label: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hasAnimCompleted, setHasAnimCompleted] = useState<boolean>(false);

  // Transition animation completion trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAnimCompleted(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Handle dark mode side effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [dark]);

  // Handle toast timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // Filter cases based on stakeholder
  const filtered = useMemo(() => {
    if (sh === "Semua") return BHP_CASES;
    return BHP_CASES.filter((d) => d.stakeholder.includes(sh));
  }, [sh]);

  // Compute calculated statistics and case values depending on whether simulated intervention is active
  const stats = useMemo<StatSummary>(() => {
    const hilir = filtered.filter((d) => d.sifat === "Hilir");
    const hulu = filtered.filter((d) => d.sifat === "Hulu");

    const totalHilirRaw = hilir.reduce((sum, d) => sum + d.jumlah, 0);
    const totalHuluRaw = hulu.reduce((sum, d) => sum + d.jumlah, 0);

    if (!bhp) {
      return {
        beban: totalHilirRaw,
        dicegah: 0,
        pengampuan: totalHuluRaw,
        hilirD: hilir.map((d) => ({ ...d, disp: d.jumlah })),
        huluD: hulu.map((d) => ({ ...d, disp: d.jumlah })),
        total: totalHilirRaw + totalHuluRaw,
        pctHilir: Math.round((totalHilirRaw / (totalHilirRaw + totalHuluRaw || 1)) * 100),
        pctHulu: Math.round((totalHuluRaw / (totalHilirRaw + totalHuluRaw || 1)) * 100)
      };
    } else {
      // 80% of hilir sengketa successfully prevented in the simulation
      const dicegahAmount = Math.round(totalHilirRaw * 0.8);
      const sisaBeban = totalHilirRaw - dicegahAmount;
      const interventionRatio = totalHilirRaw > 0 ? sisaBeban / totalHilirRaw : 0;

      const totalCalculated = sisaBeban + (totalHuluRaw + dicegahAmount);

      return {
        beban: sisaBeban,
        dicegah: dicegahAmount,
        pengampuan: totalHuluRaw + dicegahAmount,
        hilirD: hilir.map((d) => ({ ...d, disp: Math.round(d.jumlah * interventionRatio) })),
        huluD: hulu.map((d) => ({ ...d, disp: d.jumlah })),
        total: totalCalculated,
        pctHilir: Math.round((sisaBeban / (totalCalculated || 1)) * 105), // weight percentages for visualization
        pctHulu: Math.round(((totalHuluRaw + dicegahAmount) / (totalCalculated || 1)) * 100)
      };
    }
  }, [filtered, bhp]);

  // Combined searchable/sortable list
  const barData = useMemo(() => {
    const all = [...stats.hilirD, ...stats.huluD];
    const maxVal = Math.max(...all.map((d) => d.disp), 1);
    return all.map((d) => ({
      ...d,
      pct: (d.disp / maxVal) * 100
    }));
  }, [stats]);

  // Search filter
  const visibleBar = useMemo(() => {
    if (!search.trim()) return barData;
    const query = search.toLowerCase();
    return barData.filter(
      (d) =>
        d.perkara.toLowerCase().includes(query) ||
        d.sifat.toLowerCase().includes(query) ||
        d.risiko.toLowerCase().includes(query) ||
        d.core.toLowerCase().includes(query) ||
        d.urgensi.toLowerCase().includes(query)
    );
  }, [barData, search]);

  // Table sorted list
  const sortedTableData = useMemo(() => {
    return [...visibleBar].sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      
      if (typeof va === "string") {
        va = (va as string).toLowerCase();
        vb = (vb as string).toLowerCase();
      }
      
      if (sortDir === "asc") {
        return va > vb ? 1 : -1;
      } else {
        return va < vb ? 1 : -1;
      }
    });
  }, [visibleBar, sortCol, sortDir]);

  // Currently viewing details (defaults to selected case, falls back to first visible, or first in dataset)
  const currentDetails = useMemo<CaseData | null>(() => {
    if (sel && barData.some((d) => d.id === sel.id)) {
      // Find updated values for the selected case
      return barData.find((d) => d.id === sel.id) || sel;
    }
    return visibleBar[0] || barData[0] || null;
  }, [sel, barData, visibleBar]);

  // Statistics for Donut chart and side summary
  const donutSegments = useMemo(() => {
    if (donutFocus === "perkara" && currentDetails) {
      const segments = [];
      if (currentDetails.sifat === "Hilir") {
        segments.push({
          v: currentDetails.disp || 0,
          c: dark ? "#F87171" : "#DC2626",
          label: "Sengketa Hilir"
        });
        if (bhp) {
          const prevented = (currentDetails.jumlah || 0) - (currentDetails.disp || 0);
          if (prevented > 0) {
            segments.push({
              v: prevented,
              c: dark ? "#FBBF24" : "#D97706",
              label: "Sengketa Terfilter"
            });
          }
        }
      } else {
        segments.push({
          v: currentDetails.disp || 0,
          c: dark ? "#60A5FA" : "#2563EB",
          label: "Pengampuan Hulu"
        });
      }
      return segments;
    } else {
      // In global view under active intervention mode:
      // Sengketa Hilir = stats.beban (remaining unpreventable litigation)
      // Pengampuan Hulu (original base) = stats.pengampuan - stats.dicegah
      // Sengketa Terfilter = stats.dicegah (the prevented litigation volume shifted)
      // This sums up to exactly stats.total (total raw registered cases). No double counting!
      const segments = [
        { v: stats.beban, c: dark ? "#F87171" : "#DC2626", label: "Sengketa Hilir" },
        { 
          v: bhp ? (stats.pengampuan - stats.dicegah) : stats.pengampuan, 
          c: dark ? "#60A5FA" : "#2563EB", 
          label: "Pengampuan Hulu" 
        }
      ];
      if (bhp && stats.dicegah > 0) {
        segments.push({ v: stats.dicegah, c: dark ? "#FBBF24" : "#D97706", label: "Sengketa Terfilter" });
      }
      return segments;
    }
  }, [donutFocus, currentDetails, stats, bhp, dark]);

  const donutTotal = useMemo(() => {
    return donutSegments.reduce((sum, seg) => sum + seg.v, 0);
  }, [donutSegments]);

  // Total unmanipulated metrics for the banner
  const totalAllRaw = useMemo(() => {
    return BHP_CASES.reduce((sum, d) => sum + d.jumlah, 0);
  }, []);

  const totalHilirRawOnly = useMemo(() => {
    return BHP_CASES.filter((d) => d.sifat === "Hilir").reduce((sum, d) => sum + d.jumlah, 0);
  }, []);

  const totalPengampuanRaw = useMemo(() => {
    return BHP_CASES.filter((d) => d.perkara.includes("Pengampuan")).reduce((sum, d) => sum + d.jumlah, 0);
  }, []);

  const handleExportCSV = () => {
    const headers = ["No", "Jenis Perkara", "Jumlah Terkalkulasi", "Sifat Perkara", "Stakeholder Terkait", "Tingkat Risiko", "Core Message", "Mendesak / Urgensi"];
    const rows = barData.map((d, index) => [
      index + 1,
      `"${d.perkara}"`,
      d.disp,
      d.sifat,
      `"${d.stakeholder.join(", ")}"`,
      d.risiko,
      `"${d.core}"`,
      `"${d.urgensi}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BHP_Kewarisan_Dashboard_Intervensi_${bhp ? "Aktif" : "Nonaktif"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast("Seluruh data laporan berhasil diekspor sebagai CSV!");
  };

  const handleExportHTML = () => {
    const caseRows = barData.map((d, index) => {
      const isHilir = d.sifat === "Hilir";
      const riskColorHex = d.risiko === "Sangat Tinggi" ? "#EF4444" : d.risiko === "Tinggi" ? "#F97316" : d.risiko === "Sedang" ? "#F59E0B" : d.risiko === "Rendah" ? "#10B981" : "#3B82F6";
      const sifatBg = isHilir ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)";
      const sifatText = isHilir ? "#EF4444" : "#3B82F6";

      return `
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div class="flex items-center gap-3">
              <span class="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center">${index + 1}</span>
              <h3 class="text-lg font-bold font-serif text-slate-900">${d.perkara}</h3>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-xs font-bold leading-normal uppercase" style="background: ${sifatBg}; color: ${sifatText};">${d.sifat}</span>
              <span class="px-2.5 py-1 rounded-full text-xs font-bold border" style="border-color: ${riskColorHex}; color: ${riskColorHex}; background: rgba(0,0,0,0.01)">Risiko ${d.risiko}</span>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="space-y-1 bg-amber-500/5 border-l-2 border-amber-500 rounded-md p-3">
              <h5 class="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5 mb-1 animate-pulse">
                Core Message Perkara
              </h5>
              <p class="text-xs text-slate-700 leading-relaxed font-semibold">${d.core}</p>
            </div>
            <div class="space-y-1 bg-rose-500/5 border-l-2 border-rose-500 rounded-md p-3">
              <h5 class="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-1 animate-pulse">
                Urgensi (Dampak Hukum)
              </h5>
              <p class="text-xs text-slate-700 leading-relaxed font-semibold">${d.urgensi}</p>
            </div>
            <div class="space-y-1 bg-indigo-500/5 border-l-2 border-indigo-500 rounded-md p-3">
              <h5 class="text-xs font-black text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 mb-1 animate-pulse">
                Dimensi Filosofis Keadilan
              </h5>
              <p class="text-xs text-slate-600 leading-relaxed">${d.filosofis}</p>
            </div>
            <div class="space-y-1 bg-emerald-500/5 border-l-2 border-emerald-500 rounded-md p-3">
              <h5 class="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-1 animate-pulse">
                Dimensi Sosiologis Keluarga
              </h5>
              <p class="text-xs text-slate-600 leading-relaxed">${d.sosiologis}</p>
            </div>
            <div class="space-y-1 bg-cyan-500/5 border-l-2 border-cyan-500 rounded-md p-3">
              <h5 class="text-xs font-black text-cyan-800 uppercase tracking-wider flex items-center gap-1.5 mb-1 animate-pulse">
                Acuan Hukum Perdata Pos
              </h5>
              <p class="text-xs text-slate-600 leading-relaxed">${d.yuridis}</p>
            </div>
            <div class="col-span-1 md:col-span-2 lg:col-span-3 bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 class="text-xs font-extrabold tracking-widest text-amber-400 uppercase mb-1.5 flex items-center gap-1">
                  Supervisi Balai Harta Peninggalan
                </h5>
                <p class="text-xs text-slate-300 leading-relaxed">${d.penjelasanBhp}</p>
              </div>
              <div class="border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4 flex flex-col justify-center">
                <h5 class="text-xs font-extrabold tracking-widest text-rose-455 uppercase mb-1">
                  Korelasi Laporan Tahunan MA 2025
                </h5>
                <p class="text-[11px] text-slate-400 leading-normal">
                  <strong>Referensi:</strong> ${d.sumberHalaman || '-'} &nbsp;•&nbsp; ${d.sumberTabel || '-'}
                </p>
                <p class="text-xs text-amber-400 font-extrabold mt-1.5 leading-snug">
                  <strong>Kategori:</strong> ${d.kategoriMa || '-'}
                </p>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-4 pt-3 border-t border-slate-100">
            <div>Jumlah Terkalkulasi: <strong class="text-slate-700">${d.disp} perkara</strong></div>
            <div>Stakeholder: <strong class="text-slate-700">${d.stakeholder.join(", ")}</strong></div>
          </div>
        </div>
      `;
    }).join("\n");

    const tableRowsHtml = barData.map((d, index) => {
      const riskColorHex = d.risiko === "Sangat Tinggi" ? "#EF4444" : d.risiko === "Tinggi" ? "#F97316" : d.risiko === "Sedang" ? "#F59E0B" : d.risiko === "Rendah" ? "#10B981" : "#3B82F6";
      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50/50">
          <td class="p-3 text-center font-bold text-xs text-slate-500">${index + 1}</td>
          <td class="p-3 text-sm text-slate-800 font-serif font-bold">${d.perkara}</td>
          <td class="p-3 text-center text-xs">
            <span class="px-2 py-0.5 rounded-full font-bold uppercase text-[10px]" style="background: ${d.sifat === "Hilir" ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)"}; color: ${d.sifat === "Hilir" ? "#EF4444" : "#3B82F6"};">${d.sifat}</span>
          </td>
          <td class="p-3 text-right font-mono font-bold text-sm text-slate-900">${d.disp.toLocaleString("id-ID")}</td>
          <td class="p-3 text-center text-xs">
            <span class="px-2 py-0.5 rounded-full font-bold text-[10px]" style="border: 1px solid ${riskColorHex}; color: ${riskColorHex}; background: rgba(0,0,0,0.01);">${d.risiko}</span>
          </td>
          <td class="p-3 text-xs text-slate-600 font-medium">${d.stakeholder.join(", ")}</td>
        </tr>
      `;
    }).join("\n");

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laporan Analisis Intervensi BHP - ${bhp ? "Intervensi Aktif" : "Non-Intervensi"}</title>
    <!-- Google Fonts & Tailwind CDN -->
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        serif: ['"Playfair Display"', 'serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                    }
                }
            }
        }
    </script>
    <style>
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; color: black !important; }
            .print-break { page-break-after: always; }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 font-sans min-h-screen">

    <!-- TOP HEADER / DISKLAIMER RESMI -->
    <header class="bg-slate-950 text-white py-1.5 px-4 text-[10px] font-bold tracking-widest uppercase flex items-center justify-between border-b border-amber-500/35 pb-2">
        <div>KEMENTERIAN HUKUM RI &nbsp;•&nbsp; DIREKTORAT PERDATA AHU</div>
        <div class="text-amber-400">DATA RESMI REGISTER PERKARA NASIONAL</div>
    </header>

    <div class="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        <!-- DASHBOARD CONTROLS (PRINT BUTTON) -->
        <div class="no-print flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div class="flex items-center gap-3">
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-bold text-slate-600">Dokumen Laporan Portabel (.HTML) Mandiri Siap Unduh & Cetak</span>
            </div>
            <button onclick="window.print()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
                <span>Cetak / Simpan PDF</span>
            </button>
        </div>

        <!-- MAIN TITLE BANNER -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div class="space-y-2 max-w-xl">
                <span class="text-[10px] font-black tracking-widest text-indigo-600 uppercase">Eksekutif Analitis Dashboard</span>
                <h1 class="text-2xl sm:text-3xl font-serif font-black text-slate-950 leading-tight">Peran BHP sebagai Pengampu Pengawas dalam Mitigasi Sengketa Kewarisan Nasional.</h1>
                <p class="text-xs text-slate-500 font-medium">Laporan visualisasi data perkara perdata yang dimitigasi preventif di hulu melalui revitalisasi fungsi Balai Harta Peninggalan (BHP) sebagai Pengampu Pengawas di Indonesia.</p>
            </div>
            
            <div class="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl md:max-w-[280px]">
                <h4 class="text-[10px] font-black tracking-widest text-amber-600 uppercase mb-1">Status Intervensi BHP</h4>
                <p class="text-sm font-bold text-slate-800 leading-snug">${bhp ? "AKTIF" : "NON-AKTIF"}</p>
                <p class="text-[10px] text-slate-500 font-medium mt-1">${bhp ? "✓ Pengampuan dan Peran BHP sebagai Pengampu lebih dikenal mengalihkan 80% kasus" : "Menunjukkan volume beban peradilan riil tanpa mitigasi preventif"}</p>
            </div>
        </div>

        <!-- CORE STATS CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span class="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Total Perkara Sengketa</span>
                <div class="font-serif text-3xl font-bold text-slate-900">${totalHilirRawOnly.toLocaleString("id-ID")} <span class="text-xs font-normal text-slate-500">perkara</span></div>
                <div class="text-[10px] text-slate-500 font-mono mt-1">Data Perkara MA 2025</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span class="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Total Perkara Pengampuan</span>
                <div class="font-serif text-3xl font-bold text-slate-900">${(totalAllRaw - totalHilirRawOnly).toLocaleString("id-ID")} <span class="text-xs font-normal text-slate-500">perkara</span></div>
                <div class="text-[10px] text-slate-500 font-mono mt-1">Data Perkara MA 2025</div>
            </div>
            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <span class="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Volume Perkara Terhindari</span>
                <div class="font-serif text-3xl font-bold text-slate-900 text-emerald-600">${stats.dicegah.toLocaleString("id-ID")} <span class="text-xs font-normal text-slate-500">perkara</span></div>
                <div class="text-[10px] text-emerald-600 font-medium font-mono mt-1">✓ Berhasil Dialihkan ke Hulu</div>
            </div>
        </div>

        <!-- METRICS GRAPHIC SECTIONS -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Summary Donut Values -->
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm col-span-1 flex flex-col justify-between">
                <div>
                    <h3 class="text-md font-serif font-bold text-slate-950 border-b border-slate-100 pb-3 mb-4">Proporsi Perkara Terkalkulasi</h3>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between text-xs font-semibold p-2.5 bg-slate-50 rounded-xl">
                            <span class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-rose-500 inline-block"></span>Sengketa Hilir</span>
                            <span class="font-mono">${stats.beban.toLocaleString("id-ID")} perkara (${stats.pctHilir}%)</span>
                        </div>
                        <div class="flex items-center justify-between text-xs font-semibold p-2.5 bg-slate-50 rounded-xl">
                            <span class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-blue-500 inline-block"></span>Pengampuan Hulu</span>
                            <span class="font-mono">${stats.pengampuan.toLocaleString("id-ID")} perkara (${stats.pctHulu}%)</span>
                        </div>
                        ${bhp && stats.dicegah > 0 ? `
                        <div class="flex items-center justify-between text-xs font-semibold p-2.5 bg-slate-50 rounded-xl">
                            <span class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-amber-500 inline-block"></span>Sengketa Terfilter</span>
                            <span class="font-mono">${stats.dicegah.toLocaleString("id-ID")} perkara</span>
                        </div>
                        ` : ""}
                    </div>
                </div>
                <div class="text-[10px] text-slate-400 font-medium mt-6">
                    Stakeholder Filter: <strong>${sh}</strong>
                </div>
            </div>

            <!-- List Table summary -->
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
                <h3 class="text-md font-serif font-bold text-slate-950 border-b border-slate-100 pb-3 mb-4">Ringkasan Statistik Perkara</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-200">
                                <th class="p-3 text-center">No</th>
                                <th class="p-3">Perkara</th>
                                <th class="p-3 text-center">Sifat</th>
                                <th class="p-3 text-right">Jumlah</th>
                                <th class="p-3 text-center">Risiko</th>
                                <th class="p-3 text-center">Stakeholder</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- PRINT BREAK PAGE -->
        <div class="print-break"></div>

        <!-- CORNER DETAILS PANELS (ALL CASES LIST WITH FULL DETAILS) -->
        <section class="space-y-6">
            <div class="border-b border-slate-200 pb-3">
                <h2 class="text-xl font-serif font-black text-slate-950">Detail Analisis Khusus Perkara BHP</h2>
                <p class="text-xs text-slate-500">Berikut transkripsi komprehensif, sosiologis, yuridis, dan supervisi setiap perkara yang dinilai:</p>
            </div>
            
            <div class="space-y-6">
                ${caseRows}
            </div>
        </section>

        <!-- OFFICIAL SIGNATURE PANEL -->
        <footer class="border-t border-slate-200 pt-6 mt-12 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 font-semibold uppercase select-none">
            <div>BALAI HARTA PENINGGALAN (BHP) &nbsp;•&nbsp; DIREKTORAT PERDATA AHU</div>
            <div>VERSI EKSPOR MANUAL DETIL &nbsp;•&nbsp; GENERATED OKTAF-BHP</div>
        </footer>

    </div>

</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BHP_Laporan_Intervensi_${bhp ? "Intervensi_Aktif" : "Non_Intervensi"}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast("Seluruh laporan interaktif berhasil diekspor sebagai dokumen HTML mandiri siap cetak!");
  };

  const toggleSort = (col: keyof CaseData) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/*════════════════ WELCOME PORTRAIT POPUP MODAL ════════════════*/}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-[10px] p-4 overflow-y-auto no-print"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800/85 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-center select-none"
            >
              {/* Decorative golden ambient lamp glow at the top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1.5px] bg-gradient-to-r from-amber-500/20 via-amber-400 to-amber-500/20 blur-[1px] rounded-full" />
              
              {/* Security badge & system indicator */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/30 tracking-widest leading-none">
                  <Shield className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Sistem Keamanan Akses
                </span>
                <p className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                  Balai Harta Peninggalan – Kementerian Hukum RI
                </p>
              </div>

              {/* Gambar Tim Wilayah II */}
              <img src="/foto-tim.png" alt="Foto Tim Wilayah II" className="w-full max-h-[400px] object-contain mx-auto rounded-lg shadow-lg mb-6" />

              {/* Names block */}
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-serif font-black text-white leading-tight">
                  <span className="block text-amber-400 font-sans text-xs sm:text-sm font-black tracking-widest uppercase mb-1">Nama Tim</span>
                  Tim Wilayah II BHP Medan <span className="block text-amber-400 font-sans text-lg font-black tracking-wide mt-1 animate-pulse">(Tim Kicau Mania)</span>
                </h2>
                
                {/* Motto block */}
                <div className="py-2.5 px-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 inline-block mx-auto max-w-md w-full">
                  <span className="text-[9px] text-slate-500 font-black tracking-widest uppercase block mb-1">Motto Perjuangan</span>
                  <p className="text-base sm:text-lg font-serif italic text-amber-300 font-black tracking-wide leading-relaxed filter drop-shadow">
                    "Jangan Tau Capek, Jangan Tau Malu"
                  </p>
                </div>
              </div>

              {/* Unlock Action Button */}
              <button
                onClick={() => {
                  setShowWelcome(false);
                  setToast("Akses diizinkan. Selamat menganalisis data!");
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs tracking-widest uppercase rounded-2xl transition-all shadow-lg shadow-amber-500/10 active:scale-[0.985] cursor-pointer"
              >
                Lihat Chart
              </button>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Hover Preview HUD Follower */}
      <FloatingPreview activeCase={hoveredCase} x={mousePos.x} y={mousePos.y} totalVolume={stats.total} />

      {/* Interactive Donut Segment Tooltip */}
      <DonutTooltip activeSegment={hoveredDonut} stats={stats} donutTotal={donutTotal} x={mousePos.x} y={mousePos.y} />

      {/*════════════════ HEADER ════════════════*/}
      <header className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b-2 border-indigo-500/30 shadow-2xl overflow-hidden">
        {/* Background visual detail */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.15),_rgba(245,158,11,0.08),_transparent_55%)]" />
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-0 w-80 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Top Mini bar */}
        <div className="bg-black/40 backdrop-blur-md px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[10px] sm:text-[11px] font-black text-slate-300 tracking-wider uppercase border-b border-white/[0.04] select-none">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-slate-150 tracking-widest">Kementerian Hukum Republik Indonesia</span>
            <span className="text-slate-600 font-normal">|</span>
            <span className="text-amber-400 font-serif lowercase tracking-wide italic normal-case">Balai Harta Peninggalan Medan (UPT)</span>
          </div>
          <div className="text-slate-400 font-mono tracking-normal capitalize text-[10px] hidden md:inline-block">
            Portal Informasi Regional Layanan Pengampuan Pengawas Perdata Ahli Waris Rentan
          </div>
        </div>

        {/* Main Header Content */}
        <div className="px-6 py-7 md:py-9 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-600/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.22)] flex-shrink-0 active:scale-95 transition-transform duration-200">
              <Gavel className="w-8 h-8" />
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black tracking-wider text-amber-400 bg-amber-500/20 border border-amber-500/50 px-3.5 py-1.5 rounded-lg font-sans uppercase shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                  Balai Harta Peninggalan Medan
                </span>
              </div>
              <h1 className="font-serif font-black text-2xl md:text-3xl text-white tracking-tight leading-snug">
                Peran <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-black font-serif">Balai Harta Peninggalan</span> Sebagai Pengampu Pengawas dalam Mitigasi Sengketa Kewarisan & Keperdataan Keluarga
                <span className="block text-slate-100 font-sans text-sm md:text-base font-semibold mt-2 leading-relaxed max-w-3xl">
                  Menerapkan pengawasan tertib demi hukum dalam melindungi harta kekayaan warga di bawah pengampuan, guna memitigasi serta menekan sengketa waris perdata secara preventif dan profesional di tingkat nasional.
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Metrics display */}
          <div className="flex items-center gap-4 flex-wrap xl:flex-nowrap shrink-0 w-full xl:w-auto mt-2 xl:mt-0">
            {[
              { 
                label: "Jumlah Sengketa", 
                val: totalHilirRawOnly, 
                sub: "Kasus Masuk MA 2025", 
                icon: AlertOctagon, 
                textColor: "text-rose-300", 
                valColor: "text-white drop-shadow-[0_2px_4px_rgba(244,63,94,0.3)]",
                subColor: "text-rose-200",
                bg: "bg-rose-950/85", 
                border: "border-rose-450/60 shadow-[0_0_18px_rgba(244,63,94,0.25)]" 
              },
              { 
                label: "Perkara Pengampuan", 
                val: totalAllRaw - totalHilirRawOnly, 
                sub: "Cakupan BHP Medan", 
                icon: Shield, 
                textColor: "text-indigo-300", 
                valColor: "text-white drop-shadow-[0_2px_4px_rgba(99,102,241,0.3)]",
                subColor: "text-indigo-200",
                bg: "bg-indigo-950/85", 
                border: "border-indigo-450/60 shadow-[0_0_18px_rgba(99,102,241,0.25)]" 
              },
              { 
                label: "Akurasi Data", 
                val: "100%", 
                sub: "Sinkronisasi Terintegrasi", 
                icon: CheckCircle2, 
                textColor: "text-emerald-300", 
                valColor: "text-white drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]",
                subColor: "text-emerald-250",
                bg: "bg-emerald-950/85", 
                border: "border-emerald-450/60 shadow-[0_0_18px_rgba(16,185,129,0.25)]" 
              }
            ].map((m, idx) => (
              <div
                key={m.label}
                className={`border-2 rounded-2xl p-5 flex-1 xl:flex-none min-w-[200px] hover:scale-[1.04] hover:border-white transition-all duration-300 shadow-xl ${m.bg} ${m.border}`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm tracking-wider font-extrabold uppercase text-white">{m.label}</span>
                  <m.icon className={`w-5.5 h-5.5 ${m.textColor}`} />
                </div>
                <div className={`text-3xl md:text-4xl font-mono font-black tracking-tight leading-none ${m.valColor}`}>
                  {typeof m.val === "number" ? m.val.toLocaleString("id-ID") : m.val}
                </div>
                <div className="text-xs text-white/90 font-extrabold mt-1.5 flex items-center gap-1">
                  <span>{m.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/*════════════════ NOTIFICATION TOAST ════════════════*/}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 dark:border-slate-200 backdrop-blur-md flex items-center gap-2.5 max-w-sm pointer-events-none"
          >
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 animate-spin" />
            <span className="text-xs md:text-sm font-semibold">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/*════════════════ MAIN CONTAINER ════════════════*/}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/*── 1. FILTERS & OPTIONS BAR ──*/}
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-5 relative z-20">
          
          {/* BHP Simulation Toggle - Eye Catching */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setBhp(!bhp);
                setToast(bhp ? "Simulasi intervensi dinonaktifkan." : "Simulasi intervensi Balai Harta Peninggalan diaktifkan! Kasus hilir berkurang 80%.");
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                bhp ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  bhp ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs md:text-sm font-black text-slate-950 dark:text-white uppercase tracking-wide">
                  Model Intervensi Aktif BHP
                </span>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black px-2 py-0.5 rounded-lg border-2 border-indigo-200 dark:border-indigo-900/50">
                  Simulasi
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-800 dark:text-slate-200 font-bold mt-1">
                {bhp
                  ? "✓ Pengampuan dan Peran BHP sebagai Pengampu lebih dikenal mengalihkan 80% kasus"
                  : "Menunjukkan volume beban peradilan riil tanpa mitigasi preventif"}
              </p>
            </div>
          </div>

          <div className="hidden lg:block w-px h-8 bg-slate-200 dark:bg-slate-800" />

          {/* Stakeholder Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-black text-slate-950 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              Filter Lembaga:
            </span>
            <div className="relative bg-slate-200 dark:bg-slate-950 p-1 rounded-xl border-2 border-slate-300/80 dark:border-slate-800 flex gap-1 items-center overflow-x-auto scrollbar-none max-w-full">
              {SH_LIST.map((s) => {
                const isActive = sh === s;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setSh(s);
                      setDonutFocus("global");
                      setToast(`Data difilter berdasarkan kemitraan: ${s}`);
                    }}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all duration-200 z-10 select-none shrink-0 ${
                      isActive
                        ? "text-white"
                        : "text-slate-850 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeStakeholder"
                        className="absolute inset-0 bg-slate-900 dark:bg-slate-850 rounded-lg -z-10 shadow-sm"
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      />
                    )}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar & export */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Cari perkara/sifat/risiko..."
                className="w-full text-xs font-black bg-slate-100 dark:bg-slate-950 border-2 border-slate-350 dark:border-slate-800 rounded-xl py-2 pl-9 pr-8 text-slate-950 dark:text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder-slate-500 font-sans transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Export & Layout triggers */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all border border-slate-200/70 dark:border-slate-800"
                title="Ekspor Laporan dalam format CSV"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                <span>CSV</span>
              </button>

              <button
                onClick={handleExportHTML}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all border border-slate-200/70 dark:border-slate-800"
                title="Ekspor Laporan dalam format HTML Mandiri Siap Cetak"
              >
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>HTML</span>
              </button>

              <button
                onClick={() => setDark(!dark)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200/70 dark:border-slate-800 transition-all"
                title="Ubah tema visual"
              >
                {dark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              </button>

              <button
                onClick={() => window.print()}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200/70 dark:border-slate-800 transition-all shrink-0"
                title="Cetak Laporan / Simpan PDF"
              >
                <Printer className="w-4 h-4 text-emerald-500" />
              </button>
            </div>
          </div>
        </div>

        {/*── 2. STATS KPI HERO SECTION ──*/}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard
            label="Beban Sengketa Ahli Waris (Hilir)"
            value={stats.beban}
            note={
              bhp
                ? "Sisa perkara terpaksa di pengadilan setelah saringan ketat BHP"
                : "Volume persidangan peradilan keluarga tanpa mitigasi mediasi"
            }
            color="#DC2626"
            bgLight={dark ? "#0f172a" : "#FFF5F5"}
            borderColor={dark ? "#1e293b" : "#FCA5A5"}
            Icon={TrendingDown}
            pctVal={stats.pctHilir}
            ringColor="#DC2626"
            isSimulated={bhp}
            dark={dark}
          />

          <MetricCard
            label="Volume Kasus Terpelihara / Dicegah"
            value={stats.dicegah}
            note={
              bhp
                ? "Sengketa kewarisan masif yang berhasil diredam menjadi pengampuan tertib"
                : "Potensi mitigasi jika Balai Harta Peninggalan dilibatkan maksimal"
            }
            color="#D97706"
            bgLight={dark ? "#0f172a" : "#FFFBEB"}
            borderColor={dark ? "#1e293b" : "#FDE68A"}
            Icon={Shield}
            pctVal={bhp ? 80 : 0}
            ringColor="#D97706"
            isSimulated={bhp}
            dark={dark}
          />

          <MetricCard
            label="Tata Kelola Pengampuan Aktif (Hulu)"
            value={stats.pengampuan}
            note={
              bhp
                ? "Total akumulasi pengampuan preventif yang diawasi tertib oleh BHP"
                : "Pengampuan dasar terdaftar sebelum optimalisasi preventif"
            }
            color="#2563EB"
            bgLight={dark ? "#0f172a" : "#EFF6FF"}
            borderColor={dark ? "#1e293b" : "#BFDBFE"}
            Icon={Users}
            pctVal={stats.pctHulu}
            ringColor="#2563EB"
            isSimulated={bhp}
            dark={dark}
          />
        </div>

        {/*── 3. BENTO GRID - SPLIT VIEW FOR DESKTOP (ELIMINATES PAGE SCROLLING) ──*/}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Distribution Breakdown Chart & Table Tabs (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              
              {/* Tab Header Controls */}
              <div className="border-b border-slate-250 dark:border-slate-800 px-5 py-4 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="relative flex gap-1.5 p-1 bg-slate-205 dark:bg-slate-800 rounded-xl">
                  <button
                    onClick={() => { setTab("chart"); }}
                    className={`relative flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-colors duration-205 z-10 select-none ${
                      tab === "chart"
                        ? "text-slate-950 dark:text-white"
                        : "text-slate-700 dark:text-slate-205 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    {tab === "chart" && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-white dark:bg-slate-900 rounded-lg shadow-md -z-10"
                        transition={{ type: "spring", stiffness: 360, damping: 26 }}
                      />
                    )}
                    <BarChart2 className="w-4 h-4 text-indigo-500" />
                    Grafik Bar Volume
                  </button>
                  <button
                    onClick={() => { setTab("table"); }}
                    className={`relative flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-colors duration-250 z-10 select-none ${
                      tab === "table"
                        ? "text-slate-950 dark:text-white"
                        : "text-slate-700 dark:text-slate-205 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    {tab === "table" && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-white dark:bg-slate-900 rounded-lg shadow-md -z-10"
                        transition={{ type: "spring", stiffness: 360, damping: 26 }}
                      />
                    )}
                    <TableIcon className="w-4 h-4 text-indigo-500" />
                    Format Tabel Data
                  </button>
                  <button
                    onClick={() => { setTab("map"); }}
                    className={`relative flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-colors duration-250 z-10 select-none ${
                      tab === "map"
                        ? "text-slate-950 dark:text-white"
                        : "text-slate-700 dark:text-slate-205 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    {tab === "map" && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-white dark:bg-slate-900 rounded-lg shadow-md -z-10"
                        transition={{ type: "spring", stiffness: 360, damping: 26 }}
                      />
                    )}
                    <Map className="w-4 h-4 text-indigo-500" />
                    Peta Wilayah Kerja BHP
                  </button>
                </div>

                {/* Subtitle helper description */}
                <div className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wider uppercase flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-500" />
                  Sentuh baris untuk mencermati panel detail
                </div>
              </div>

              {/* BAR CHART TAB CONTENT */}
              {tab === "chart" && (
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 relative overflow-hidden">
                  {/* WATERMARK ANTI-MALING */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                    <p className="text-slate-900/[0.06] dark:text-white/[0.04] font-sans font-black uppercase tracking-widest text-xl sm:text-2xl md:text-3xl text-center max-w-md rotate-[-12deg] leading-tight select-none">
                      Penelitian Milik Wilayah II BHP Medan
                    </p>
                  </div>
                  {visibleBar.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 space-y-2">
                      <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                      <div className="text-sm font-bold">Data perkara tidak ditemukan</div>
                      <p className="text-xs max-w-xs mx-auto text-slate-500">
                        Coba bersihkan parameter pencarian atau filter stakeholder saat ini.
                      </p>
                    </div>
                  ) : (
                    <motion.div layout className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {visibleBar.map((item, index) => {
                          const isHilir = item.sifat === "Hilir";
                          const activeColor = isHilir
                            ? (dark ? "#F87171" : "#DC2626")
                            : (dark ? "#60A5FA" : "#2563EB");
                          const progressBg = isHilir
                            ? "bg-red-500/10 dark:bg-red-500/20"
                            : "bg-blue-500/10 dark:bg-blue-500/20";
                          const isSelected = currentDetails?.id === item.id;
                          const isSelfHovered = hoveredCase?.id === item.id;
                          const hasHoverActive = hoveredCase !== null;

                          const itemOpacity = !hasHoverActive 
                            ? 1 
                            : (isSelfHovered ? 1 : 0.45);

                          const itemScale = !hasHoverActive
                            ? 1
                            : (isSelfHovered ? 1.025 : 0.98);

                          const delayTime = hasAnimCompleted ? 0 : Math.min(index * 0.04, 0.3);

                          return (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95, y: 15 }}
                              animate={{ opacity: itemOpacity, scale: itemScale, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -15, transition: { duration: 0.18 } }}
                              whileTap={{ scale: 0.97, y: 1, transition: { duration: 0.04 } }}
                              transition={{
                                type: "spring",
                                stiffness: 220,
                                damping: 24,
                                layout: { type: "spring", stiffness: 220, damping: 25 },
                                opacity: { delay: delayTime, duration: 0.2 },
                                scale: { delay: delayTime, duration: 0.2 },
                                y: { delay: delayTime, type: "spring", stiffness: 220, damping: 24 }
                              }}
                              onMouseMove={handleMouseMove}
                              onMouseEnter={() => setHoveredCase(item)}
                              onMouseLeave={() => setHoveredCase(null)}
                              onClick={() => {
                                setSel(item);
                                setDonutFocus("perkara");
                                setMobileOpen(true);
                                setToast(`Fokus analisa disematkan ke perkara: ${item.perkara}`);
                              }}
                              className={`group relative border-2 rounded-2xl p-4 flex items-center gap-4 cursor-pointer select-none transition-all duration-200 ${
                                isSelected
                                  ? isHilir
                                    ? "border-red-500 bg-red-500/10 dark:bg-red-950/40 shadow-lg ring-2 ring-red-500/20"
                                    : "border-blue-500 bg-blue-500/10 dark:bg-blue-950/40 shadow-lg ring-2 ring-blue-500/20"
                                  : isSelfHovered
                                    ? isHilir
                                      ? "border-red-400 bg-red-50/70 dark:bg-red-950/30 shadow-md ring-2 ring-red-500/10"
                                      : "border-blue-400 bg-blue-50/70 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/10"
                                    : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                              }`}
                            >
                              {/* Counter Index */}
                              <div
                                className={`hidden sm:flex h-7 w-7 rounded-lg text-xs font-black items-center justify-center border transition-all flex-shrink-0 ${
                                  isSelected
                                    ? "text-white border-transparent"
                                    : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                                }`}
                                style={{
                                  backgroundColor: isSelected ? activeColor : "transparent",
                                  borderColor: isSelected ? activeColor : undefined
                                }}
                              >
                                {index + 1}
                              </div>

                              {/* Name & Sifat Badges */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  <span className="font-serif font-bold text-xs lg:text-sm text-slate-900 dark:text-slate-100 whitespace-normal break-words leading-tight flex-1 group-hover:text-amber-500 transition-colors">
                                    {item.perkara}
                                  </span>
                                  <span
                                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                                      isHilir
                                        ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                                        : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                                    }`}
                                  >
                                    {item.sifat}
                                  </span>
                                </div>

                                {/* Progress bar line */}
                                <div className={`w-full h-3 rounded-full overflow-hidden ${progressBg}`}>
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: activeColor }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.pct}%` }}
                                    transition={{ type: "spring", stiffness: 110, damping: 17 }}
                                  />
                                </div>
                              </div>

                              {/* Data Value */}
                              <div className="text-right flex-shrink-0">
                                <span className="font-serif font-black text-base lg:text-lg tracking-tight" style={{ color: activeColor }}>
                                  {item.disp.toLocaleString("id-ID")}
                                </span>
                                <div className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">
                                  Perkara
                                </div>
                              </div>

                              {/* Dynamic changes indicator under simulation */}
                              {bhp && isHilir && (
                                <div className="hidden md:flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-1 rounded-lg">
                                  <TrendingDown className="w-3.5 h-3.5" />
                                  80% Dialihkan
                                </div>
                              )}

                              {/* Chevron right indicator */}
                              <ChevronRight
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isSelected ? "translate-x-1" : "opacity-30 group-hover:opacity-100"
                                }`}
                                style={{ color: activeColor }}
                              />
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </motion.div>
                  )}
                  
                  {/* Visual ratio footer bar */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        Rasio Hulu-Hilir Terhitung
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        Model {bhp ? "Setelah Intervensi Preventif BHP" : "Kondisi Alami Tanpa Filter BHP"}
                      </p>
                    </div>

                    <div className="flex-1 w-full max-w-sm space-y-1.5">
                      <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                        <motion.div
                          className="bg-red-500 h-full"
                          animate={{ width: `${stats.pctHilir}%` }}
                          transition={{ duration: 0.6 }}
                        />
                        <motion.div
                          className="bg-blue-600 h-full"
                          animate={{ width: `${stats.pctHulu}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-black">
                        <span className="text-red-500">Hilir (Sengketa): {stats.pctHilir}%</span>
                        <span className="text-blue-500">Hulu (Pengamaan): {stats.pctHulu}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DATA TABLE TAB CONTENT */}
              {tab === "table" && (
                <div className="overflow-x-auto relative min-h-[300px]">
                  {/* WATERMARK ANTI-MALING */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                    <p className="text-slate-900/[0.05] dark:text-white/[0.03] font-sans font-black uppercase tracking-widest text-xl sm:text-2xl md:text-3xl text-center max-w-md rotate-[-12deg] leading-tight select-none">
                      Penelitian Milik Wilayah II BHP Medan
                    </p>
                  </div>
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-900/10 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                        <th className="p-4 w-12 text-center pointer-events-none select-none">#</th>
                        
                        <th
                          className="p-4 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => toggleSort("perkara")}
                        >
                          Jenis Sengketa / Perkara {sortCol === "perkara" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </th>
                        
                        <th
                          className="p-4 text-right cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => toggleSort("jumlah")}
                        >
                          Reg. Jumlah Perkara {sortCol === "jumlah" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </th>

                        <th
                          className="p-4 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => toggleSort("sifat")}
                        >
                          Sifat {sortCol === "sifat" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </th>

                        <th className="p-4 pointer-events-none">Stakeholder Terkait</th>
                        
                        <th
                          className="p-4 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => toggleSort("risiko")}
                        >
                          Tingkat Risiko {sortCol === "risiko" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <AnimatePresence mode="popLayout">
                        {sortedTableData.map((item, index) => {
                          const isHilir = item.sifat === "Hilir";
                          const isSelected = currentDetails?.id === item.id;
                          const delayTime = hasAnimCompleted ? 0 : Math.min(index * 0.035, 0.25);

                          return (
                            <motion.tr
                              key={item.id}
                              layout
                              initial={{ opacity: 0, scale: 0.97, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.97, y: -10, transition: { duration: 0.18 } }}
                              transition={{
                                type: "spring",
                                stiffness: 220,
                                damping: 24,
                                layout: { type: "spring", stiffness: 240, damping: 26 },
                                opacity: { delay: delayTime, duration: 0.2 },
                                scale: { delay: delayTime, duration: 0.2 },
                                y: { delay: delayTime, type: "spring", stiffness: 220, damping: 24 }
                              }}
                              onClick={() => {
                                setSel(item);
                                setDonutFocus("perkara");
                                setMobileOpen(true);
                                setToast(`Fokus analisa disematkan ke perkara: ${item.perkara}`);
                              }}
                              className={`cursor-pointer transition-colors duration-150 ${
                                isSelected
                                  ? isHilir
                                    ? "bg-red-500/10 dark:bg-red-950/40 font-medium"
                                    : "bg-blue-500/10 dark:bg-blue-950/40 font-medium"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>
                              
                              <td className="p-4">
                                <span className="font-serif font-bold text-slate-900 dark:text-slate-100 block">
                                  {item.perkara}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 md:line-clamp-none mt-0.5 font-sans whitespace-normal leading-normal">
                                  {item.core}
                                </span>
                              </td>
                              
                              <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-slate-300">
                                {item.disp.toLocaleString("id-ID")}
                              </td>
                              
                              <td className="p-4">
                                <span
                                  className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full ${
                                    isHilir
                                      ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                                      : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                  }`}
                                >
                                  {item.sifat}
                                </span>
                              </td>
                              
                              <td className="p-4">
                                <div className="flex gap-1.5 flex-wrap">
                                  {item.stakeholder.map((stk) => (
                                    <span
                                      key={stk}
                                      className="text-[9px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/60"
                                    >
                                      {stk}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              
                              <td className="p-4">
                                <span
                                  className="text-[10px] font-black tracking-wide px-2.5 py-0.5 rounded-lg border inline-block"
                                  style={{
                                    borderColor: getRiskColor(item.risiko, dark),
                                    color: getRiskColor(item.risiko, dark),
                                    backgroundColor: isHilir
                                      ? (dark ? "rgba(248, 113, 113, 0.15)" : "rgba(220, 38, 38, 0.05)")
                                      : (dark ? "rgba(96, 165, 250, 0.15)" : "rgba(37, 99, 235, 0.05)")
                                  }}
                                >
                                  {item.risiko}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 font-black text-slate-900 dark:text-white">
                        <td colSpan={2} className="p-4 text-right tracking-widest uppercase text-[10px] text-slate-400">
                          Total {sh !== "Semua" ? `Kemitraan ${sh}` : "Seluruh Perkara"}:
                        </td>
                        <td className="p-4 text-right font-serif text-lg text-indigo-600 dark:text-indigo-400">
                          {stats.total.toLocaleString("id-ID")}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* GEO-MAP TAB CONTENT */}
              {tab === "map" && (
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <BhpMap
                    isSimulated={bhp}
                    selectedOffice={selectedOffice}
                    onSelectOffice={(office) => {
                      setSelectedOffice(office);
                      setToast(`Fokus pemetaan diubah: ${office}`);
                    }}
                    dark={dark}
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Dynamic Insight & Urgency Panel (lg:col-span-4) - Sticky (STAYS VISIBLE) */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
            
            {/* ILLUSTRATIVE DONUT CARD */}
            <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col items-center">
              <div className="flex items-center justify-between gap-1.5 w-full border-b border-slate-150 dark:border-slate-800 pb-2.5 mb-2.5">
                <span className="text-xs md:text-sm font-black text-slate-850 dark:text-slate-200 tracking-wider uppercase">
                  Dinamika Proporsi Kasus
                </span>
                
                {/* Micro Toggle Switch */}
                <div className="relative bg-slate-205 dark:bg-slate-950 p-0.5 rounded-lg border-2 border-slate-300 dark:border-slate-800 flex text-xs uppercase font-black tracking-wide">
                  <button
                    onClick={() => {
                      setDonutFocus("global");
                      setToast("Proporsi Donut dialihkan ke visualisasi global (seluruh perkara).");
                    }}
                    className={`relative px-2 py-1 rounded transition-colors duration-200 z-10 select-none ${
                      donutFocus === "global"
                        ? "text-indigo-600 dark:text-amber-500 font-black"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    {donutFocus === "global" && (
                      <motion.div
                        layoutId="activeDonutTabSpec"
                        className="absolute inset-0 bg-white dark:bg-slate-800 rounded shadow-xs -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      />
                    )}
                    Global
                  </button>
                  <button
                    onClick={() => {
                      if (!currentDetails) {
                        setToast("Silakan pilih perkara di tabel terlebih dahulu.");
                        return;
                      }
                      setDonutFocus("perkara");
                      setToast("Proporsi Donut dialihkan ke detail perkara terpilih.");
                    }}
                    className={`relative px-2 py-1 rounded transition-colors duration-200 z-10 select-none ${
                      donutFocus === "perkara"
                        ? "text-indigo-600 dark:text-amber-500 font-black"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    {donutFocus === "perkara" && (
                      <motion.div
                        layoutId="activeDonutTabSpec"
                        className="absolute inset-0 bg-white dark:bg-slate-800 rounded shadow-xs -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      />
                    )}
                    Fokus
                  </button>
                </div>
              </div>

              {/* Dynamic SVG Donut Layout */}
              <div className="relative my-6 select-none">
                <svg
                  width="180"
                  height="180"
                  viewBox="0 0 180 180"
                  className="transform -rotate-90"
                >
                  {/* Outer shadow ring */}
                  <circle
                    cx="90"
                    cy="90"
                    r="64"
                    fill="none"
                    stroke="rgba(0,0,0,0.02)"
                    strokeWidth="18"
                  />
                  {/* Base track circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r="64"
                    fill="none"
                    stroke={dark ? "#1e293b" : "#E2E8F0"}
                    strokeWidth="14"
                  />
                  {/* Dynamic segments generator */}
                  {(() => {
                    const radius = 64;
                    const circumference = 2 * Math.PI * radius;
                    let accumulatedPercent = 0;

                    return donutSegments.map((seg, i) => {
                      const segmentPct = donutTotal > 0 ? (seg.v / donutTotal) * 100 : 0;
                      const strokeDasharray = `${(segmentPct / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += segmentPct;
                      const isHovered = hoveredDonut?.label === seg.label;

                      return (
                        <motion.circle
                          key={seg.label}
                          cx="90"
                          cy="90"
                          r={radius}
                          fill="none"
                          stroke={seg.c}
                          strokeWidth={isHovered ? 18 : 14}
                          strokeDasharray={strokeDasharray}
                          initial={{ strokeDashoffset: circumference }}
                          animate={{ strokeDashoffset }}
                          whileHover={{ strokeWidth: 18 }}
                          transition={{ type: "spring", stiffness: 100, damping: 15, delay: i * 0.05 }}
                          strokeLinecap="round"
                          className="cursor-pointer origin-center transition-all duration-150"
                          onMouseMove={handleMouseMove}
                          onMouseEnter={() => setHoveredDonut(seg)}
                          onMouseLeave={() => setHoveredDonut(null)}
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Donut Innards Text HUD */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none mb-0.5">
                    {donutFocus === "perkara" ? "Beban Kasus" : "Total Volume"}
                  </span>
                  
                  <div className="h-10 flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={donutTotal}
                        initial={{ opacity: 0, scale: 0.8, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        transition={{ type: "spring", stiffness: 220, damping: 18 }}
                        className="text-2xl font-black font-serif text-slate-950 dark:text-white tracking-tighter"
                      >
                        {donutTotal.toLocaleString("id-ID")}
                      </motion.span>
                    </AnimatePresence>
                  </div>

                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">
                    {donutFocus === "perkara" ? "Kasus Terpilih" : "Register Rill"}
                  </span>
                </div>
              </div>

              {/* Legends list */}
              <div className="w-full space-y-2">
                {donutSegments.map((seg) => {
                  const segmentPct = donutTotal > 0 ? Math.round((seg.v / donutTotal) * 100) : 0;
                  const isHovered = hoveredDonut?.label === seg.label;
                  return (
                    <div
                      key={seg.label}
                      onMouseMove={handleMouseMove}
                      onMouseEnter={() => setHoveredDonut(seg)}
                      onMouseLeave={() => setHoveredDonut(null)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition-all duration-150 ${
                        isHovered
                          ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm scale-[1.02]"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded shrink-0 transition-transform duration-150" style={{ backgroundColor: seg.c, transform: isHovered ? "scale(1.2)" : "none" }} />
                        <span className="font-bold text-slate-700 dark:text-slate-300">{seg.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-[11px] font-mono text-slate-400">{seg.v.toLocaleString("id-ID")}</span>
                        <span className="font-black" style={{ color: seg.c }}>
                          {segmentPct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STICKY INSIGHTS DETAIL TAB PANEL */}
            {currentDetails && (
              <motion.div
                key={currentDetails.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="hidden lg:flex card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden flex-col"
              >
                {/* Header panel with background color mapping */}
                <div
                  className="px-5 py-4 flex items-center justify-between border-b gap-3 relative overflow-hidden"
                  style={{
                    borderBottomColor: currentDetails.sifat === "Hilir" ? "rgba(220, 38, 38, 0.2)" : "rgba(37, 99, 235, 0.2)",
                    background:
                      currentDetails.sifat === "Hilir"
                        ? "linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)"
                        : "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.02) 100%)"
                  }}
                >
                  <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                        Detail Analisis Khusus BHP
                      </span>
                    </div>
                    <h3 className="font-serif font-black text-slate-950 dark:text-white text-base leading-tight">
                      {currentDetails.perkara}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0 relative z-10 font-mono text-[10px]">
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider"
                      style={{
                        backgroundColor:
                          currentDetails.sifat === "Hilir"
                            ? "rgba(248, 113, 113, 0.15)"
                            : "rgba(96, 165, 250, 0.15)",
                        color: currentDetails.sifat === "Hilir"
                          ? (dark ? "#F87171" : "#DC2626")
                          : (dark ? "#60A5FA" : "#2563EB")
                      }}
                    >
                      {currentDetails.sifat}
                    </span>
                    <span
                      className="font-black text-slate-500 dark:text-slate-400"
                      style={{ color: getRiskColor(currentDetails.risiko, dark) }}
                    >
                      Risiko {currentDetails.risiko}
                    </span>
                  </div>
                </div>

                {/* Sub Dimensions (Scroll-free because it is compact and sticky on desktop) */}
                <div className="p-4 space-y-3.5">
                  
                  {/* 1. Core Message */}
                  <div className="bg-amber-500/5 dark:bg-amber-500/10 border-l-3 border-amber-500 rounded-xl p-3">
                    <h5 className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                      <BookOpen className="w-4 h-4 text-amber-500" />
                      Core Message Perkara
                    </h5>
                    <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-semibold">
                      {currentDetails.core}
                    </p>
                  </div>

                  {/* 2. Urgency and Risk */}
                  <div className="bg-red-500/5 dark:bg-red-500/10 border-l-3 border-red-500 rounded-xl p-3">
                    <h5 className="text-[11px] font-black text-red-800 dark:text-red-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Urgensi (Dampak Hukum)
                    </h5>
                    <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-semibold">
                      {currentDetails.urgensi}
                    </p>
                  </div>

                  {/* 3. Dimensi Filosofis */}
                  <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border-l-3 border-indigo-500 rounded-xl p-3">
                    <h5 className="text-[11px] font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                      <Scale className="w-4 h-4 text-indigo-500" />
                      Dimensi Filosofis Keadilan
                    </h5>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {currentDetails.filosofis}
                    </p>
                  </div>

                  {/* 4. Dimensi Sosiologis */}
                  <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border-l-3 border-emerald-500 rounded-xl p-3">
                    <h5 className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                      <Users className="w-4 h-4 text-emerald-500" />
                      Dimensi Sosiologis Keluarga
                    </h5>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {currentDetails.sosiologis}
                    </p>
                  </div>

                  {/* 5. Landasan Yuridis */}
                  <div className="bg-cyan-500/5 dark:bg-cyan-500/10 border-l-3 border-cyan-500 rounded-xl p-3">
                    <h5 className="text-[11px] font-black text-cyan-800 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                      <FileText className="w-4 h-4 text-cyan-500" />
                      Acuan hukum perdata pos
                    </h5>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {currentDetails.yuridis}
                    </p>
                  </div>

                  {/* 6. Legal Solution / Peran Utama Balai Harta Peninggalan */}
                  <div className="bg-slate-900 text-white dark:bg-slate-950 rounded-xl p-4 shadow-sm border border-slate-800 dark:border-slate-800 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">
                        <Shield className="w-4 h-4 text-amber-400" />
                        Supervisi Balai Harta Peninggalan
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        {currentDetails.penjelasanBhp}
                      </p>
                    </div>

                    {currentDetails.sumberHalaman && (
                      <div className="border-t border-slate-800 pt-3 mt-1 text-[11px] space-y-1.5">
                        <span className="text-[10px] font-black tracking-widest text-rose-450 dark:text-rose-400 uppercase block">
                          ✓ Korelasi Data Resmi Laporan Tahunan MA 2025
                        </span>
                        <div className="space-y-1">
                          <p className="text-slate-400 font-medium">
                            <strong className="text-slate-200">Referensi:</strong> {currentDetails.sumberHalaman} &nbsp;•&nbsp; {currentDetails.sumberTabel}
                          </p>
                          <p className="text-amber-400 font-black leading-snug">
                            <strong>Kategori/Pos Baris:</strong> {currentDetails.kategoriMa}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

          </div>

        </div>

        {/*── 4. PERSISTENT INFORMATIVE FOOTER SIGNATURE ──*/}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 select-none font-semibold tracking-wider uppercase">
          <div>
            KEMENTERIAN HUKUM RI &nbsp;•&nbsp; BALAI HARTA PENINGGALAN (BHP) &nbsp;•&nbsp; DIREKTORAT PERDATA AHU
          </div>
          <div>
            ANALITIS VERSI 4.1 PRO &nbsp;•&nbsp; DATA RESMI REGISTER PERKARA NASIONAL
          </div>
        </div>

      </main>

      {/*════════════════ MOBILE DETAIL BOTTOM SHEET MODAL ════════════════*/}
      <AnimatePresence>
        {mobileOpen && currentDetails && (
          <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              {/* Drag Handle Area */}
              <div className="flex flex-col items-center pt-3 pb-3 cursor-pointer select-none shrink-0" onClick={() => setMobileOpen(false)}>
                <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700/85 rounded-full" />
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest mt-1.5 uppercase select-none pointer-events-none">
                  Ketuk di sini atau tombol silang untuk menutup
                </span>
              </div>

              {/* Header */}
              <div
                className="px-5 py-4 flex items-center justify-between border-b gap-3 relative overflow-hidden"
                style={{
                  borderBottomColor: currentDetails.sifat === "Hilir" ? "rgba(220, 38, 38, 0.2)" : "rgba(37, 99, 235, 0.2)",
                  background:
                    currentDetails.sifat === "Hilir"
                      ? "linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)"
                      : "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.02) 100%)"
                }}
              >
                <div className="space-y-1 relative z-10 min-w-0">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Detail Analisis Khusus BHP
                  </span>
                  <h3 className="font-serif font-black text-slate-950 dark:text-white text-sm md:text-base leading-tight truncate">
                    {currentDetails.perkara}
                  </h3>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 relative z-10">
                  <div className="flex flex-col items-end gap-0.5 font-mono text-[9px]">
                    <span
                      className="font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider"
                      style={{
                        backgroundColor:
                          currentDetails.sifat === "Hilir"
                            ? "rgba(248, 113, 113, 0.15)"
                            : "rgba(96, 165, 250, 0.15)",
                        color: currentDetails.sifat === "Hilir"
                          ? (dark ? "#F87171" : "#DC2626")
                          : (dark ? "#60A5FA" : "#2563EB")
                      }}
                    >
                      {currentDetails.sifat}
                    </span>
                    <span
                      className="font-black text-slate-500 dark:text-slate-400"
                      style={{ color: getRiskColor(currentDetails.risiko, dark) }}
                    >
                      {currentDetails.risiko}
                    </span>
                  </div>

                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1 px-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-lg text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 space-y-3.5 overflow-y-auto pb-12">
                {/* 1. Core Message */}
                <div className="bg-amber-500/5 dark:bg-amber-500/10 border-l-3 border-amber-500 rounded-xl p-3">
                  <h5 className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    Core Message Perkara
                  </h5>
                  <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-semibold">
                    {currentDetails.core}
                  </p>
                </div>

                {/* 2. Urgency and Risk */}
                <div className="bg-red-500/5 dark:bg-red-500/10 border-l-3 border-red-500 rounded-xl p-3">
                  <h5 className="text-[11px] font-black text-red-800 dark:text-red-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Urgensi (Dampak Hukum)
                  </h5>
                  <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-semibold">
                    {currentDetails.urgensi}
                  </p>
                </div>

                {/* 3. Dimensi Filosofis */}
                <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border-l-3 border-indigo-500 rounded-xl p-3">
                  <h5 className="text-[11px] font-black text-indigo-800 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                    <Scale className="w-4 h-4 text-indigo-500" />
                    Dimensi Filosofis Keadilan
                  </h5>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {currentDetails.filosofis}
                  </p>
                </div>

                {/* 4. Dimensi Sosiologis */}
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border-l-3 border-emerald-500 rounded-xl p-3">
                  <h5 className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Dimensi Sosiologis Keluarga
                  </h5>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {currentDetails.sosiologis}
                  </p>
                </div>

                {/* 5. Landasan Yuridis */}
                <div className="bg-cyan-500/5 dark:bg-cyan-500/10 border-l-3 border-cyan-500 rounded-xl p-3">
                  <h5 className="text-[11px] font-black text-cyan-800 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-2.5 mb-1">
                    <FileText className="w-4 h-4 text-cyan-500" />
                    Acuan hukum perdata pos
                  </h5>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {currentDetails.yuridis}
                  </p>
                </div>

                {/* 6. Legal Solution / Peran Utama Balai Harta Peninggalan */}
                <div className="bg-slate-900 text-white dark:bg-slate-950 rounded-xl p-4 shadow-sm border border-slate-800 dark:border-slate-800 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">
                      <Shield className="w-4 h-4 text-amber-400" />
                      Supervisi Balai Harta Peninggalan
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                      {currentDetails.penjelasanBhp}
                    </p>
                  </div>

                  {currentDetails.sumberHalaman && (
                    <div className="border-t border-slate-800 pt-3 mt-1 text-[11px] space-y-1.5">
                      <span className="text-[10px] font-black tracking-widest text-rose-450 dark:text-rose-400 uppercase block">
                        ✓ Korelasi Data Resmi Laporan Tahunan MA 2025
                      </span>
                      <div className="space-y-1">
                        <p className="text-slate-400 font-medium">
                          <strong className="text-slate-200">Referensi:</strong> {currentDetails.sumberHalaman} &nbsp;•&nbsp; {currentDetails.sumberTabel}
                        </p>
                        <p className="text-amber-400 font-black leading-snug">
                          <strong>Kategori/Pos Baris:</strong> {currentDetails.kategoriMa}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/*════════════════ MOBILE PERSISTENT FLOATING ACCORDION BUTTON ════════════════*/}
      <AnimatePresence>
        {!mobileOpen && currentDetails && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 100, x: "-50%" }}
            onClick={() => setMobileOpen(true)}
            className="fixed bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-sm z-40 bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-sans font-bold text-xs p-3 px-4 rounded-full shadow-2xl flex items-center justify-between gap-3 cursor-pointer select-none ring-4 ring-indigo-600/15 dark:ring-amber-500/20 lg:hidden"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex-shrink-0 h-2.5 w-2.5 rounded-full bg-indigo-300 dark:bg-slate-900 animate-ping" />
              <span className="truncate pr-1">
                Detail: {currentDetails.perkara}
              </span>
            </div>
            <span className="flex items-center gap-1 flex-shrink-0 bg-white/20 dark:bg-slate-950/20 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
              Buka Analisa
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
