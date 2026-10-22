import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const pack=JSON.parse(execFileSync('git',['show','73db447d9006776fc62114169daf07949ab4c3d6:public/teacher-notes.json'],{encoding:'utf8',maxBuffer:16*1024*1024}));
const fingerprints=Object.fromEntries(Object.entries(pack.notes).map(([id,n])=>[id,Object.fromEntries(Object.entries(n).map(([field,value])=>[field,createHash('sha256').update(String(value)).digest('hex')]))]));
fs.writeFileSync('public/notes-compatibility.json',JSON.stringify({courseId:pack.courseId,previousVersion:pack.contentVersion,fingerprints})+'\n');
