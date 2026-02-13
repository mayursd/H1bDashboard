import { NextResponse } from "next/server";
import wageData from "@/data/processed/h1b_wage_by_county_job.json";

export async function GET() {
  return NextResponse.json(wageData, { status: 200 });
}
