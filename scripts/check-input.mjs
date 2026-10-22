import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function parseCsv(text){
 const rows=[];let row=[],field='',quoted=false;
 const input=text.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(c==='"'){if(quoted&&input[i+1]==='"'){field+='"';i++;}else if(quoted||field==='')quoted=!quoted;else throw Error('Кавычка внутри некавыченного поля');}
  else if(c===','&&!quoted){row.push(field);field='';}
  else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw Error('Незакрытые кавычки CSV');
 if(field!==''||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
 return rows;
}
export function checkHeader(text,expected){
 const rows=parseCsv(text),actual=rows[0]||[];
 if(actual.length!==expected.length||actual.some((x,i)=>x!==expected[i]))throw Error(`Заголовок: ожидался ${expected.join(',')}; получен ${actual.join(',')}`);
 for(const [i,row] of rows.slice(1).entries())if(row.length!==expected.length)throw Error(`Строка ${i+2}: ожидалось полей ${expected.length}, получено ${row.length}`);
 return rows.slice(1);
}
const expected={branches:['code','name'],clients:['code','name'],requests:['request_no','client_code','branch_code','status_code','received_at','part_codes']};
export function checkInputs(dir='examples/data'){
 return Object.fromEntries(Object.entries(expected).map(([name,header])=>[name,checkHeader(fs.readFileSync(path.join(dir,name+'.csv'),'utf8'),header).length]));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify({headers:'passed',rows:checkInputs(process.argv[2]),note:'Пустой номер, неизвестный филиал и повтор заявки намеренно оставлены для протокола отклонений.'},null,2));
