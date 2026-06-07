/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
const motionElement = motion;
import { 
  MapPin, 
  Shield, 
  Users, 
  FileText, 
  AlertTriangle, 
  Scale, 
  BookOpen, 
  RefreshCw, 
  Layers, 
  Search, 
  Info, 
  Briefcase, 
  Calendar,
  Building2,
  ListFilter,
  CheckCircle,
  X,
  CreditCard,
  UserCheck
} from "lucide-react";
import { BHP_MEDAN_ACTIVE_CASES, ActivePengampuanCase } from "../data/bhpMedanCases";

interface BhpMapProps {
  isSimulated: boolean;
  selectedOffice: string;
  onSelectOffice: (officeName: string) => void;
  dark: boolean;
}

export interface BhpOfficeData {
  id: string;
  name: string;
  city: string;
  coord: { x: number; y: number };
  provinces: string[];
  casesHuluBase: number;
  casesHilirBase: number;
  regulations: string[];
  color: string;
  description: string;
}

export const BHP_OFFICES: BhpOfficeData[] = [
  {
    id: "medan",
    name: "BHP Medan",
    city: "Medan",
    coord: { x: 185, y: 115 },
    provinces: [
      "Sumatera Utara",
      "Nanggroe Aceh Darussalam",
      "Sumatera Barat",
      "Riau",
      "Kepulauan Riau",
      "Bengkulu"
    ],
    casesHuluBase: 139,
    casesHilirBase: 2185,
    regulations: [
      "Pasal 430 & 449 KUH Perdata (BHP selaku Pengampu Pengawas)",
      "Pasal 1111 KUH Perdata (Pencatatan Boedel Waris)"
    ],
    color: "from-blue-600 to-indigo-700",
    description: "Mengawasi pengampuan bagi seluruh wilayah Sumatera bagian Utara & Tengah, berwenang mengamankan aset warisan & pencatatan harta pihak tidak cakap."
  }
];

export interface SubCityNode {
  city: string;
  coord: { x: number; y: number };
  casesCount: number;
  province: string;
  courts: string[];
}

export const BHP_MEDAN_SUB_CITIES: SubCityNode[] = [
  { city: "Pidie / Sigli", coord: { x: 105, y: 75 }, casesCount: 1, province: "Nanggroe Aceh Darussalam", courts: ["PN Sigli"] },
  { city: "Medan", coord: { x: 185, y: 115 }, casesCount: 11, province: "Sumatera Utara", courts: ["PN Medan"] },
  { city: "Binjai", coord: { x: 172, y: 110 }, casesCount: 1, province: "Sumatera Utara", courts: ["PN Binjai"] },
  { city: "Simalungun", coord: { x: 195, y: 135 }, casesCount: 1, province: "Sumatera Utara", courts: ["PN Simalungun"] },
  { city: "Balige (Toba)", coord: { x: 180, y: 165 }, casesCount: 1, province: "Sumatera Utara", courts: ["PN Balige"] },
  { city: "Rantau Prapat", coord: { x: 215, y: 170 }, casesCount: 2, province: "Sumatera Utara", courts: ["PN Rantau Prapat"] },
  { city: "Pekanbaru", coord: { x: 290, y: 170 }, casesCount: 1, province: "Riau", courts: ["PN Pekanbaru"] },
  { city: "Batam", coord: { x: 382, y: 145 }, casesCount: 1, province: "Kepulauan Riau", courts: ["PN Batam"] },
  { city: "Tanjung Pinang", coord: { x: 418, y: 151 }, casesCount: 2, province: "Kepulauan Riau", courts: ["PN Tanjung Pinang"] },
  { city: "Padang", coord: { x: 215, y: 260 }, casesCount: 3, province: "Sumatera Barat", courts: ["PN Padang"] },
  { city: "Solok", coord: { x: 235, y: 270 }, casesCount: 1, province: "Sumatera Barat", courts: ["PN Solok"] },
  { city: "Bengkulu", coord: { x: 275, y: 320 }, casesCount: 2, province: "Bengkulu", courts: ["PN Bengkulu"] }
];

