import { NextResponse } from "next/server";
import wageData from "@/data/processed/h1b_wage_by_county_job.json";

export async function GET() {
  const jobTitles = Array.from(
    new Set(Object.values(wageData).map((r) => r.job_title))
  ).sort((a, b) => a.localeCompare(b));

  return NextResponse.json(jobTitles, { status: 200 });
}
