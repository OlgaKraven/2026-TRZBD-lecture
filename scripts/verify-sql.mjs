import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {checkInputs} from './check-input.mjs';
import {verifyBackup} from './verify-backup.mjs';
const value=(arg,fallback)=>{const i=process.argv.indexOf(arg);return i<0?fallback:process.argv[i+1];};
const bin=value('--bin',''),port=value('--port','33317');
const mysql=path.join(bin,process.platform==='win32'?'mysql.exe':'mysql');
const common=['--protocol=TCP','--host=127.0.0.1','--port='+port,'--user=root','--default-character-set=utf8mb4','--local-infile=1','--batch','--raw','--skip-column-names'];
const run=(sql,{failure=false,args=common}={})=>{
 const r=spawnSync(mysql,args,{input:sql,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
 if(r.error)throw r.error;
 if(failure){assert.notEqual(r.status,0,'Ожидался отказ: '+sql);return r.stderr.trim();}
 if(r.status!==0)throw Error(r.stderr+'\nSQL: '+sql.slice(0,200));
 return r.stdout.replace(/\r\n/g,'\n').trim();
};
fs.mkdirSync('outputs/sql',{recursive:true});
const version=run('SELECT VERSION();');assert.match(version,/^8\.4\./);
assert.equal(run("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='service_training';"),'0','Нужна новая отдельная учебная цель; существующая схема не удаляется.');
const result={version,headers:checkInputs(),checks:[],plans:{}};
const check=(name,fn)=>{fn();result.checks.push({name,status:'passed'});};
for(const file of ['01_schema.sql','02_load.sql','03_verify.sql','04_objects.sql','05_roles.sql']){
 const output=run(fs.readFileSync('examples/sql/'+file,'utf8'));fs.writeFileSync('outputs/sql/'+file+'.txt',output+'\n');
 result.checks.push({name:file,status:'passed'});
}
const q=sql=>run('USE service_training;\n'+sql);
check('баланс 6 = 3 + 3',()=>assert.equal(q('SELECT (SELECT COUNT(*) FROM stage_requests),(SELECT COUNT(*) FROM requests),(SELECT COUNT(*) FROM load_rejections);'),'6\t3\t3'));
check('причины отклонений',()=>assert.equal(q('SELECT reason FROM load_rejections ORDER BY source_row;'),'UNKNOWN_BRANCH\nEMPTY_REQUEST_NO\nDUPLICATE_REQUEST_NO'));
check('четыре факта деталей',()=>assert.equal(q('SELECT COUNT(*) FROM request_parts;'),'4'));
check('исходное view: R101 и R102',()=>assert.equal(q('SELECT request_no FROM v_open_requests ORDER BY request_no;'),'R101\nR102'));
check('view видит изменение и откат',()=>assert.equal(q("START TRANSACTION; UPDATE requests SET status_id=3 WHERE request_no='R102'; SELECT COUNT(*) FROM v_open_requests; ROLLBACK; SELECT COUNT(*) FROM v_open_requests;"),'1\n2'));
check('агрегат B03 = 0',()=>assert.equal(q("SELECT request_count FROM v_branch_counts WHERE code='B03';"),'0'));
check('контрольное view находит неверного существующего родителя',()=>{
 assert.equal(q('SELECT COUNT(*) FROM v_source_mismatch;'),'0');
 assert.equal(q("START TRANSACTION; UPDATE requests SET client_id=2 WHERE request_no='R101'; SELECT request_no,expected,actual FROM v_source_mismatch; ROLLBACK;"),'R101\tC01\tC02');
 assert.equal(q('SELECT COUNT(*) FROM v_source_mismatch;'),'0');
});
check('агрегированный view не обновляется',()=>run('USE service_training; UPDATE v_branch_counts SET request_count=7;',{failure:true}));
check('SELECT * фиксируется при CREATE VIEW',()=>{
 q('CREATE TABLE view_probe(id INT); CREATE VIEW v_probe AS SELECT * FROM view_probe; ALTER TABLE view_probe ADD COLUMN note VARCHAR(30);');
 assert.equal(q("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='service_training' AND table_name='v_probe';"),'1');
 q('DROP VIEW v_probe; DROP TABLE view_probe;');
});
check('ошибка FK не отменяет предыдущий оператор сама',()=>{
 const out=run("USE service_training; START TRANSACTION; UPDATE requests SET status_id=3 WHERE request_no='R102'; INSERT INTO completed_works SELECT id,'UNKNOWN' FROM requests WHERE request_no='R102'; SELECT status_id FROM requests WHERE request_no='R102'; ROLLBACK; SELECT status_id FROM requests WHERE request_no='R102';",{args:[...common,'--force']});
 assert.equal(out,'3\n2');
});
if(process.argv.includes('--restore-port'))verifyBackup({bin,sourcePort:port,restorePort:value('--restore-port','33319')});
const id101=q("SELECT id FROM requests WHERE request_no='R101';"),id102=q("SELECT id FROM requests WHERE request_no='R102';"),id103=q("SELECT id FROM requests WHERE request_no='R103';");
check('процедура: отказ после UPDATE откатывает всё',()=>{
 run(`USE service_training; CALL close_request(${id102},'UNKNOWN');`,{failure:true});
 assert.equal(q(`SELECT status_id,(SELECT COUNT(*) FROM completed_works WHERE request_id=${id102}),(SELECT COUNT(*) FROM audit_request_status WHERE request_id=${id102}) FROM requests WHERE id=${id102};`),'2\t0\t0');
});
check('процедура: неизвестная и закрытая заявки',()=>{
 run("USE service_training; CALL close_request(99999,'DIAG');",{failure:true});
 run(`USE service_training; CALL close_request(${id103},'DIAG');`,{failure:true});
});
check('триггер игнорирует изменение другого поля',()=>{
 q(`START TRANSACTION; UPDATE requests SET received_at=DATE_ADD(received_at,INTERVAL 1 MINUTE) WHERE id=${id101}; SELECT COUNT(*) FROM audit_request_status; ROLLBACK;`);
 assert.equal(q('SELECT COUNT(*) FROM audit_request_status;'),'0');
});
check('успешный CALL: статус, работа и журнал',()=>{
 q(`CALL close_request(${id101},'DIAG');`);
 assert.equal(q(`SELECT status_id,(SELECT COUNT(*) FROM completed_works WHERE request_id=${id101}),(SELECT COUNT(*) FROM audit_request_status WHERE request_id=${id101}) FROM requests WHERE id=${id101};`),'3\t1\t1');
 run(`USE service_training; CALL close_request(${id101},'DIAG');`,{failure:true});
});
const pw=randomBytes(24).toString('hex');
run(`CREATE USER 'training_operator'@'localhost' IDENTIFIED BY '${pw}'; GRANT 'trzbd_viewer' TO 'training_operator'@'localhost'; SET DEFAULT ROLE 'trzbd_viewer' TO 'training_operator'@'localhost';`);
const option=path.resolve('outputs/sql/viewer.cnf').replace(/\\/g,'/');
fs.writeFileSync(option,`[client]\nhost=127.0.0.1\nport=${port}\nuser=training_operator\npassword=${pw}\n`,{mode:0o600});
const viewer=['--defaults-extra-file='+option,'--protocol=TCP','--batch','--raw','--skip-column-names'];
check('viewer: активная роль и разрешённое view',()=>{assert.match(run('SELECT CURRENT_ROLE();',{args:viewer}),/trzbd_viewer/);assert.equal(run('SELECT COUNT(*) FROM service_training.v_open_requests;',{args:viewer}),'1');});
check('viewer: запрещены базовая таблица и UPDATE',()=>{run('SELECT * FROM service_training.requests;',{args:viewer,failure:true});run('UPDATE service_training.requests SET status_id=1;',{args:viewer,failure:true});});
check('INVOKER без базовых прав даёт отказ',()=>{
 q('CREATE SQL SECURITY INVOKER VIEW v_invoker_probe AS SELECT request_no FROM requests;');
 run("GRANT SELECT ON service_training.v_invoker_probe TO 'trzbd_viewer';");
 run('SELECT * FROM service_training.v_invoker_probe;',{args:viewer,failure:true});
 q('DROP VIEW v_invoker_probe;');
});
const ix=fs.readFileSync('examples/sql/06_index_experiment.sql','utf8');
const split=ix.indexOf('CREATE INDEX');
const before=run(ix.slice(0,split));
const after=run('USE service_training;\n'+ix.slice(split));
result.plans={before,after};
check('план до и после: составной индекс выбран',()=>{assert.match(before,/\bALL\b/);assert.match(after,/idx_plan_branch_status_date/);assert.equal(q('SELECT COUNT(*) FROM requests_plan;'),'10000');});
fs.writeFileSync('outputs/sql/verification.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({version,checks:result.checks.length,status:'passed',plans:result.plans},null,2));
