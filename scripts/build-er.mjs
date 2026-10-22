import fs from 'node:fs';
import sharp from 'sharp';
const dir='public/diagrams';fs.mkdirSync(dir,{recursive:true});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function diagram(file,nodes,edges,caption){
 const width=1400,height=700;
 const boxes=nodes.map(n=>`<g><rect x="${n.x}" y="${n.y}" width="${n.w||330}" height="${n.h||150}" rx="12" fill="#fff" stroke="#263746" stroke-width="2"/><path d="M${n.x+1} ${n.y+43}h${(n.w||330)-2}" stroke="#df001b" stroke-width="3"/><text x="${n.x+18}" y="${n.y+29}" class="title">${escape(n.name)}</text>${n.fields.map((s,i)=>`<text x="${n.x+18}" y="${n.y+72+i*27}">${escape(s)}</text>`).join('')}</g>`).join('');
 const lines=edges.map(e=>`<path d="${e.path}" stroke="#df001b" stroke-width="3" fill="none"/><rect x="${e.x-8}" y="${e.y-22}" width="${e.width||235}" height="28" fill="#f6f7f9"/><text x="${e.x}" y="${e.y}" class="edge">${escape(e.label)}</text>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escape(caption)}</title><style>text{font:22px Arial,sans-serif;fill:#17232d}.title{font-weight:bold;font-size:25px}.edge{font-size:19px}</style><rect width="1400" height="700" fill="#f6f7f9"/>${lines}${boxes}<text x="35" y="670" style="font-size:21px">${escape(caption)}</text></svg>`;
 fs.writeFileSync(`${dir}/${file}`,svg+'\n');
}
diagram('service-core.svg',[
 {name:'clients',x:40,y:40,fields:['PK id','UK code','name']},
 {name:'branches',x:40,y:250,fields:['PK id','UK code','name']},
 {name:'request_statuses',x:40,y:460,fields:['PK id','UK code','name']},
 {name:'requests',x:850,y:190,h:255,w:480,fields:['PK id; UK request_no','FK client_id NOT NULL','FK branch_id NOT NULL','FK status_id NOT NULL','received_at NOT NULL']}
],[
 {path:'M370 115H640V265H850',x:445,y:96,label:'1 ← 0..N: client_id'},
 {path:'M370 325H850',x:470,y:314,label:'1 ← 0..N: branch_id'},
 {path:'M370 535H660V375H850',x:440,y:524,label:'1 ← 0..N: status_id'}
],'Каждая заявка имеет ровно одного родителя каждого вида; у родителя может быть 0..N заявок.');
diagram('service-details.svg',[
 {name:'requests',x:25,y:250,w:280,fields:['PK id','UK request_no']},
 {name:'request_parts',x:520,y:45,w:350,h:180,fields:['PK/FK request_id','PK/FK part_id','quantity > 0']},
 {name:'parts',x:1090,y:60,w:280,fields:['PK id','UK code']},
 {name:'completed_works',x:520,y:425,w:350,h:180,fields:['PK/FK request_id','PK/FK work_code']},
 {name:'work_types',x:1090,y:440,w:280,fields:['PK code','name']}
],[
 {path:'M305 290H400V135H520',x:325,y:125,label:'1 → 0..N',width:125},
 {path:'M870 135H1090',x:904,y:124,label:'0..N → 1',width:125},
 {path:'M305 350H400V515H520',x:325,y:504,label:'1 → 0..N',width:125},
 {path:'M870 515H1090',x:904,y:504,label:'0..N → 1',width:125}
],'Составной PK ограничивает пару; каждый компонент одновременно ссылается на своего родителя.');
for(const name of ['service-core','service-details'])await sharp(`${dir}/${name}.svg`).png().toFile(`${dir}/${name}.png`);
console.log('ER: 2 читаемых фрагмента; полная структура сверяется по метаданным.');
