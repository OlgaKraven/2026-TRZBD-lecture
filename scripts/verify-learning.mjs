import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const current=JSON.parse(fs.readFileSync('public/course.json','utf8'));
const learning=JSON.parse(fs.readFileSync('public/learning.json','utf8'));
const notes=JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8')).notes;
const previous=JSON.parse(execFileSync('git',['show','73db447d9006776fc62114169daf07949ab4c3d6:public/course.json'],{encoding:'utf8',maxBuffer:16*1024*1024}));
const before=new Map(previous.lectures.flatMap(l=>l.slides.map(s=>[s.id,s])));
assert.equal(current.lectures.length,13);assert.equal(learning.questions.length,104);
const ids=current.lectures.flatMap(l=>l.slides.map(s=>s.id));
const redirects=JSON.parse(fs.readFileSync('public/slide-redirects.json','utf8'));
const regrouped=[...before.values()].filter(s=>!ids.includes(s.id));
assert.equal(regrouped.length,26);for(const s of regrouped){assert.equal(s.kind,'literature');assert(ids.includes(redirects[s.id]));}
assert.equal(ids.filter(id=>!before.has(id)).length,325+learning.workedExplanations.length);
assert.equal(Object.keys(learning.lectureModels).length,13);
const inputs=new Set();let worked=0;
for(const l of current.lectures){
 const oldLecture=previous.lectures.find(x=>x.id===l.id);
 assert.deepEqual(l.slides.filter(s=>s.kind==='literature').flatMap(s=>s.references),oldLecture.slides.filter(s=>s.kind==='literature').flatMap(s=>s.references));
 for(const s of l.slides){const old=before.get(s.id);
  if(s.visual||s.image||s.rows){for(const field of ['visual','image','columns','rows'])assert.deepEqual(s[field],old[field],s.id);worked++;}
  if(s.id.includes('-reasoning-'))assert.ok(s.body.length>35,'Reasoning missing: '+s.id);
  if(s.kind==='notebook')assert.ok(s.notebook.includes(old.notebook),'Rule lost: '+s.id);
 }
 for(const q of learning.questions.filter(q=>q.case.lectureId===l.id)){
  const passport=l.slides.findIndex(s=>s.id===q.passportId),test=l.slides.findIndex(s=>s.id===q.testId);
  assert.equal(passport+1,test);assert.ok(q.definition.definition.length>30);assert.ok(q.rule.length>20);
  assert.ok(!inputs.has(q.case.data));inputs.add(q.case.data);
  assert.ok(q.case.options[q.case.correct]);assert.ok(q.case.reason.length>50);
  assert(q.case.model.tables.length>0);assert.equal(q.case.model.trace.length,3);assert(q.case.model.sql.trim());
  assert(q.case.practical.variants.length>0);
  for(const v of q.case.practical.variants){assert(v.stages.length>=3);assert.equal(v.stages[0].result,null);for(const s of v.stages){assert(s.action&&s.explanation);for(const t of [...s.tables,...s.result?[s.result]:[]])for(const row of t.rows)assert.equal(row.length,t.columns.length,q.id+': '+t.name);for(const e of s.links||[]){assert(s.tables[e.from]);assert(s.tables[e.to]);}}}
  for(const t of q.case.model.tables){assert(t.columns.length);for(const row of t.rows)assert.equal(row.length,t.columns.length,q.id+': '+t.name);}
  for(const e of q.case.model.links){assert(q.case.model.tables[e.from]);assert(q.case.model.tables[e.to]);assert(e.label.trim());}
  const originalTask=q.testIds.find(id=>id.endsWith('-T01-slide'));
  assert.ok(notes[originalTask].answer.includes(before.get(q.passportId).body),'Review lost: '+q.id);
  assert.deepEqual(q.testIds.map(id=>l.slides.find(s=>s.id===id).task.type),['single','multiple','short','matching']);
 }
}
const report={lectures:13,slides:ids.length,existingIdsRetained:ids.filter(id=>before.has(id)).length,readingPagesRegroupedWithRedirects:regrouped.length,addedAssessmentPages:312,addedDatabaseMaps:13,visibleWorkedExplanations:learning.workedExplanations.length,assessmentTasks:416,workedDisplaysUnchanged:worked,practicalCases:inputs.size,definitions:learning.questions.length,legacyReviews:'retained in post-attempt teacher answers and assessment explanation',status:'passed'};
fs.writeFileSync('reports/learning-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
