import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const fingerprint=pack=>{
 const fingerprints=Object.fromEntries(Object.entries(pack.notes).map(([id,n])=>[id,Object.fromEntries(Object.entries(n).map(([field,value])=>[field,createHash('sha256').update(String(value)).digest('hex')]))]));
 return {previousVersion:pack.contentVersion,fingerprints};
};
const saved=fs.existsSync('public/notes-compatibility.json')?JSON.parse(fs.readFileSync('public/notes-compatibility.json','utf8')).versions||[]:[];
const versions=['73db447d9006776fc62114169daf07949ab4c3d6','aeeba0ee9b485dd728a821d0f2682cec4aef7633'].map(commit=>fingerprint(JSON.parse(execFileSync('git',['show',commit+':public/teacher-notes.json'],{encoding:'utf8',maxBuffer:16*1024*1024}))));
for(const v of saved)if(!versions.some(x=>x.previousVersion===v.previousVersion))versions.push(v);
if(process.argv.includes('--capture-current')){const current=fingerprint(JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8')));if(!versions.some(x=>x.previousVersion===current.previousVersion))versions.push(current);}
fs.writeFileSync('public/notes-compatibility.json',JSON.stringify({courseId:'trzbd',versions})+'\n');
