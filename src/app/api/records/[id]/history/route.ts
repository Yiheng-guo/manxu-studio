import { NextResponse } from "next/server";
import { z } from "zod";
import { workRecordHistory } from "@/lib/server/db";
import { failure, guard } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function GET(req: Request, context: Context) {
  try {
    guard(req);
    const { id } = await context.params;
    return NextResponse.json(
      workRecordHistory(z.string().uuid("记录标识不正确").parse(id)),
    );
  } catch (error) {
    return failure(error);
  }
}
