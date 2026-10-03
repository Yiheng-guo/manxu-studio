import { NextResponse } from "next/server";
import { workRecordCreateSchema } from "@/lib/schema";
import { createWorkRecord, listWorkRecords } from "@/lib/server/db";
import { failure, guard, jsonBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    guard(req);
    return NextResponse.json(listWorkRecords());
  } catch (error) {
    return failure(error);
  }
}

export async function POST(req: Request) {
  try {
    guard(req);
    const { id, ...input } = workRecordCreateSchema.parse(await jsonBody(req));
    const result = createWorkRecord(id, input);
    return NextResponse.json(result.record, {
      status: result.created ? 201 : 200,
    });
  } catch (error) {
    return failure(error);
  }
}
