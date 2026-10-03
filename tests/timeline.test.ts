import { test } from "node:test";
import assert from "node:assert/strict";
import { encodedDuration, projectTimeline, shotAtTime } from "../src/lib/timeline";
import { demoInput } from "../src/lib/demo";
import type { Project } from "../src/lib/schema";
const project: Project = { ...demoInput, id: "d56f7d73-4d03-4c5d-ae77-2e91c3c4f02b", revision:0, createdAt:"", updatedAt:"",scriptSource:"demo",render:null };
test("legacy films use explicitly planned timing; encoded films retain voice-adjusted intervals",()=>{
  assert.equal(projectTimeline(project).source,"plan");
  assert.equal(projectTimeline(project).entries[1].start,7);
  const actual=[{shotId:"scene-1",start:0,end:8.46},{shotId:"scene-2",start:8.46,end:17.33}];
  const mapped=projectTimeline({...project,render:{videoUrl:"",srtUrl:"",duration:17.33,hasAudio:true,revision:0,createdAt:"",timeline:actual}});
  assert.equal(mapped.source,"render");
  assert.equal(shotAtTime(mapped.entries,8)?.shotId,"scene-1");
  assert.equal(shotAtTime(mapped.entries,8.46)?.shotId,"scene-2");
  assert.equal(shotAtTime(mapped.entries,17.33),null);
  assert.equal(shotAtTime(mapped.entries,NaN),null);
  assert.equal(shotAtTime(mapped.entries,-1),null);
});
test("encoded duration comes from media metadata, malformed output is rejected",()=>{
  assert.equal(encodedDuration("Duration: 00:01:02.45, start: 0.000000"),62.45);
  assert.throws(()=>encodedDuration("Duration: N/A"));
  assert.throws(()=>encodedDuration("Duration: 00:00:00.00"));
});
