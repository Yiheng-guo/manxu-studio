import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/server/db";
import { failure, guard, jsonBody } from "@/lib/server/http";
import { projectInputSchema } from "@/lib/schema";
import { demoInput } from "@/lib/demo";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(listProjects());
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    guard(req);
    const data = await jsonBody(req);
    const p =
      data.template === "demo"
        ? createProject(demoInput, "demo")
        : createProject(projectInputSchema.parse(data));
    return NextResponse.json(p, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
