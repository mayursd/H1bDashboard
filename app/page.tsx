"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { FeatureCollection } from "geojson";
import { WageMap as WageMapType, WageRecord } from "@/lib/types";
import { getBand } from "@/lib/wageLogic";

const WageMap = dynamic(() => import("@/components/WageMap"), { ssr: false });

const SALARY_MIN = 30000;
const SALARY_MAX = 300000;

const formatNumber = (value: number) => {
  const integer = Math.round(value);
  return String(integer).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [wagesByKey, setWagesByKey] = useState<WageMapType>({});
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [baseSalary, setBaseSalary] = useState(120000);
  const [selectedCountyFips, setSelectedCountyFips] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    Promise.all([
      fetch(`${basePath}/data/h1b_wage_by_county_job.json`).then((r) => r.json()),
      fetch("https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json").then((r) => r.json()),
    ]).then(([wages, counties]) => {
      const titles = Array.from(new Set(Object.values(wages as WageMapType).map((r) => r.job_title))).sort((a, b) =>
        a.localeCompare(b)
      );
      setJobTitles(titles);
      setSelectedJobTitle(titles[0] || "");
      setWagesByKey(wages);
      setGeojson(counties);
    });
  }, []);

  const selectedRecord: WageRecord | undefined = useMemo(() => {
    if (!selectedCountyFips || !selectedJobTitle) return undefined;
    return wagesByKey[`${selectedCountyFips}_${selectedJobTitle}`];
  }, [selectedCountyFips, selectedJobTitle, wagesByKey]);

  const raiseForL3 = selectedRecord ? Math.max(0, selectedRecord.level_3 - baseSalary) : null;
  const salaryLabel = mounted ? formatNumber(baseSalary) : "120,000";
  const status = selectedRecord ? getBand(baseSalary, selectedRecord) : "missing";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-[340px_1fr_340px]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-bold tracking-tight">H1B Wage Map</h1>
          <p className="mt-2 text-sm text-slate-400">Find counties where your offer is competitive against OFLC wage levels.</p>

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Base Salary</label>
            <p className="mt-1 text-2xl font-semibold text-cyan-300" suppressHydrationWarning>
              ${salaryLabel}
            </p>
            <input
              type="range"
              min={SALARY_MIN}
              max={SALARY_MAX}
              step={1000}
              value={baseSalary}
              onChange={(e) => setBaseSalary(Math.min(SALARY_MAX, Math.max(SALARY_MIN, Number(e.target.value))))}
              className="mt-3 w-full accent-cyan-400"
            />
            <p className="mt-1 text-xs text-slate-500">Allowed range: $30,000 to $300,000</p>
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Job Title</label>
          <select
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none ring-cyan-400 transition focus:ring"
            value={selectedJobTitle}
            onChange={(e) => setSelectedJobTitle(e.target.value)}
          >
            {jobTitles.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>

          <div className="mt-6 space-y-2 text-sm">
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500" /> Strong (≥ Level 3)</p>
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500" /> Good (≥ Level 2)</p>
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-400" /> Risky (≥ Level 1)</p>
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500" /> Unlikely (&lt; Level 1)</p>
          </div>
        </aside>

        <section className="h-[72vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl lg:h-[calc(100vh-2rem)]">
          {geojson ? (
            <WageMap
              geojson={geojson}
              selectedJobTitle={selectedJobTitle}
              baseSalary={baseSalary}
              wagesByKey={wagesByKey}
              onCountySelect={setSelectedCountyFips}
            />
          ) : (
            <div className="grid h-full place-items-center text-slate-400">Loading map…</div>
          )}
        </section>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl">
          <h2 className="text-xl font-semibold">County Insights</h2>
          {selectedRecord ? (
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <p className="text-lg font-semibold">{selectedRecord.county_name}, {selectedRecord.state}</p>
              <p suppressHydrationWarning>Base Salary: ${salaryLabel}</p>
              <p>Level 1: ${formatNumber(selectedRecord.level_1)}</p>
              <p>Level 2: ${formatNumber(selectedRecord.level_2)}</p>
              <p>Level 3: ${formatNumber(selectedRecord.level_3)}</p>
              <p>Level 4: ${formatNumber(selectedRecord.level_4)}</p>
              <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3 text-cyan-300">
                Status: {status.toUpperCase()}
              </p>
              <p className="font-medium text-indigo-300">
                {raiseForL3 && raiseForL3 > 0
                  ? `Raise offer by $${formatNumber(raiseForL3)} to reach Level 3`
                  : "Base salary meets or exceeds Level 3"}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Click a county to view wage details and recommendation.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
