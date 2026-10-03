import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd(), target=path.join(root,'.public-build');
await fs.mkdir(target,{recursive:true});
for(const name of ['src','public']) {await fs.rm(path.join(target,name),{recursive:true,force:true});await fs.cp(path.join(root,name),path.join(target,name),{recursive:true});}
await fs.rm(path.join(target,'src/app/api'),{recursive:true,force:true});
await fs.rm(path.join(target,'src/app/project'),{recursive:true,force:true});
for(const name of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','postcss.config.mjs']) {try{await fs.copyFile(path.join(root,name),path.join(target,name));}catch(e){if(e.code!=='ENOENT')throw e;}}
await fs.writeFile(path.join(target,'next.config.ts'),`import type { NextConfig } from "next"; const config:NextConfig={output:"export",poweredByHeader:false,devIndicators:false,turbopack:{root:${JSON.stringify(root)}}}; export default config;\n`);
try{await fs.symlink(path.join(root,'node_modules'),path.join(target,'node_modules'),'dir');}catch(e){if(e.code!=='EEXIST')throw e;}
const result=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build'],{cwd:target,stdio:'inherit',env:{...process.env,NEXT_PUBLIC_PUBLIC_DEMO:'1',AI_PROVIDER:'none'}});
if(result.status!==0)process.exit(result.status??1);
console.log(`Public experience generated at ${path.join(target,'out')}; no .env or local database copied.`);
