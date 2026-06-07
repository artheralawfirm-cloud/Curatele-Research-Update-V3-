/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SifatPerkara = "Hulu" | "Hilir";
export type TingkatRisiko = "Sangat Tinggi" | "Tinggi" | "Sedang" | "Rendah" | "Preventif";

export interface CaseData {
  id: number;
  perkara: string;
  jumlah: number;
  sifat: SifatPerkara;
  stakeholder: string[];
  core: string;
  urgensi: string; // Dynamic or enhanced urgency description
  filosofis: string;
  sosiologis: string;
  yuridis: string;
  risiko: TingkatRisiko;
  penjelasanBhp: string; // Enhanced description for floating card and panel
  sumberHalaman?: string;   // Page citation in the official 2025 MA report
  sumberTabel?: string;     // Table name from the official 2025 MA report
  kategoriMa?: string;      // Category label of the row inside of MA report table
}

export interface StatSummary {
  beban: number;
  dicegah: number;
  pengampuan: number;
  hilirD: Array<CaseData & { disp: number }>;
  huluD: Array<CaseData & { disp: number }>;
  total: number;
  pctHilir: number;
  pctHulu: number;
}
