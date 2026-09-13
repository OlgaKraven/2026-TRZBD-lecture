import fs from 'node:fs';import {PNG} from 'pngjs';import jsQR from 'jsqr';
const course=JSON.parse(fs.readFileSync('public/course.json','utf8'));const expected=[...course.literature.primary,...course.literature.additional].map(r=>r.url).concat(course.materialsUrl);const results=[];
for(let i=0;i<6;i++){const p=PNG.sync.read(fs.readFileSync(`../trzbd-pdf-qa/qr-page-${i+2}.png`));const result=jsQR(new Uint8ClampedArray(p.data),p.width,p.height);if(result?.data!==expected[i])throw Error(`QR ${i}: ${result?.data}`);results.push({page:i+2,url:result.data,status:'passed'});}
fs.writeFileSync('reports/qr-check.json',JSON.stringify(results,null,2));console.log(results);