export function BhpMap({ isSimulated, selectedOffice, onSelectOffice, dark }: BhpMapProps) {
  const [hoveredOffice, setHoveredOffice] = useState<BhpOfficeData | null>(null);
  const [hoveredSubCity, setHoveredSubCity] = useState<SubCityNode | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"summary" | "register">("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<ActivePengampuanCase | null>(null);
  const [filterHarta, setFilterHarta] = useState<"SEMUA" | "ADA" | "NIHIL">("SEMUA");
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  // States for Map Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only drag with left mouse button click
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setDragDistance(0);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
    setDragDistance(prev => prev + 1);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    // Prevent default scroll on page while hovering over map
    e.preventDefault();
    const zoomFactor = 1.08;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.max(0.7, Math.min(nextZoom, 6)));
  };

  const zoomIn = () => setZoom(z => Math.min(z * 1.25, 6));
  const zoomOut = () => setZoom(z => Math.max(z / 1.25, 0.7));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleSelectProvinceFiltered = (provName: string) => {
    if (dragDistance > 4) return; // Treat as a drag gesture, ignore click
    handleSelectProvince(provName);
  };

  const handleSelectProvince = (provName: string) => {
    if (selectedProvince === provName) {
      setSelectedProvince(null);
      setSearchQuery("");
    } else {
      setSelectedProvince(provName);
      setSearchQuery(provName);
      setSidebarTab("register");
    }
  };

  // Filtered case index list for local search engine
  const filteredCases = useMemo(() => {
    return BHP_MEDAN_ACTIVE_CASES.filter((c) => {
      const matchText = `${c.namaTerampu} ${c.namaPengampu} ${c.kabKota} ${c.nomorPenetapan} ${c.pengadilan} ${c.provinsi}`.toLowerCase();
      const matchesSearch = matchText.includes(searchQuery.toLowerCase());
      const matchesHarta = filterHarta === "SEMUA" || c.harta === filterHarta;
      return matchesSearch && matchesHarta;
    });
  }, [searchQuery, filterHarta]);

  // Calculate dynamic regional metrics based on whether simulation is checked (shifts 80% hilir list -> hulu preventives)
  const CalculatedOffices = useMemo(() => {
    return BHP_OFFICES.map((office) => {
      if (!isSimulated) {
        return {
          ...office,
          hulu: office.casesHuluBase,
          hilir: office.casesHilirBase,
          total: office.casesHuluBase + office.casesHilirBase,
          prevented: 0
        };
      } else {
        const preventedAmount = Math.round(office.casesHilirBase * 0.8);
        return {
          ...office,
          hulu: office.casesHuluBase + preventedAmount,
          hilir: office.casesHilirBase - preventedAmount,
          total: office.casesHuluBase + office.casesHilirBase,
          prevented: preventedAmount
        };
      }
    });
  }, [isSimulated]);

  const activeOfficeData = useMemo(() => {
    return CalculatedOffices.find((o) => o.name === selectedOffice) || null;
  }, [CalculatedOffices, selectedOffice]);

  // Auto focus the database tab if user clicks or switches to BHP Medan to ensure high observability
  const handleSelectMedanOffice = (officeName: string) => {
    onSelectOffice(officeName);
    if (officeName === "BHP Medan") {
      setSidebarTab("register");
    } else {
      setSidebarTab("summary");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      
      {/* MAP VIEWPORT (TOP) */}
      <div className="w-full bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden select-none min-h-[500px]">
        
        {/* Title Badge & Map Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10 mb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#0284c7] dark:text-[#38bdf8] uppercase block leading-none">
                Sistem Informasi Geografis & Layanan UPT
              </span>
              <span className="text-[15px] font-serif font-black text-slate-900 dark:text-white capitalize tracking-tight mt-0.5 block">
                Peta Wilayah Kerja Pengawasan Balai Harta Peninggalan Medan
              </span>
            </div>
          </div>
          {(selectedProvince || searchQuery) && (
            <button
              onClick={() => {
                setSelectedProvince(null);
                setSearchQuery("");
                setSidebarTab("summary");
              }}
              className="text-[10px] font-extrabold text-blue-600 dark:text-amber-400 hover:scale-105 duration-200 flex items-center gap-1.5 bg-blue-100/60 dark:bg-amber-500/10 px-3 py-1.5 rounded-xl border border-blue-200/50 dark:border-amber-400/20 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Filter Wilayah
            </button>
          )}
        </div>

        {/* Dynamic Highlight Status bar for active sub districts */}
        <div className="mt-1 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-400/20 rounded-xl p-3 z-10 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>
                {selectedProvince ? (
                  <span>Fokus Wilayah: <span className="text-blue-600 dark:text-cyan-400 font-black">{selectedProvince}</span> ({filteredCases.length} Kasus Terdaftar)</span>
                ) : (
                  <span>Supervisi Aktif Terpetakan: <span className="text-blue-600 dark:text-cyan-400 font-black">12 Kantor Pengadilan Negeri</span> (6 Provinsi Utama)</span>
                )}
              </span>
            </span>
            <span className="text-[10px] bg-blue-500 text-white dark:bg-indigo-600 px-2 py-0.5 rounded-full font-black uppercase tracking-wider scale-95 origin-right">
              Sumatera (BHP Medan)
            </span>
          </div>
        </div>

        {/* SVG GEO GRAPHICS MAP */}
        <div className="w-full flex-1 flex items-center justify-center py-4 relative">
          <svg
            viewBox="0 0 600 460"
            className="w-full h-auto max-h-[550px] drop-shadow-xl"
            style={{ width: "100%", cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* SEA/WATER BACKGROUND GRADIENT */}
            <defs>
              {/* Aceh Gradients */}
              <linearGradient id="acehActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="acehHover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              
              {/* Sumut Gradients */}
              <linearGradient id="sumutActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="sumutHover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1e40af" />
              </linearGradient>

              {/* Riau Gradients */}
              <linearGradient id="riauActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>
              <linearGradient id="riauHover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5eead4" />
                <stop offset="100%" stopColor="#115e59" />
              </linearGradient>

              {/* Kepri Gradients */}
              <linearGradient id="kepriActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
              <linearGradient id="kepriHover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d8b4fe" />
                <stop offset="100%" stopColor="#6b21a8" />
              </linearGradient>

              {/* Sumbar Gradients */}
              <linearGradient id="sumbarActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <linearGradient id="sumbarHover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#166534" />
              </linearGradient>

              {/* Bengkulu Gradients */}
              <linearGradient id="bengkuluActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="bengkuluHover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>

              {/* General Backup */}
              <linearGradient id="medanActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="medanHover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: "250px 200px" }}>
            <g opacity="0.3">
              <line x1="0" y1="60" x2="600" y2="60" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
              <line x1="0" y1="160" x2="600" y2="160" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
              <line x1="0" y1="260" x2="600" y2="260" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
              <line x1="0" y1="360" x2="600" y2="360" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
              
              <line x1="100" y1="0" x2="100" y2="460" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
              <line x1="200" y1="0" x2="200" y2="460" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
              <line x1="300" y1="0" x2="300" y2="460" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
              <line x1="400" y1="0" x2="400" y2="460" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
              <line x1="500" y1="0" x2="500" y2="460" stroke={dark ? "#334155" : "#cbd5e1"} strokeWidth="0.5" strokeDasharray="4 6" />
            </g>

            {/* OCEAN LABELS */}
            <text x="65" y="320" className="fill-slate-300 dark:fill-slate-700 font-sans text-[8px] tracking-[0.3em] font-semibold italic select-none pointer-events-none transform -rotate-45" style={{ transformOrigin: "65px 320px", transform: "rotate(-42deg)" }}>
              SAMUDRA HINDIA
            </text>
            <text x="350" y="94" className="fill-slate-300 dark:fill-slate-700 font-sans text-[8px] tracking-[0.3em] font-semibold italic select-none pointer-events-none transform rotate-12" style={{ transformOrigin: "350px 94px", transform: "rotate(15deg)" }}>
              SELAT MALAKA
            </text>

            {/* SUMATRA ACTIVE PROVINCES (BHP MEDAN JURISDICTION) */}

            {/* 1. Nanggroe Aceh Darussalam */}
            <motionElement.path
              d="M 60,40 L 130,35 L 155,60 L 170,110 L 140,125 L 115,115 L 85,100 L 60,75 Z"
              className="transition-all duration-300 cursor-pointer"
              fill={
                selectedProvince === "Nanggroe Aceh Darussalam"
                  ? "url(#acehActive)"
                  : hoveredProvince === "Nanggroe Aceh Darussalam"
                    ? "url(#acehHover)"
                    : dark
                      ? "rgba(14, 165, 233, 0.15)"
                      : "#e0f2fe"
              }
              stroke={
                selectedProvince === "Nanggroe Aceh Darussalam" 
                  ? "#0284c7" 
                  : dark ? "#38bdf8" : "#0284c7"
              }
              strokeWidth={selectedProvince === "Nanggroe Aceh Darussalam" ? "2.5" : "1.5"}
              whileHover={{ scale: 1.012 }}
              onMouseEnter={() => setHoveredProvince("Nanggroe Aceh Darussalam")}
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() => handleSelectProvinceFiltered("Nanggroe Aceh Darussalam")}
            />
            <text x="110" y="80" className="fill-blue-700/80 dark:fill-blue-400/85 font-sans text-[7.5px] font-black select-none pointer-events-none uppercase tracking-widest text-center" textAnchor="middle">ACEH</text>

            {/* 2. Sumatera Utara */}
            <motionElement.path
              d="M 170,110 L 140,125 L 150,175 L 180,225 L 210,215 L 235,215 L 245,175 L 220,135 Z"
              className="transition-all duration-300 cursor-pointer"
              fill={
                selectedProvince === "Sumatera Utara"
                  ? "url(#sumutActive)"
                  : hoveredProvince === "Sumatera Utara"
                    ? "url(#sumutHover)"
                    : dark
                      ? "rgba(59, 130, 246, 0.15)"
                      : "#dbeafe"
              }
              stroke={
                selectedProvince === "Sumatera Utara" 
                  ? "#1d4ed8" 
                  : dark ? "#3b82f6" : "#2563eb"
              }
              strokeWidth={selectedProvince === "Sumatera Utara" ? "2.5" : "1.5"}
              whileHover={{ scale: 1.012 }}
              onMouseEnter={() => setHoveredProvince("Sumatera Utara")}
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() => handleSelectProvinceFiltered("Sumatera Utara")}
            />
            <text x="195" y="145" className="fill-indigo-700/80 dark:fill-indigo-400/85 font-sans text-[7.5px] font-black select-none pointer-events-none uppercase tracking-widest" textAnchor="middle">SUMUT</text>

            {/* Danau Toba lake overlay */}
            <ellipse
              cx="178"
              cy="158"
              rx="9"
              ry="4"
              style={{ transform: "rotate(-25deg)", transformOrigin: "178px 158px" }}
              className="fill-blue-400 dark:fill-blue-900 stroke-blue-600 dark:stroke-blue-950 stroke-[0.5] select-none pointer-events-none"
            />
            <text x="178" y="152" textAnchor="middle" className="fill-slate-700 dark:fill-blue-300 font-sans text-[5px] font-black select-none pointer-events-none">D. Toba</text>

            {/* 3. Riau */}
            <motionElement.path
              d="M 220,135 L 245,175 L 235,215 L 285,215 L 340,195 L 335,145 L 290,135 Z"
              className="transition-all duration-300 cursor-pointer"
              fill={
                selectedProvince === "Riau"
                  ? "url(#riauActive)"
                  : hoveredProvince === "Riau"
                    ? "url(#riauHover)"
                    : dark
                      ? "rgba(45, 212, 191, 0.15)"
                      : "#ccfbf1"
              }
              stroke={
                selectedProvince === "Riau" 
                  ? "#0f766e" 
                  : dark ? "#14b8a6" : "#0d9488"
              }
              strokeWidth={selectedProvince === "Riau" ? "2.5" : "1.5"}
              whileHover={{ scale: 1.012 }}
              onMouseEnter={() => setHoveredProvince("Riau")}
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() => handleSelectProvinceFiltered("Riau")}
            />
            <text x="280" y="165" className="fill-teal-700/80 dark:fill-teal-400/85 font-sans text-[7.5px] font-black select-none pointer-events-none uppercase tracking-widest" textAnchor="middle">RIAU</text>

            {/* 4. Kepulauan Riau */}
            <g>
              {/* Batam Island */}
              <motionElement.path
                d="M 370,140 L 385,135 L 390,150 L 375,155 Z"
                className="transition-all duration-300 cursor-pointer"
                fill={
                  selectedProvince === "Kepulauan Riau"
                    ? "url(#kepriActive)"
                    : hoveredProvince === "Kepulauan Riau"
                      ? "url(#kepriHover)"
                      : dark
                        ? "rgba(168, 85, 247, 0.15)"
                        : "#f3e8ff"
                }
                stroke={dark ? "#a855f7" : "#7c3aed"}
                strokeWidth="1.2"
                whileHover={{ scale: 1.012 }}
                onMouseEnter={() => setHoveredProvince("Kepulauan Riau")}
                onMouseLeave={() => setHoveredProvince(null)}
                onClick={() => handleSelectProvinceFiltered("Kepulauan Riau")}
              />
              {/* Tanjung Pinang / Bintan Island */}
              <motionElement.path
                d="M 405,145 L 420,142 L 425,155 L 410,160 Z"
                className="transition-all duration-300 cursor-pointer"
                fill={
                  selectedProvince === "Kepulauan Riau"
                    ? "url(#kepriActive)"
                    : hoveredProvince === "Kepulauan Riau"
                      ? "url(#kepriHover)"
                      : dark
                        ? "rgba(168, 85, 247, 0.15)"
                        : "#f3e8ff"
                }
                stroke={dark ? "#a855f7" : "#7c3aed"}
                strokeWidth="1.2"
                whileHover={{ scale: 1.012 }}
                onMouseEnter={() => setHoveredProvince("Kepulauan Riau")}
                onMouseLeave={() => setHoveredProvince(null)}
                onClick={() => handleSelectProvinceFiltered("Kepulauan Riau")}
              />
              <text x="415" y="132" className="fill-purple-700/90 dark:fill-purple-400/95 font-sans text-[6.5px] font-black select-none pointer-events-none uppercase tracking-wide" textAnchor="middle">KEPRI</text>
            </g>

            {/* 5. Sumatera Barat */}
            <motionElement.path
              d="M 180,225 L 210,215 L 235,215 L 285,215 L 275,275 L 225,290 L 180,245 Z"
              className="transition-all duration-300 cursor-pointer"
              fill={
                selectedProvince === "Sumatera Barat"
                  ? "url(#sumbarActive)"
                  : hoveredProvince === "Sumatera Barat"
                    ? "url(#sumbarHover)"
                    : dark
                      ? "rgba(74, 222, 128, 0.15)"
                      : "#dcfce7"
              }
              stroke={
                selectedProvince === "Sumatera Barat" 
                  ? "#16803d" 
                  : dark ? "#4ade80" : "#15803d"
              }
              strokeWidth={selectedProvince === "Sumatera Barat" ? "2.5" : "1.5"}
              whileHover={{ scale: 1.012 }}
              onMouseEnter={() => setHoveredProvince("Sumatera Barat")}
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() => handleSelectProvinceFiltered("Sumatera Barat")}
            />
            <text x="215" y="243" className="fill-emerald-700/80 dark:fill-emerald-400/85 font-sans text-[7.5px] font-black select-none pointer-events-none uppercase tracking-widest text-center" textAnchor="middle">SUMBAR</text>

            {/* 6. Bengkulu */}
            <motionElement.path
              d="M 225,290 L 275,275 L 320,285 L 315,320 L 275,365 L 240,345 L 220,310 Z"
              className="transition-all duration-300 cursor-pointer"
              fill={
                selectedProvince === "Bengkulu"
                  ? "url(#bengkuluActive)"
                  : hoveredProvince === "Bengkulu"
                    ? "url(#bengkuluHover)"
                    : dark
                      ? "rgba(251, 191, 36, 0.15)"
                      : "#fef3c7"
              }
              stroke={
                selectedProvince === "Bengkulu" 
                  ? "#d97706" 
                  : dark ? "#fbbf24" : "#ea580c"
              }
              strokeWidth={selectedProvince === "Bengkulu" ? "2.5" : "1.5"}
              whileHover={{ scale: 1.012 }}
              onMouseEnter={() => setHoveredProvince("Bengkulu")}
              onMouseLeave={() => setHoveredProvince(null)}
              onClick={() => handleSelectProvinceFiltered("Bengkulu")}
            />
            <text x="250" y="325" className="fill-amber-700/80 dark:fill-amber-400/85 font-sans text-[7.5px] font-black select-none pointer-events-none uppercase tracking-widest" textAnchor="middle">BENGKULU</text>


            {/* MUTED/PASSIVE SUMATRA ISLAND PROVINCES (BACKGROUND REFERENCE) */}

            {/* 7. Jambi */}
            <motionElement.path
              d="M 285,215 L 340,195 L 380,210 L 400,260 L 360,290 L 320,285 L 275,275 Z"
              className="transition-colors duration-300"
              fill={dark ? "#1b233a" : "#cbd5e1/40"}
              stroke={dark ? "#1e293b" : "#e2e8f0"}
              strokeWidth="1.2"
              whileHover={{ scale: 1.002 }}
            />
            <text x="325" y="245" className="fill-slate-400/60 dark:fill-slate-600 font-sans text-[6px] font-bold select-none pointer-events-none">JAMBI</text>

            {/* 8. Sumatera Selatan */}
            <motionElement.path
              d="M 320,285 L 360,290 L 400,260 L 450,295 L 460,350 L 405,370 L 315,320 Z"
              className="transition-colors duration-300"
              fill={dark ? "#1b233a" : "#cbd5e1/40"}
              stroke={dark ? "#1e293b" : "#e2e8f0"}
              strokeWidth="1.2"
              whileHover={{ scale: 1.002 }}
            />
            <text x="390" y="325" className="fill-slate-400/60 dark:fill-slate-600 font-sans text-[6px] font-bold select-none pointer-events-none">SUMSEL</text>

            {/* 9. Bangka Belitung Islands */}
            <g opacity="0.6">
              {/* Bangka */}
              <path
                d="M 470,265 L 500,278 L 488,300 L 458,288 Z"
                fill={dark ? "#1b233a" : "#cbd5e1/40"}
                stroke={dark ? "#1e293b" : "#e2e8f0"}
                strokeWidth="1"
              />
              {/* Belitung */}
              <circle
                cx="530"
                cy="310"
                r="9"
                fill={dark ? "#1b233a" : "#cbd5e1/40"}
                stroke={dark ? "#1e293b" : "#e2e8f0"}
                strokeWidth="1"
              />
              <text x="500" y="255" className="fill-slate-400/60 dark:fill-slate-600 font-sans text-[5px] font-bold select-none pointer-events-none">BABEL</text>
            </g>

            {/* 10. Lampung */}
            <motionElement.path
              d="M 405,370 L 460,350 L 485,390 L 450,430 L 410,410 Z"
              className="transition-colors duration-300"
              fill={dark ? "#1b233a" : "#cbd5e1/40"}
              stroke={dark ? "#1e293b" : "#e2e8f0"}
              strokeWidth="1.2"
              whileHover={{ scale: 1.002 }}
            />
            <text x="440" y="395" className="fill-slate-400/60 dark:fill-slate-600 font-sans text-[6px] font-bold select-none pointer-events-none">LAMPUNG</text>


            {/* WEST SHORE ISLANDS CONSTELLATION - SIMEULUE, NIAS, MENTAWAI */}
            <g opacity="0.8">
              {/* Simeulue */}
              <motionElement.path
                d="M 65,100 L 80,110 L 75,118 L 60,108 Z"
                fill={dark ? "#1e293b" : "#cbd5e1"}
                stroke={dark ? "#334155" : "#94a3b8"}
                strokeWidth="0.8"
                whileHover={{ scale: 1.05 }}
              />
              <text x="70" y="93" className="fill-slate-400 dark:fill-slate-500 font-sans text-[5px] font-bold italic select-none pointer-events-none">Simeulue</text>

              {/* Nias */}
              <motionElement.path
                d="M 110,160 A 10,6 -15 1 1 125,180 Z"
                className="cursor-pointer"
                fill={dark ? "#1e293b" : "#cbd5e1"}
                stroke={dark ? "#334155" : "#94a3b8"}
                strokeWidth="0.8"
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  if (dragDistance > 4) return;
                  setSearchQuery("Nias");
                  setSidebarTab("register");
                }}
              />
              <text x="115" y="153" className="fill-slate-400 dark:fill-slate-500 font-sans text-[5px] font-bold italic select-none pointer-events-none">P. Nias</text>

              {/* Siberut (Mentawai) */}
              <motionElement.path
                d="M 165,240 A 14,6 -20 1 1 180,265 Z"
                fill={dark ? "#1e293b" : "#cbd5e1"}
                stroke={dark ? "#334155" : "#94a3b8"}
                strokeWidth="0.8"
                whileHover={{ scale: 1.05 }}
              />
              <text x="160" y="233" className="fill-slate-400 dark:fill-slate-500 font-sans text-[5px] font-bold italic select-none pointer-events-none">Siberut</text>

              {/* Sipora & Pagai (Mentawai) */}
              <motionElement.path
                d="M 195,285 A 8,4 -15 1 1 202,298 Z"
                fill={dark ? "#1e293b" : "#cbd5e1"}
                stroke={dark ? "#334155" : "#94a3b8"}
                strokeWidth="0.8"
                whileHover={{ scale: 1.05 }}
              />
              <motionElement.path
                d="M 210,312 A 10,4 -10 1 1 218,325 Z"
                fill={dark ? "#1e293b" : "#cbd5e1"}
                stroke={dark ? "#334155" : "#94a3b8"}
                strokeWidth="0.8"
                whileHover={{ scale: 1.05 }}
              />
              <text x="215" y="308" className="fill-slate-400 dark:fill-slate-500 font-sans text-[5px] font-bold italic select-none pointer-events-none">P. Pagai</text>

              {/* Enggano */}
              <motionElement.path
                d="M 240,380 A 5,3 0 1 1 246,386 Z"
                fill={dark ? "#1e293b" : "#cbd5e1"}
                stroke={dark ? "#334155" : "#94a3b8"}
                strokeWidth="0.8"
                whileHover={{ scale: 1.05 }}
              />
              <text x="245" y="375" className="fill-slate-400 dark:fill-slate-500 font-sans text-[5px] font-bold italic select-none pointer-events-none">Enggano</text>
            </g>


            {/* SUB-CITY INTERACTIVE PINS IN SUMATERA */}
            <g id="medan-sub-cities" className="pointer-events-auto">
              {BHP_MEDAN_SUB_CITIES.map((node, index) => {
                const isHovered = hoveredSubCity?.city === node.city;
                return (
                  <g
                    key={`sub-${node.city}`}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredSubCity(node)}
                    onMouseLeave={() => setHoveredSubCity(null)}
                    onClick={() => {
                      if (dragDistance > 4) return;
                      setSearchQuery(node.city.split(" / ")[0]);
                      setSidebarTab("register");
                    }}
                  >
                    {/* Ring ping ripple */}
                    <circle
                      cx={node.coord.x}
                      cy={node.coord.y}
                      r={isHovered ? "12" : "6"}
                      className="animate-ping fill-cyan-400/30"
                      style={{ transformOrigin: `${node.coord.x}px ${node.coord.y}px` }}
                    />
                    <circle
                      cx={node.coord.x}
                      cy={node.coord.y}
                      r={isHovered ? "4.5" : "3"}
                      className="fill-cyan-400 stroke-[#1e3a8a] stroke-[1] shadow-md transition-all duration-200"
                    />
                    
                    {/* Floating mini-label directly in text */}
                    {isHovered && (
                      <text
                        x={node.coord.x}
                        y={node.coord.y - 8}
                        textAnchor="middle"
                        className="font-sans text-[7px] font-extrabold fill-indigo-950 dark:fill-cyan-300 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
                      >
                        {node.city} ({node.casesCount})
                      </text>
                    )}
                  </g>
                );
              })}
            </g>


            {/* MAIN BHP MEDAN OFFICE PIN INDICATOR (CROWN OF SERVICE) */}
            {CalculatedOffices.map((office) => {
              const isSelected = selectedOffice === office.name;
              const isHovered = hoveredOffice?.id === office.id;
              
              return (
                <g
                  key={office.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredOffice(office)}
                  onMouseLeave={() => setHoveredOffice(null)}
                  onClick={() => {
                    if (dragDistance > 4) return;
                    handleSelectMedanOffice(office.name);
                  }}
                >
                  <circle
                    cx={office.coord.x}
                    cy={office.coord.y}
                    r="15"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    className="animate-ping origin-center"
                    style={{ transformOrigin: `${office.coord.x}px ${office.coord.y}px` }}
                  />
                  
                  {/* Outer circle */}
                  <circle
                    cx={office.coord.x}
                    cy={office.coord.y}
                    r="9.5"
                    className="fill-blue-600 stroke-white dark:stroke-slate-900 shadow-xl transition-all duration-200"
                    strokeWidth="2"
                  />
                  <circle
                    cx={office.coord.x}
                    cy={office.coord.y}
                    r="4"
                    fill="white"
                  />

                  {/* Elegant floating star marker representing UPT office center */}
                  <g transform={`translate(${office.coord.x}, ${office.coord.y - 12})`}>
                    <path
                      d="M 0,-10 L 3,-3 L 10,0 L 3,3 L 0,10 L -3,3 L -10,0 L -3,-3 Z"
                      fill="#ef4444"
                      className="drop-shadow-md animate-pulse"
                    />
                    {/* Office Label */}
                    <text
                      y="-12"
                      textAnchor="middle"
                      className="font-sans font-black select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] text-[11px] uppercase tracking-wider fill-red-800 dark:fill-red-400"
                    >
                      {office.city === "Medan" ? "BHP MEDAN" : `${office.city} UPT`}
                    </text>
                  </g>
                </g>
              );
            })}


            {/* COMPASS ROSE ACCENT */}
            <g transform="translate(56, 400)" className="opacity-40 select-none pointer-events-none hidden sm:block">
              <circle r="18" fill="none" stroke={dark ? "#475569" : "#94a3b8"} strokeWidth="0.5" strokeDasharray="2 2" />
              <circle r="12" fill="none" stroke={dark ? "#475569" : "#94a3b8"} strokeWidth="1" />
              <path d="M 0,-15 L 3,-4 L 14,0 L 3,4 L 0,15 L -3,4 L -14,0 L -3,-4 Z" fill={dark ? "#475569" : "#94a3b8"} />
              <path d="M 0,-15 L 0,0 L 14,0 Z" fill={dark ? "#64748b" : "#475569"} />
              <path d="M 0,15 L 0,0 L -14,0 Z" fill={dark ? "#64748b" : "#475569"} />
              <text x="0" y="-18" textAnchor="middle" className="font-sans text-[8px] font-black fill-slate-500 dark:fill-slate-400">N</text>
            </g>


            {/* SCALE BAR LEGEND ACCENT */}
            <g transform="translate(470, 410)" className="opacity-70 select-none pointer-events-none hidden sm:block">
              <rect x="0" y="0" width="110" height="22" rx="4" fill={dark ? "#0f172a" : "#f8fafc"} className="stroke-slate-205 dark:stroke-slate-800" strokeWidth="1" />
              <line x1="10" y1="12" x2="100" y2="12" stroke={dark ? "#94a3b8" : "#475569"} strokeWidth="1.5" />
              <line x1="10" y1="8" x2="10" y2="16" stroke={dark ? "#94a3b8" : "#475569"} strokeWidth="1.5" />
              <line x1="55" y1="9" x2="55" y2="15" stroke={dark ? "#94a3b8" : "#475569"} strokeWidth="1" />
              <line x1="100" y1="8" x2="100" y2="16" stroke={dark ? "#94a3b8" : "#475569"} strokeWidth="1.5" />
              <text x="10" y="27" className="font-mono text-[6px] fill-slate-400 dark:fill-slate-500">0 km</text>
              <text x="55" y="27" textAnchor="middle" className="font-mono text-[6px] fill-slate-400 dark:fill-slate-500">100 km</text>
              <text x="100" y="27" textAnchor="end" className="font-mono text-[6px] fill-slate-400 dark:fill-slate-500">200 km</text>
              <text x="55" y="5" textAnchor="middle" className="font-sans text-[6px] font-extrabold fill-slate-500 dark:fill-slate-400">GARIS PERSPEKTIF</text>
            </g>

            </g>

          </svg>

          {/* DYNAMIC MAP FLOATING TOOLTIP FOR REGIONAL SUB-CITIES CASES */}
          <AnimatePresence>
            {hoveredSubCity && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute top-2 left-2 bg-white/95 dark:bg-slate-900/95 border border-cyan-500/30 shadow-xl rounded-xl p-3 max-w-[200px] z-30 pointer-events-none backdrop-blur-sm"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block">
                    {hoveredSubCity.city}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-none font-medium mb-1.55">
                  Provinces: {hoveredSubCity.province}
                </span>
                <div className="border-t border-slate-150 dark:border-slate-800 pt-1.5 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-medium">Pengampuan Aktif:</span>
                    <span className="font-mono font-black text-slate-850 dark:text-white">{hoveredSubCity.casesCount} Kasus</span>
                  </div>
                  <div className="flex justify-between items-center text-[8px] text-slate-400">
                    <span>Yurisdiksi Pengadilan:</span>
                    <span className="font-bold">{hoveredSubCity.courts.join(", ")}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {hoveredProvince && !hoveredSubCity && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute top-2 left-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-3 max-w-[190px] z-30 pointer-events-none backdrop-blur-sm"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-400 block mb-1">
                  {hoveredProvince}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal block">
                  {hoveredProvince === "Sumatera Utara" || hoveredProvince === "Nanggroe Aceh Darussalam" || hoveredProvince === "Sumatera Barat" || hoveredProvince === "Riau" || hoveredProvince === "Kepulauan Riau" || hoveredProvince === "Bengkulu" 
                    ? "Wilayah supervisi aktif BHP Medan. Klik untuk menyaring dan melihat register perkara terkait." 
                    : "Bagian wilayah geografi rujukan tetangga."}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Zoom and Pan HUD Controls */}
          <div className="absolute bottom-16 right-5 z-20 flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-lg backdrop-blur-sm select-none">
            <button
              onClick={zoomIn}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-sm active:scale-90 transition-transform cursor-pointer"
              title="Perbesar Peta (Zoom In)"
            >
              +
            </button>
            <button
              onClick={zoomOut}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-sm active:scale-90 transition-transform cursor-pointer"
              title="Perkecil Peta (Zoom Out)"
            >
              −
            </button>
            <button
              onClick={resetZoom}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-[8px] font-black uppercase active:scale-90 transition-transform cursor-pointer"
              title="Atur Ulang Posisi Peta"
            >
              Reset
            </button>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-1 text-center">
              <span className="text-[7.5px] font-mono text-slate-400 font-bold block leading-none">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Quick Instructions Hint */}
        <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl px-4 py-3 flex flex-all items-center justify-between border border-slate-200/50 dark:border-slate-800">
          <span className="text-xs md:text-sm text-slate-800 dark:text-slate-205 flex items-center gap-2 font-bold">
            <Layers className="w-4 h-4 text-indigo-650 animate-pulse" />
            <span>
              <span>Klik pada provinsi aktif (berwarna cerah) atau arahkan kursor ke bulatan cyan kecil di pulau Sumatera untuk menyaring wilayah pengawasan.</span>
            </span>
          </span>
          <span className="text-xs font-black tracking-widest text-slate-700 dark:text-slate-300 uppercase shrink-0 hidden sm:inline-block">
            UPT KEMENTERIAN HUKUM
          </span>
        </div>
      </div>

      {/* DETAILED WORKSPACE PANELS (BELOW MAP) - EXPANDED REGISTER TABLE */}
      <div className="w-full">
        
        {/* PANEL 2: BUKU REGISTER AKTIF & DATABASE PENGAMPUPAN */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md relative min-h-[460px] flex flex-col justify-between w-full">
          <div className="flex flex-col h-full justify-between flex-1">
            <div>
              {/* Header block with search & tags in responsive alignments */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-4 border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-2.5 bg-transparent">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-serif font-black text-slate-950 dark:text-white uppercase tracking-tight">
                      Buku Register Pengampuan Aktif
                    </h3>
                    <p className="text-xs md:text-sm text-slate-750 dark:text-slate-300 font-bold">
                      Daftar resmi subyek terampu dan wali pengampu di bawah pengawasan hukum BHP Medan
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono bg-indigo-150 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-300 px-3.5 py-1.5 rounded-xl font-black self-start md:self-auto border border-indigo-200/40 dark:border-indigo-400/20 shadow-sm shrink-0 uppercase tracking-wide">
                  Total Terdaftar: {filteredCases.length} Kasus
                </span>
              </div>

              {/* Filter & Search Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 dark:text-slate-200 font-medium"
                    placeholder="Ketik nama terampu, pengampu utama, pengadilan negeri, kabupaten atau kota..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-650"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border-2 border-slate-250 dark:border-slate-800 gap-1 md:self-center">
                  <button
                    onClick={() => setFilterHarta("SEMUA")}
                    className={`flex-1 text-xs font-black uppercase tracking-wider py-2 px-3 rounded-lg transition-all cursor-pointer ${
                      filterHarta === "SEMUA"
                        ? "bg-indigo-600 text-white shadow-md font-black"
                        : "text-slate-750 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setFilterHarta("ADA")}
                    className={`flex-1 text-xs font-black uppercase tracking-wider py-2 px-3 rounded-lg transition-all cursor-pointer ${
                      filterHarta === "ADA"
                        ? "bg-emerald-600 text-white shadow-md font-black"
                        : "text-slate-750 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900"
                    }`}
                  >
                    Ada Aset
                  </button>
                  <button
                    onClick={() => setFilterHarta("NIHIL")}
                    className={`flex-1 text-xs font-black uppercase tracking-wider py-2 px-3 rounded-lg transition-all cursor-pointer ${
                      filterHarta === "NIHIL"
                        ? "bg-amber-600 text-white shadow-md font-black"
                        : "text-slate-750 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900"
                    }`}
                  >
                    Nihil
                  </button>
                </div>
              </div>
            </div>

            {/* DYNAMIC CASE REGISTER DATA TABLE */}
            <div className="flex-1 overflow-y-auto h-[515px] max-h-[515px] overflow-x-auto mt-4 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-inner scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
              {filteredCases.length > 0 ? (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 border-b-2 border-slate-200 dark:border-slate-800 text-xs font-extrabold uppercase text-slate-700 dark:text-slate-200 tracking-wider">
                      <th className="p-3.5 text-center w-12 border-r border-slate-200/40 dark:border-slate-800/40">No</th>
                      <th className="p-3.5">Nama Terampu</th>
                      <th className="p-3.5">Pengampu Utama & Hubungan</th>
                      <th className="p-3.5">Wilayah (Kabupaten/Kota)</th>
                      <th className="p-3.5">Yurisdiksi Pengadilan Negeri</th>
                      <th className="p-3.5 text-center">Pencatatan Harta</th>
                      <th className="p-3.5 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                    {filteredCases.map((item, index) => (
                      <tr
                        key={`case-${item.no}`}
                        onClick={() => setSelectedCase(item)}
                        className={`text-xs cursor-pointer transition-colors duration-150 ${
                          selectedCase?.no === item.no
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-950/40 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <td className="p-3.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200/40 dark:border-slate-800/40 text-xs md:text-sm">{index + 1}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-[14px] text-slate-900 dark:text-white block hover:text-indigo-600 transition-colors">
                            {item.namaTerampu}
                          </span>
                          <span className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-mono block mt-0.5">Penetapan No: {item.nomorPenetapan}</span>
                        </td>
                        <td className="p-3.5 text-slate-800 dark:text-slate-200">
                          <span className="font-bold text-[13px] block">{item.namaPengampu}</span>
                          <span className="text-xs bg-indigo-100/70 dark:bg-indigo-900/60 px-2.5 py-0.5 rounded text-indigo-800 dark:text-indigo-200 font-sans inline-block mt-1 font-black uppercase tracking-wide">{item.hubungan}</span>
                        </td>
                        <td className="p-3.5 text-[12.5px] font-semibold text-slate-700 dark:text-slate-350">{item.kabKota}</td>
                        <td className="p-3.5 text-[12.5px] font-mono font-black text-indigo-700 dark:text-indigo-400">{item.pengadilan}</td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[11px] md:text-xs font-black px-2.5 py-1 rounded-lg inline-block uppercase tracking-wider border ${
                            item.harta === "ADA"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-black"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent font-bold"
                          }`}>
                            {item.harta === "ADA" ? "ADA ASET" : "NIHIL"}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCase(item); }}
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-450 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border border-indigo-200/50 dark:border-indigo-800/40 active:scale-95 transition-all shadow-sm"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Info className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-bounce" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                    Tidak Ada Data Register Ditemukan
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Silakan gunakan keyword pencarian lain atau pilih filter wilayah yang berbeda pada peta di atas.
                  </span>
                </div>
              )}
            </div>

            {/* DETAILS FOOTER NOTE */}
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 inline-block animate-pulse" />
              <span>
                Data registrasi bersifat legal formal. Klik tombol <strong>Rincian</strong> pada baris bersangkutan untuk meninjau detail penetapan nomor pengadilan, tanggal audit, rujukan status, dan riwayat pengawasan dari pengampu bersangkutan.
              </span>
            </div>
          </div>
        </div>

      </div>      {/* COMPACT MODAL / DETAIL DRAWER OF SELECTED REGISTERED INDIVIDUAL */}
      <AnimatePresence>
        {selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto"
            onClick={() => setSelectedCase(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 shadow-2xl rounded-3xl p-8 md:p-11 max-w-4xl w-full space-y-8 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 dark:border-slate-800/85 pb-5">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs bg-indigo-100 text-indigo-850 dark:bg-indigo-900/40 dark:text-indigo-200 font-black px-4 py-1.5 rounded-xl uppercase tracking-wider font-mono">
                      KARTU REGISTER AKTIF NO. {selectedCase.no}
                    </span>
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl border ${
                      selectedCase.harta === "ADA"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    }`}>
                      {selectedCase.harta === "ADA" ? "ADA ASET" : "NIHIL"}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-serif font-black text-slate-900 dark:text-white mt-2 leading-snug">
                    {selectedCase.namaTerampu}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-sans mt-1">
                    Tanggal lahir / umur: <span className="text-slate-900 dark:text-white font-extrabold text-base">{selectedCase.tglLahirTerampu === "-" || selectedCase.tglLahirTerampu === "" ? "Tidak Tercatat" : selectedCase.tglLahirTerampu}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="p-2 px-4 text-slate-600 hover:text-slate-905 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 cursor-pointer text-xs font-black uppercase tracking-wider"
                >
                  Tutup
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Detail Pengampu */}
                <div className="space-y-3.5 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border-2 border-slate-200/60 dark:border-slate-850">
                  <span className="text-xs font-black tracking-widest text-indigo-700 dark:text-indigo-300 uppercase flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    PENGAMPU UTAMA (WALI)
                  </span>
                  <div className="pt-1.5">
                    <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-snug">
                      {selectedCase.namaPengampu}
                    </p>
                    <span className="inline-block text-xs bg-indigo-150/80 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black tracking-wide px-3 py-1 rounded-lg mt-1.5">
                      Hubungan: {selectedCase.hubungan}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5 pt-3 border-t border-slate-200/50 dark:border-slate-800/55 font-bold">
                    Domisili Pengampu: <span className="font-extrabold text-slate-900 dark:text-white">{selectedCase.alamatPengampu}</span>
                  </p>
                </div>

                {/* Penetapan Pengadilan */}
                <div className="space-y-3.5 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border-2 border-slate-200/60 dark:border-slate-850">
                  <span className="text-xs font-black tracking-widest text-[#0284c7] dark:text-[#38bdf8] uppercase flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-sky-600" />
                    PENETAPAN PENGADILAN
                  </span>
                  <div className="pt-1.5">
                    <p className="text-sm md:text-base font-mono font-black text-indigo-900 bg-slate-200 pd-2 dark:text-indigo-200 p-2 rounded-xl border border-slate-300/30 dark:bg-indigo-950/50 inline-block">
                      {selectedCase.nomorPenetapan}
                    </p>
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-2 font-bold">
                    Yurisdiksi: <span className="font-black text-slate-950 dark:text-white text-base">{selectedCase.pengadilan}</span>
                  </p>
                  <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/55 pt-2 font-bold">
                    Provinsi: <span className="font-extrabold text-slate-900 dark:text-white">{selectedCase.provinsi} ({selectedCase.kabKota})</span>
                  </p>
                </div>
              </div>

              {/* Row 2: Status Pengawasan & Records */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border-2 border-slate-200/60 dark:border-slate-850 space-y-4">
                <span className="text-xs font-black tracking-widest text-[#0f7654] dark:text-emerald-400 uppercase flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  STATUS PENATAUSAHAAN DAN ARSIP BHP MEDAN
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div className="space-y-1">
                    <span className="text-slate-500 text-xs font-black block uppercase tracking-wider">Nomor Berkas Berita Acara (BAP):</span>
                    <span className="font-mono font-black text-slate-950 dark:text-white block bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg inline-block border border-slate-200/50 dark:border-slate-800/40 select-text text-sm">
                      {selectedCase.noBerkas === "-" || selectedCase.noBerkas === "" ? "Tidak Ada BAP Tersedia" : selectedCase.noBerkas}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 text-xs font-black block uppercase tracking-wider">Tanggal Audit Lapangan Terakhir:</span>
                    <span className="font-sans font-black text-slate-900 dark:text-white block text-sm bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg inline-block border border-slate-200/50 dark:border-slate-850">
                      📆 {selectedCase.tglPengawasan}
                    </span>
                  </div>
                </div>

                <div className="border-t-2 border-slate-200/60 dark:border-slate-800/70 pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 font-extrabold justify-start text-xs md:text-sm">Pencatatan Portofolio Aset Terampu:</span>
                  <span className={`font-black uppercase tracking-wider text-xs px-4 py-1.5 rounded-xl border ${
                    selectedCase.harta === "ADA"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-xs"
                      : "bg-slate-500/10 text-slate-500 border-transparent"
                  }`}>
                    {selectedCase.harta === "ADA" ? "✓ BERKAS ASET RIIL LENGKAP" : "✖ NIHIL / TIDAK ADA BERKAS ASET"}
                  </span>
                </div>
              </div>

              {/* Terampu address block */}
              <div className="p-5 bg-indigo-50/50 dark:bg-slate-950/40 text-sm rounded-2xl border-2 border-indigo-100 dark:border-slate-800 leading-relaxed font-bold text-slate-700 dark:text-slate-300 font-sans">
                <div className="flex gap-3 items-start">
                  <MapPin className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-slate-900 dark:text-white block mb-1 text-xs uppercase tracking-wider">
                      Alamat / Tempat Keberadaan Terampu Saat Ini:
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed text-sm">
                      {selectedCase.alamatTerampu === "-" || selectedCase.alamatTerampu === "" ? "Beralamat sama dengan tempat tinggal Pengampu Utama" : selectedCase.alamatTerampu}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Close */}
              <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-150 dark:border-slate-850">
                <button
                  onClick={() => setSelectedCase(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-550 dark:hover:bg-indigo-600 px-6 py-3 text-xs md:text-sm font-black uppercase tracking-wider rounded-2xl cursor-pointer active:scale-95 transition-all shadow-md"
                >
                  Selesai Meninjau
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
