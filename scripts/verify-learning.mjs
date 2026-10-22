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
assert.deepEqual(new Set(ids),new Set(before.keys()));
const inputs=new Set();let worked=0;
for(const l of current.lectures){
 assert.equal(l.slides.length,previous.lectures.find(x=>x.id===l.id).slides.length);
 for(const s of l.slides){const old=before.get(s.id);
  if(s.visual||s.image||s.rows){for(const field of ['visual','image','columns','rows'])assert.deepEqual(s[field],old[field],s.id);worked++;}
  if(s.id.includes('-reasoning-'))assert.equal(s.body,s.id==='s08-03-search-field-indexes-content-index-register-reasoning-1'?old.body.replace('10093','9799'):old.body);
  if(s.kind==='notebook')assert.ok(s.notebook.includes(old.notebook),'Rule lost: '+s.id);
 }
 for(const q of learning.questions.filter(q=>q.case.lectureId===l.id)){
  const passport=l.slides.findIndex(s=>s.id===q.passportId),test=l.slides.findIndex(s=>s.id===q.testId);
  assert.equal(passport+1,test);assert.ok(q.definition.definition.length>30);assert.ok(q.rule.length>20);
  assert.ok(!inputs.has(q.case.data));inputs.add(q.case.data);
  assert.ok(q.case.options[q.case.correct]);assert.ok(q.case.reason.length>50);
  assert.ok(notes[q.testId].answer.includes(before.get(q.passportId).body),'Review lost: '+q.id);
 }
}
const report={lectures:13,slideIdsPreserved:ids.length,workedDisplaysUnchanged:worked,independentCases:inputs.size,definitions:learning.questions.length,legacyReviews:'retained in post-attempt teacher answers and assessment explanation',status:'passed'};
fs.writeFileSync('reports/learning-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
