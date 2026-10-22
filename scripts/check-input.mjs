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
export function isCalendarDatetime(value){
 const m=/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
 if(!m)return false;
 const [y,mo,d,h,mi,s]=m.slice(1).map(Number);
 if(y<1000||y>9999||mo<1||mo>12||d<1||h>23||mi>59||s>59)return false;
 const date=new Date(Date.UTC(y,mo-1,d,h,mi,s));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===mo-1&&date.getUTCDate()===d;
}
export function classifyRequests(rows,{branches,clients,statuses=['NEW','WORK','CLOSED'],parts=['P01','P07']}){
 const seen=new Set();return rows.map((row,i)=>{
  const [number,client,branch,status,date,list]=row,wasSeen=seen.has(number);seen.add(number);
  const tokens=list.split(';');let reason='';
  if(!number.trim())reason='EMPTY_REQUEST_NO';
  else if(!branches.includes(branch))reason='UNKNOWN_BRANCH';
  else if(!clients.includes(client))reason='UNKNOWN_CLIENT';
  else if(!statuses.includes(status))reason='UNKNOWN_STATUS';
  else if(!isCalendarDatetime(date))reason='INVALID_DATETIME';
  else if(tokens.some(code=>!parts.includes(code))||new Set(tokens).size!==tokens.length)reason='INVALID_PART_LIST';
  else if(wasSeen)reason='DUPLICATE_REQUEST_NO';
  return {source_row:i+1,request_no:number,reason};
 });
}
const expected={branches:['code','name'],clients:['code','name'],requests:['request_no','client_code','branch_code','status_code','received_at','part_codes']};
export function checkInputs(dir='examples/data'){
 return Object.fromEntries(Object.entries(expected).map(([name,header])=>[name,checkHeader(fs.readFileSync(path.join(dir,name+'.csv'),'utf8'),header).length]));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify({headers:'passed',rows:checkInputs(process.argv[2]),note:'Пустой номер, неизвестный филиал и повтор заявки намеренно оставлены для протокола отклонений.'},null,2));
