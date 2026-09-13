import fs from 'node:fs';
import path from 'node:path';
const files=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name)):[path.join(d,e.name)]);
const paths=files('dist');
// По прямому запросу пользователя учебные подсказки публикуются открыто в одном отдельном файле.
for(const p of paths)if(/teacher|private|\.map$/i.test(p)&&path.basename(p)!=='teacher-notes.json')throw Error('Непредусмотренный приватный путь в сборке: '+p);
const text=paths.filter(p=>/\.(html|js|json)$/.test(p)&&path.basename(p)!=='teacher-notes.json').map(p=>fs.readFileSync(p,'utf8')).join('\n');
const c=JSON.parse(fs.readFileSync('dist/course.json','utf8'));
if(/"(?:script|preparation|estimatedSeconds|answer|correct|accepted|pairs)"\s*:/.test(JSON.stringify(c)))throw Error('Приватные поля или ключи в course.json');
let checked=0;
if(fs.existsSync('private/teacher-pack.json')){
 const pack=JSON.parse(fs.readFileSync('private/teacher-pack.json','utf8'));
 for(const note of Object.values(pack.notes)){
  if(note.script.length>80&&(text.includes(note.script)||text.includes(JSON.stringify(note.script))))throw Error('Сценарий попал в сборку');checked++;
 }
}
console.log(JSON.stringify({files:paths.length,scriptsOutsideAuthorizedFileChecked:checked,teacherNotes:'public by explicit user request, separate teacher-notes.json',assessment:'public autonomous educational keys',status:'passed'}));
