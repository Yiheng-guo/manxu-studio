import { z } from "zod";
import { getProject, getWorkRecord, workRecordHistory } from "@/lib/server/db";
import { guard, failure } from "@/lib/server/http";
import { recordMarkdown } from "@/lib/record-export";
export const dynamic = "force-dynamic";
export async function GET(req: Request, context: {params:Promise<{id:string}>}) {
  try {
    guard(req);
    const {id}=await context.params;
    z.string().uuid().parse(id);
    const record=getWorkRecord(id);
    const history=new URL(req.url).searchParams.get("format")==="history";
    return new Response(history ? JSON.stringify(workRecordHistory(id),null,2) : recordMarkdown(record,record.projectId ? getProject(record.projectId) : undefined),{
      headers:{"Content-Type":history ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8","Content-Disposition":`attachment; filename=manxu-${history?"history":"record"}-${id}.${history?"json":"md"}`,"Cache-Control":"no-store"},
    });
  }catch(error){return failure(error);}
}
