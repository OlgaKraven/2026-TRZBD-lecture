import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
const value=(arg,defaultValue)=>process.argv.includes(arg)?process.argv[process.argv.indexOf(arg)+1]:defaultValue;
const bin=value('--bin',''),port=value('--port','33318');
const mysql=path.join(bin,process.platform==='win32'?'mysql.exe':'mysql');
const common=['--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+port,'--user=root','--default-character-set=utf8mb4','--batch','--raw','--skip-column-names'];
const checks=[];
const run=(text,{args=common,failure=false,pattern}={})=>{const r=spawnSync(mysql,args,{input:text,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.error)throw r.error;if(failure){assert.notEqual(r.status,0);assert.match(r.stderr,pattern||/denied|constraint|cannot be null|check.*violated/i);return r.stderr.trim();}if(r.status!==0)throw Error(r.stderr);return r.stdout.replace(/\r\n/g,'\n').trim();};
const q=text=>run('USE service_training;\n'+text);
const check=(name,fn)=>{fn();checks.push({name,status:'passed'});};
const load=fs.readFileSync('examples/sql/02_load.sql','utf8');
const classification=load.slice(load.indexOf('INSERT INTO load_rejections'),load.indexOf('INSERT INTO requests'));
check('SQL классифицирует невозможную дату, месяц и список деталей без потери строк',()=>{
 const text=`USE service_training; START TRANSACTION;
 INSERT INTO stage_requests(request_no,client_code,branch_code,status_code,received_at,part_codes) VALUES
 ('R200','C01','B01','NEW','2026-02-30 10:00:00','P01'),
 ('R201','C01','B01','NEW','2026-13-01 10:00:00','P01'),
 ('R202','C01','B01','NEW','2024-02-29 10:00:00','P01'),
 ('R203','C01','B01','NEW','2026-02-28 10:00:00','P09'),
 ('R204','C01','B01','NEW','2026-02-28 10:00:00','P01;P01');
 DELETE FROM load_rejections;
 ${classification}
 SELECT s.request_no,e.reason FROM stage_requests s JOIN load_rejections e ON e.source_row=s.source_row WHERE s.request_no BETWEEN 'R200' AND 'R204' ORDER BY s.request_no;
 SELECT COUNT(*) FROM stage_requests s LEFT JOIN load_rejections e ON e.source_row=s.source_row WHERE s.request_no='R202' AND e.source_row IS NULL;
 ROLLBACK;`;
 assert.equal(run(text),'R200\tINVALID_DATETIME\nR201\tINVALID_DATETIME\nR203\tINVALID_PART_LIST\nR204\tINVALID_PART_LIST\n1');
 assert.equal(q('SELECT COUNT(*) FROM stage_requests;'),'6');
});
const baseline="START TRANSACTION; UPDATE requests SET status_id=1 WHERE request_no='R101';";
check('показанные контрольные запросы: коды, кратность JOIN и ноль B03',()=>{
 const result=q(baseline+`
 SELECT r.request_no,c.code,b.code FROM requests r JOIN clients c ON c.id=r.client_id JOIN branches b ON b.id=r.branch_id ORDER BY r.request_no;
 SELECT COUNT(*) FROM requests r JOIN request_parts rp ON rp.request_id=r.id;
 SELECT b.code,COUNT(*),COUNT(r.id) FROM branches b LEFT JOIN requests r ON r.branch_id=b.id GROUP BY b.id,b.code ORDER BY b.code;
 SELECT b.code,COUNT(r.id) FROM branches b LEFT JOIN requests r ON r.branch_id=b.id AND r.status_id=1 GROUP BY b.id,b.code ORDER BY b.code;
 SELECT request_no FROM v_open_requests ORDER BY request_no; ROLLBACK;`);
 assert.equal(result,'R101\tC01\tB01\nR102\tC02\tB01\nR103\tC01\tB02\n4\nB01\t2\t2\nB02\t1\t1\nB03\t1\t0\nB01\t1\nB02\t0\nB03\t0\nR101\nR102');
});
check('ограничения NULL, пустого номера, повторного номера и неизвестного FK',()=>{
 for(const [number,client] of [["NULL",'1'],["''",'1'],["'R102'",'1'],["'R299'",'99999']])run(`USE service_training; INSERT INTO requests(request_no,client_id,branch_id,status_id,received_at) VALUES(${number},${client},1,1,'2026-09-01 10:00:00');`,{failure:true,pattern:/cannot be null|check.*violated|duplicate entry|constraint fails/i});
});
const password=randomBytes(24).toString('hex');
run(`CREATE USER 'training_editor_check'@'localhost' IDENTIFIED BY '${password}'; GRANT 'trzbd_editor' TO 'training_editor_check'@'localhost'; SET DEFAULT ROLE 'trzbd_editor' TO 'training_editor_check'@'localhost';`);
fs.mkdirSync('outputs/sql',{recursive:true});const config=path.resolve('outputs/sql/editor.cnf').replaceAll('\\','/');
fs.writeFileSync(config,`[client]\nhost=127.0.0.1\nport=${port}\nuser=training_editor_check\npassword=${password}\n`,{mode:0o600});
const editor=['--defaults-extra-file='+config,'--protocol=TCP','--batch','--raw','--skip-column-names'];
check('editor: INSERT VALUES и UPDATE разрешены, проба откатывается',()=>{
 assert.equal(run("START TRANSACTION; INSERT INTO service_training.completed_works VALUES(2,'DIAG'); UPDATE service_training.completed_works SET work_code='REPAIR' WHERE request_id=2 AND work_code='DIAG'; SELECT COUNT(*) FROM service_training.completed_works WHERE request_id=2; ROLLBACK;",{args:editor}),'1');
 assert.equal(q('SELECT COUNT(*) FROM completed_works WHERE request_id=2;'),'0');
});
check('editor: DELETE, базовое чтение requests и INSERT SELECT запрещены',()=>{
 for(const text of ['DELETE FROM service_training.completed_works WHERE request_id=2;', 'SELECT * FROM service_training.requests;',"INSERT INTO service_training.completed_works SELECT id,'DIAG' FROM service_training.requests WHERE request_no='R102';"])run(text,{args:editor,failure:true,pattern:/denied/i});
});
check('отзыв INSERT даёт отказ; прямое назначение является независимым путём',()=>{
 run("REVOKE INSERT ON service_training.completed_works FROM 'trzbd_editor';");
 try{
  run("INSERT INTO service_training.completed_works VALUES(2,'DIAG');",{args:editor,failure:true,pattern:/denied/i});
  run("GRANT INSERT ON service_training.completed_works TO 'training_editor_check'@'localhost';");
  run("START TRANSACTION; INSERT INTO service_training.completed_works VALUES(2,'DIAG'); ROLLBACK;",{args:editor});
 }finally{run("REVOKE INSERT ON service_training.completed_works FROM 'training_editor_check'@'localhost'; GRANT INSERT ON service_training.completed_works TO 'trzbd_editor';");}
});
check('назначение роли не равно её активности',()=>{
 run('SET ROLE NONE; SELECT * FROM service_training.completed_works;',{args:editor,failure:true,pattern:/denied/i});
 assert.match(run("SET ROLE 'trzbd_editor'; SELECT CURRENT_ROLE();",{args:editor}),/trzbd_editor/);
});
const adminPassword=randomBytes(24).toString('hex');
run(`CREATE USER 'training_schema_check'@'localhost' IDENTIFIED BY '${adminPassword}'; GRANT 'trzbd_schema_admin' TO 'training_schema_check'@'localhost'; SET DEFAULT ROLE 'trzbd_schema_admin' TO 'training_schema_check'@'localhost';`);
const adminConfig=path.resolve('outputs/sql/schema-admin.cnf').replaceAll('\\','/');fs.writeFileSync(adminConfig,`[client]\nhost=127.0.0.1\nport=${port}\nuser=training_schema_check\npassword=${adminPassword}\n`,{mode:0o600});
const admin=['--defaults-extra-file='+adminConfig,'--protocol=TCP','--batch','--raw','--skip-column-names'];
try{
 check('schema_admin: CREATE, ALTER, INDEX и CREATE VIEW разрешены',()=>{
  run('CREATE TABLE service_training.schema_probe(id INT PRIMARY KEY); ALTER TABLE service_training.schema_probe ADD COLUMN code INT; CREATE INDEX idx_schema_probe ON service_training.schema_probe(code); CREATE VIEW service_training.schema_view_probe AS SELECT 1 AS value;',{args:admin});
  assert.equal(q("SELECT COUNT(*) FROM information_schema.views WHERE table_schema=DATABASE() AND table_name='schema_view_probe';"),'1');
 });
 check('schema_admin: чтение рабочих данных и CREATE USER не выданы',()=>{
  run('SELECT * FROM service_training.requests;',{args:admin,failure:true,pattern:/denied/i});
  run("CREATE USER 'must_not_be_created'@'localhost' ACCOUNT LOCK;",{args:admin,failure:true,pattern:/denied|privilege/i});
 });
}finally{q('DROP VIEW IF EXISTS schema_view_probe; DROP TABLE IF EXISTS schema_probe;');}
fs.writeFileSync('reports/course-sql-verification.json',JSON.stringify({version:q('SELECT VERSION();'),checks},null,2)+'\n');
console.log(JSON.stringify({courseSql:'passed',checks:checks.length}));
