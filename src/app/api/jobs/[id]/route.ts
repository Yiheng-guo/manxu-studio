import { NextResponse } from "next/server";
import { getJob } from "@/lib/server/db";
import { failure } from "@/lib/server/http";
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    return NextResponse.json(getJob((await ctx.params).id));
  } catch (e) {
    return failure(e);
  }
}
