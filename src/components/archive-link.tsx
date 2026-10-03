"use client";
import { useState, type ReactNode } from "react";
import { publicDemo } from "@/lib/public-mode";
import { publicRequest } from "@/lib/public-store";
export function ArchiveLink({href,children,className}:{href:string;children:ReactNode;className?:string}) {
 const [error,setError]=useState("");
 return <><a className={className} href={href} download onClick={publicDemo?async e=>{e.preventDefault();try{setError("");const value=await publicRequest(href.replace(/^\/api/,""));const markdown=typeof value==="string";const blob=new Blob([markdown?value:JSON.stringify(value,null,2)],{type:markdown?"text/markdown;charset=utf-8":"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=markdown?"manxu-record.md":"manxu-browser-archive.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e instanceof Error?e.message:"导出失败");}}:undefined}>{children}</a>{error&&<span role="alert">{error}</span>}</>;
}
