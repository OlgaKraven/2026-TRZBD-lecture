import fs from 'node:fs';
import QRCode from 'qrcode';
import sharp from 'sharp';
import jsQR from 'jsqr';
const c=JSON.parse(fs.readFileSync('public/course.json','utf8'));
const refs=[...c.literature.primary,...c.literature.additional];fs.mkdirSync('public/qr',{recursive:true});
for(const [i,url]of [...refs.map(r=>r.url),c.materialsUrl].entries()){
 const file='public/qr/'+(i===refs.length?'trzbd-materials':'book-'+(i+1))+'.png';
 await QRCode.toFile(file,url,{width:440,margin:3,errorCorrectionLevel:'M',color:{dark:'#171719',light:'#ffffff'}});
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data!==url)throw Error('QR did not decode: '+file);
}
console.log('Verified QR assets: '+(refs.length+1));
