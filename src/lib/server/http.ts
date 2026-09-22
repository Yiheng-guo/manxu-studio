import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./db";
export function failure(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: error.issues[0]?.message || "请检查输入内容",
        },
      },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "请求格式不正确" } },
      { status: 400 },
    );
  console.error("[api]", error instanceof Error ? error.name : "unknown");
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "操作暂时失败，请稍后重试" } },
    { status: 500 },
  );
}
export function guard(req: Request) {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  const host = req.headers.get("host")?.split(":")[0];
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host || url.hostname))
    throw new AppError(403, "LOCAL_ONLY", "本课程版本仅支持本机访问");
  if (origin && new URL(origin).host !== req.headers.get("host"))
    throw new AppError(403, "CROSS_ORIGIN", "请从本机工作台发起操作");
  if (Number(req.headers.get("content-length") || 0) > 12 * 1024 * 1024)
    throw new AppError(413, "TOO_LARGE", "文件不能超过 10 MB");
}
export async function jsonBody(req: Request) {
  const text = await req.text();
  if (text.length > 100000)
    throw new AppError(413, "TOO_LARGE", "输入内容过长");
  return JSON.parse(text);
}
