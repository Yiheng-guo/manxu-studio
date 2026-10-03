import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPublicStore } from '../src/lib/public-store';
import { emptyRecord } from '../src/lib/workbench';
import type { Project, WorkRecord } from '../src/lib/schema';
function memory() {let raw:string|null=null;return {getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};}
const post=(body:unknown)=>({method:'POST',body:JSON.stringify(body)});
test('public workspaces persist separately and retain unknown measurements rather than upload to a shared API',async()=>{
 const a=memory(),b=memory(),api=createPublicStore(a),id=randomUUID();
 const input={...emptyRecord('evaluation'),id,title:'个人评测记录'};
 const r=await api.request('/records',post(input)) as WorkRecord;
 assert.equal(r.evaluation?.cost,null);assert.equal(r.evaluation?.tokens,null);
 const restored=await createPublicStore(a).request('/records') as WorkRecord[];
 assert.ok(restored.find(x=>x.id===id));
 assert.equal((await createPublicStore(b).request('/records') as WorkRecord[]).some(x=>x.id===id),false);
 await assert.rejects(api.request('/records',post({...input,id:randomUUID(),evaluation:{...input.evaluation,cost:1}})),/成本/);
});
test('browser records keep idempotency and reject stale updates; exports retain every original observation',async()=>{
 const api=createPublicStore(memory()),id=randomUUID(),input={...emptyRecord('research'),id,title:'同一记录',observed:'第一次观察'};
 await api.request('/records',post(input));await api.request('/records',post(input));
 await api.request(`/records/${id}`,{method:'PATCH',body:JSON.stringify({...input,revision:0,observed:'复测观察'})});
 await assert.rejects(api.request(`/records/${id}`,{method:'PATCH',body:JSON.stringify({...input,revision:0})}),/其他页面/);
 const history=await api.request(`/records/${id}/export?format=history`) as WorkRecord[];
 assert.equal(history.length,2);assert.deepEqual(history.map(x=>x.observed),['复测观察','第一次观察']);
 assert.equal((await api.request('/records') as WorkRecord[]).filter(x=>x.id===id).length,1);
});
test('linked browser reviews become stale, explicit current revision is required, project deletion retains histories',async()=>{
 const api=createPublicStore(memory()),p=(await api.request('/projects') as Project[])[0],id=randomUUID();
 const input={...emptyRecord('review',p.id),id,title:'角色审阅'};
 await api.request('/records',post(input));
 await api.request(`/projects/${p.id}`,{method:'PATCH',body:JSON.stringify({...p,title:'改变故事标题'})});
 assert.equal((await api.request(`/records/${id}`) as WorkRecord).stale,true);
 const changed=await api.request(`/records/${id}`,{method:'PATCH',body:JSON.stringify({...input,revision:0,summary:'仅补备注'})}) as WorkRecord;
 assert.equal(changed.stale,true);
 await assert.rejects(api.request(`/records/${id}`,{method:'PATCH',body:JSON.stringify({...input,revision:1,reconfirmProjectRevision:0})}),/版本已改变/);
 await api.request(`/records/${id}`,{method:'PATCH',body:JSON.stringify({...input,revision:1,reconfirmProjectRevision:1})});
 assert.equal((await api.request(`/records/${id}`) as WorkRecord).stale,false);
 await api.request(`/projects/${p.id}`,{method:'DELETE'});
 assert.equal((await api.request(`/records/${id}`) as WorkRecord).projectId,null);
 assert.equal((await api.request(`/records/${id}/history`) as WorkRecord[]).length,4);
});
test('public generation operations fail explicitly without pretending a task or result exists',async()=>{
 const api=createPublicStore(memory()),p=(await api.request('/projects') as Project[])[0];
 await assert.rejects(api.request(`/projects/${p.id}/jobs`,post({kind:'render'})),/不实时/);
 assert.equal((await api.request('/projects') as Project[]).length,1);
 assert.equal((await api.request(`/projects/${p.id}`) as {job:unknown}).job,null);
});
test('storage quota failure leaves previous browser archive intact',async()=>{
 const storage=memory(),api=createPublicStore(storage);
 await api.request('/records');const before=storage.getItem();
 const failing=createPublicStore({getItem:storage.getItem,setItem:()=>{throw new Error('quota');}});
 await assert.rejects(failing.request('/records',post({...emptyRecord('research'),id:randomUUID(),title:'不能保存'})),/未保存/);
 assert.equal(storage.getItem(),before);
});
