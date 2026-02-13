"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { FeatureCollection } from "geojson";
import { WageMap as WageMapType, WageRecord } from "@/lib/types";

const WageMap = dynamic(() => import("@/components/WageMap"), { ssr: false });

const SALARY_MIN = 30000;
const SALARY_MAX = 300000;

const formatNumber = (value: number) => {
  const integer = Math.round(value);
  return String(integer).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export default function HomePage() {
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [wagesByKey, setWagesByKey] = useState<WageMapType>({});
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [baseSalary, setBaseSalary] = useState(120000);
  const [selectedCountyFips, setSelectedCountyFips] = useState<string | null>(null);

  useEffect(() => {
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

  return (
    <main className="grid min-h-screen gap-4 p-4 lg:grid-cols-[320px_1fr_320px]">
      <aside className="rounded-xl bg-white p-4 shadow">
        <h1 className="text-2xl font-bold">H1B Wage Map</h1>
        <p className="mt-2 text-sm text-slate-600">Compare your salary against OFLC prevailing wage levels by county.</p>

        <label className="mt-4 block text-sm font-semibold">
          Base Salary ($<span suppressHydrationWarning>{formatNumber(baseSalary)}</span>)
        </label>
        <input
          type="range"
          min={SALARY_MIN}
          max={SALARY_MAX}
          step={1000}
          value={baseSalary}
          onChange={(e) => setBaseSalary(Math.min(SALARY_MAX, Math.max(SALARY_MIN, Number(e.target.value))))}
          className="w-full"
        />
        <p className="text-xs text-slate-500">Range: $30,000 - $300,000</p>

        <label className="mt-4 block text-sm font-semibold">Job Title</label>
        <select className="mt-1 w-full rounded border p-2" value={selectedJobTitle} onChange={(e) => setSelectedJobTitle(e.target.value)}>
          {jobTitles.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>

        <div className="mt-6 space-y-2 text-sm">
          <p><span className="inline-block h-3 w-3 rounded bg-green-600" /> Strong (≥ Level 3)</p>
          <p><span className="inline-block h-3 w-3 rounded bg-blue-600" /> Good (≥ Level 2)</p>
          <p><span className="inline-block h-3 w-3 rounded bg-yellow-500" /> Risky (≥ Level 1)</p>
          <p><span className="inline-block h-3 w-3 rounded bg-red-600" /> Unlikely (&lt; Level 1)</p>
        </div>
      </aside>

      <section className="h-[70vh] rounded-xl bg-white p-2 shadow transition-colors duration-500 lg:h-[calc(100vh-2rem)]">
        {geojson ? (
          <WageMap
            geojson={geojson}
            selectedJobTitle={selectedJobTitle}
            baseSalary={baseSalary}
            wagesByKey={wagesByKey}
            onCountySelect={setSelectedCountyFips}
          />
        ) : (
          <div className="grid h-full place-items-center">Loading map…</div>
        )}
      </section>

      <aside className="rounded-xl bg-white p-4 shadow">
        <h2 className="text-xl font-semibold">County Wage Details</h2>
        {selectedRecord ? (
          <div className="mt-3 space-y-1 text-sm">
            <p className="font-semibold">{selectedRecord.county_name}, {selectedRecord.state}</p>
            <p>Base Salary: $<span suppressHydrationWarning>{formatNumber(baseSalary)}</span></p>
            <p>Level 1: ${formatNumber(selectedRecord.level_1)}</p>
            <p>Level 2: ${formatNumber(selectedRecord.level_2)}</p>
            <p>Level 3: ${formatNumber(selectedRecord.level_3)}</p>
            <p>Level 4: ${formatNumber(selectedRecord.level_4)}</p>
            <p className="mt-2 font-medium text-indigo-700">
              {raiseForL3 && raiseForL3 > 0
                ? `Raise offer by $${formatNumber(raiseForL3)} to reach Level 3`
                : "Base salary meets or exceeds Level 3"}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Click a county to view level breakdown. Counties without data are shown in gray.</p>
        )}
      </aside>
    </main>
  );
}
