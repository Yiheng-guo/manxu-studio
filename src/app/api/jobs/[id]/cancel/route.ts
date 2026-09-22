import { NextResponse } from "next/server";
import { cancelJob } from "@/lib/server/db";
import { failure, guard } from "@/lib/server/http";
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    guard(req);
    return NextResponse.json(cancelJob((await ctx.params).id));
  } catch (e) {
    return failure(e);
  }
}
