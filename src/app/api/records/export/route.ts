import { methods } from "@/lib/workbench";
import { listProjects, listWorkRecords } from "@/lib/server/db";
import { guard, failure } from "@/lib/server/http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    guard(req);
    return new Response(JSON.stringify({ product:"漫序", version:"2.0", exportedAt:new Date().toISOString(), records:listWorkRecords(), projects:listProjects(), methods, note:"个人工作区导出；教学示例与个人记录分开；请检查内容后再对外分享。记录完整修订历史可在单条记录中另行导出。" },null,2), {
      headers:{"Content-Type":"application/json;charset=utf-8","Content-Disposition":"attachment; filename=manxu-practice-archive.json","Cache-Control":"no-store"},
    });
  } catch(error) { return failure(error); }
}
