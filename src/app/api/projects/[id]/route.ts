import { NextResponse } from "next/server";
import {
  changeProject,
  deleteProject,
  getProject,
  latestJob,
} from "@/lib/server/db";
import { failure, guard, jsonBody } from "@/lib/server/http";
import { projectPatchSchema } from "@/lib/schema";
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, ctx: Context) {
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ project: getProject(id), job: latestJob(id) });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(req: Request, ctx: Context) {
  try {
    guard(req);
    const { id } = await ctx.params;
    const { revision, ...input } = projectPatchSchema.parse(
      await jsonBody(req),
    );
    return NextResponse.json(
      changeProject(id, (p) => ({ ...p, ...input }), revision),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    guard(req);
    const { id } = await ctx.params;
    deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
