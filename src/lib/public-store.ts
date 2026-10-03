import { demoInput } from "./demo";
import { emptyRecord, exampleRecord, methods } from "./workbench";
import { projectInputSchema, workRecordInputSchema, workRecordCreateSchema, workRecordPatchSchema, type Project, type WorkRecord, type Settings } from "./schema";
import { recordMarkdown } from "./record-export";
const KEY="manxu-public-workspace-v1";
const SEED="70cbfca8-4192-4a3d-aea3-cd6176aa6d12";
interface Store { projects:Project[]; records:WorkRecord[]; history:Record<string,WorkRecord[]>; creates:Record<string,string>; }
const copy=<T>(x:T):T=>structuredClone(x);
const fingerprint=(p:Project)=>JSON.stringify({title:p.title,idea:p.idea,style:p.style,ratio:p.ratio,characters:p.characters,shots:p.shots});
function fail(message:string):never {throw new Error(message);}
function seed():Store {
 const now=new Date().toISOString();
 const p:Project={...copy(demoInput),id:SEED,title:"原创示例 · 开往明天的末班车",revision:0,createdAt:now,updatedAt:now,scriptSource:"demo",render:{videoUrl:"/demo/v2-film.mp4",srtUrl:"/demo/v2-subtitles.srt",duration:28.67,hasAudio:true,revision:0,createdAt:"2026-10-02T20:26:13.406Z",timeline:[{shotId:"scene-1",start:0,end:5.67},{shotId:"scene-2",start:5.67,end:12.67},{shotId:"scene-3",start:12.67,end:20.67},{shotId:"scene-4",start:20.67,end:28.67}]}};
 p.shots[0].duration=2;
 p.shots[0].continuity={characters:"林夏：米白风衣、芥末黄色单肩包，保持人物设定",props:"发光旧车票",entryState:"林夏在暮色站台等候",exitState:"林夏准备登上末班车，车票仍在手中",dialogue:p.shots[0].narration};
 const inputs=[{...exampleRecord("research",SEED),title:"教学示例 · 怎样减少整片返工",summary:"沿生成、修改与交付流程，记录需求证据；不是实习原始交付。",objective:"将一次创作问题变成可验证的产品需求。",input:"同一角色、四镜动态漫画、完整旁白与字幕。",expected:"能定位到源镜头，留下修订原因与三个范围的复测。",evidence:[{label:"Toonflow 开源机制参考",url:"https://github.com/HBAI-Ltd/Toonflow-app",note:"借鉴连续性审阅粒度，不代表已运行其 Agent。"}]},exampleRecord("evaluation",SEED),{...emptyRecord("issue",SEED),origin:"example" as const,title:"教学示例 · 从成片时间回到镜头",status:"retest" as const,summary:"本机真实合成素材用于演示定位；内容人审待填写。",input:"scene-2，成片时间5.67秒。",observed:"示例第一镜计划2秒，配音延长后的编码区间结束于5.67秒。容器总时长约28.69秒；切点仍需播放器复核。",action:"分别检查局部、相邻镜头和全片。不要把技术合成成功当作内容通过。",media:{episode:p.title,stage:"delivery" as const,timeStart:5.67,timeEnd:12.67,shotId:"scene-2",issueType:"other" as const,audioStrategy:"unknown" as const,repairScope:"shot" as const,localCheck:"pending" as const,adjacentCheck:"pending" as const,fullCheck:"pending" as const,credits:null,creditsSource:"",attempts:null}}];
 const records=inputs.map(input=>({...workRecordInputSchema.parse(input),id:crypto.randomUUID(),revision:0,createdAt:now,updatedAt:now,projectRevision:0,projectFingerprint:fingerprint(p),stale:false}));
 return {projects:[p],records,history:Object.fromEntries(records.map(r=>[r.id,[copy(r)]])),creates:{}};
}
export function createPublicStore(storage:Pick<Storage,"getItem"|"setItem">) {
 function read():Store { const raw=storage.getItem(KEY); if(raw) {try{return JSON.parse(raw) as Store;}catch{fail("浏览器档案无法读取，请先保留原数据再恢复；不会自动覆盖。");}} const s=seed();write(s);return s; }
 function write(s:Store) {try{storage.setItem(KEY,JSON.stringify(s));}catch{fail("浏览器存储不可用或已满，修改未保存。请先导出档案并释放空间。");} }
 function project(s:Store,id:string) {return s.projects.find(p=>p.id===id)||fail("创作项目不存在，请从作品列表重新打开。");}
 function record(s:Store,id:string) {return s.records.find(r=>r.id===id)||fail("记录不存在，请从台账重新选择。");}
 function live(s:Store,r:WorkRecord):WorkRecord {return {...copy(r),stale:!!r.projectId&&r.projectFingerprint!==fingerprint(project(s,r.projectId))};}
 function snapshot(s:Store,id:string|null) {if(!id)return {projectRevision:null,projectFingerprint:null};const p=project(s,id);return {projectRevision:p.revision,projectFingerprint:fingerprint(p)};}
 function archive(s:Store,r:WorkRecord) {(s.history[r.id]??=[]).push(copy(r));}
 return {
  async request(path:string,options:RequestInit={}):Promise<unknown> {
   const s=read(),u=new URL(path,"https://demo.invalid"),parts=u.pathname.split("/").filter(Boolean),id=parts[1],verb=options.method||"GET";
   const body=typeof options.body==="string" ? JSON.parse(options.body) : {};
   if(parts[0]==="settings")return {scriptProvider:"公网体验版 · 未接入模型",scriptReady:false,imageReady:false,voiceProvider:"示例为预制本机配音；公网不实时配音",voiceReady:false,ffmpegReady:false,workerReady:false,localOnly:false} satisfies Settings;
   if(parts[0]==="projects") {
    if(parts.length>2)fail("公网体验版不实时调用模型、上传图片或合成视频。请运行完整本机版。");
    if(verb==="GET")return id ? {project:copy(project(s,id)),job:null} : copy(s.projects);
    if(verb==="POST") {const input=body.template==="demo"?copy(demoInput):projectInputSchema.parse(body);const now=new Date().toISOString();const p:Project={...input,id:crypto.randomUUID(),revision:0,createdAt:now,updatedAt:now,scriptSource:body.template==="demo"?"demo":"manual",render:null};s.projects.unshift(p);write(s);return copy(p);}
    const p=project(s,id);
    if(verb==="PATCH") {if(body.revision!==p.revision)fail("项目已在其他页面更新，请重新加载后编辑。");const next={...p,...projectInputSchema.parse(body),revision:p.revision+1,updatedAt:new Date().toISOString()};s.projects=s.projects.map(x=>x.id===id?next:x);write(s);return copy(next);}
    if(verb==="DELETE") {s.projects=s.projects.filter(x=>x.id!==id);for(const r of s.records.filter(r=>r.projectId===id)){r.projectId=null;r.projectRevision=null;r.projectFingerprint=null;r.stale=false;r.revision++;r.updatedAt=new Date().toISOString();archive(s,r);}write(s);return {ok:true};}
   }
   if(parts[0]==="records") {
    if(verb==="GET") {
     if(id==="export")return {product:"漫序公网体验版",version:"2",exportedAt:new Date().toISOString(),records:s.records.map(r=>live(s,r)),projects:s.projects,methods,note:"浏览器设备本地档案；不包含媒体文件。没有上传到共享云数据库。"};
     if(!id)return s.records.map(r=>live(s,r)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
     const r=record(s,id);
     if(parts[2]==="history"||(parts[2]==="export"&&u.searchParams.get("format")==="history"))return copy([...s.history[id]].reverse());
     if(parts[2]==="export")return recordMarkdown(live(s,r),s.projects.find(p=>p.id===r.projectId));
     return live(s,r);
    }
    if(verb==="POST") {const parsed=workRecordCreateSchema.parse(body);const input=workRecordInputSchema.parse(parsed);const old=s.records.find(r=>r.id===parsed.id);if(old){if(s.creates[parsed.id]!==JSON.stringify(input))fail("记录标识已被另一条内容使用。");return live(s,old);}const now=new Date().toISOString();const r:WorkRecord={...input,id:parsed.id,revision:0,createdAt:now,updatedAt:now,...snapshot(s,input.projectId),stale:false};s.records.unshift(r);s.creates[r.id]=JSON.stringify(input);archive(s,r);write(s);return copy(r);}
    const current=record(s,id);
    if(verb==="PATCH") {const parsed=workRecordPatchSchema.parse(body);if(parsed.revision!==current.revision)fail("记录已在其他页面更新，请重新加载后编辑。");if(parsed.reconfirmProjectRevision!==undefined&&(!parsed.projectId||project(s,parsed.projectId).revision!==parsed.reconfirmProjectRevision))fail("项目版本已改变，请重新检查后确认。");const input=workRecordInputSchema.parse(parsed);const snap=input.projectId!==current.projectId||parsed.reconfirmProjectRevision!==undefined?snapshot(s,input.projectId):{projectRevision:current.projectRevision,projectFingerprint:current.projectFingerprint};const next:WorkRecord={...current,...input,...snap,revision:current.revision+1,updatedAt:new Date().toISOString()};s.records=s.records.map(r=>r.id===id?next:r);archive(s,next);write(s);return live(s,next);}
    if(verb==="DELETE") {if(Number(u.searchParams.get("revision"))!==current.revision)fail("记录版本已变化，请重新载入。");s.records=s.records.filter(r=>r.id!==id);delete s.history[id];delete s.creates[id];write(s);return {ok:true};}
   }
   fail("公网体验版支持手动编辑与档案记录。实时模型、图片上传、配音合成请运行 GitHub 中的完整本机版。");
  }
 };
}
export async function publicRequest(path:string,options?:RequestInit) {
 const operation=()=>createPublicStore(localStorage).request(path,options);
 return typeof navigator!=="undefined"&&navigator.locks ? navigator.locks.request(KEY,operation) : operation();
}
