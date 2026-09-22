import { NextResponse } from "next/server";
import { getSettings } from "@/lib/server/providers";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(getSettings());
}
