import { NextResponse } from "next/server";
import { z } from "zod";
import { workRecordPatchSchema } from "@/lib/schema";
import {
  changeWorkRecord,
  deleteWorkRecord,
  getWorkRecord,
  AppError,
} from "@/lib/server/db";
import { failure, guard, jsonBody } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid("记录标识不正确");
export const dynamic = "force-dynamic";

export async function GET(req: Request, context: Context) {
  try {
    guard(req);
    const { id } = await context.params;
    return NextResponse.json(getWorkRecord(idSchema.parse(id)));
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(req: Request, context: Context) {
  try {
    guard(req);
    const { id } = await context.params;
    const { revision, reconfirmProjectRevision, ...input } =
      workRecordPatchSchema.parse(await jsonBody(req));
    return NextResponse.json(
      changeWorkRecord(
        idSchema.parse(id),
        input,
        revision,
        reconfirmProjectRevision,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    guard(req);
    const { id } = await context.params;
    const revisionValue = new URL(req.url).searchParams.get("revision");
    if (revisionValue === null || revisionValue.trim() === "") {
      throw new AppError(
        400,
        "MISSING_REVISION",
        "删除前请提供当前记录版本，并重新确认",
      );
    }
    const revision = z.coerce
      .number({ error: "记录版本必须是非负整数" })
      .int("记录版本必须是整数")
      .min(0, "记录版本不能小于零")
      .parse(revisionValue);
    deleteWorkRecord(idSchema.parse(id), revision);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
