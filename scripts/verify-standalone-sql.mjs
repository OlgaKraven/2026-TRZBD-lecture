import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const option=k=>process.argv[process.argv.indexOf(k)+1];
for(const k of ['--bin','--source-port','--restore-port'])if(!process.argv.includes(k))throw Error('Required '+k);
const bin=option('--bin'),sourcePort=option('--source-port'),restorePort=option('--restore-port');
assert.notEqual(sourcePort,restorePort);
const course=JSON.parse(fs.readFileSync('public/course.json','utf8')),slides=course.lectures.flatMap(l=>l.slides);
const code=id=>{const s=slides.find(s=>s.id.endsWith('-content-'+id));assert(s,id);return s.visual.parts.map(p=>p.code).join('\n');};
const args=port=>['--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+port,'--user=root','--local-infile=1','--default-character-set=utf8mb4','--batch','--raw','--skip-column-names'];
const invoke=(exe,argv,input='',extra={})=>{const r=spawnSync(path.join(bin,exe+(process.platform==='win32'?'.exe':'')),argv,{input,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024,...extra});if(r.error)throw r.error;return r;};
const sql=(port,text,options={})=>{const r=invoke('mysql',args(port),text);if(options.failure){assert.notEqual(r.status,0);assert.match(r.stderr,options.failure);return '';}assert.equal(r.status,0,r.stderr);return r.stdout.replaceAll('\r\n','\n').trim();};
const source=t=>sql(sourcePort,'USE service_training;\n'+t),target=t=>sql(restorePort,'USE service_training;\n'+t);
const checks=[],check=(name,fn)=>{fn();checks.push({name,status:'passed'});};
for(const port of [sourcePort,restorePort]){assert.match(sql(port,'SELECT VERSION();'),/^8\.4\./);assert.equal(sql(port,"SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='service_training';"),'0','Requires a fresh isolated instance');}
const schema=fs.readFileSync('examples/sql/01_schema.sql','utf8'),load=fs.readFileSync('examples/sql/02_load.sql','utf8');
sql(sourcePort,schema);sql(sourcePort,load);
check('CSV на экранах точно соответствует всем шести строкам источника',()=>{
 const rows=fs.readFileSync('examples/data/requests.csv','utf8').trim().split(/\r?\n/);
 assert.deepEqual(code('source-accepted').split('\n'),rows.slice(0,4));assert.deepEqual(code('source-rejected').split('\n'),[rows[0],...rows.slice(4)]);
});
check('Два фрагмента CREATE TABLE образуют исполняемое определение с тремя именованными FK',()=>{
 sql(sourcePort,`CREATE DATABASE student_ddl; USE student_ddl; CREATE TABLE clients(id BIGINT UNSIGNED PRIMARY KEY); CREATE TABLE branches(id BIGINT UNSIGNED PRIMARY KEY); CREATE TABLE request_statuses(id BIGINT UNSIGNED PRIMARY KEY);\n`+code('requests-ddl-start')+'\n'+code('requests-ddl-end'));
 assert.equal(sql(sourcePort,"SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema='student_ddl';"),'3');
});
check('INSERT на экране разрешает коды в id и вставляет только три принятые строки',()=>{
 sql(sourcePort,schema.replaceAll('service_training','student_load'));
 sql(sourcePort,load.slice(0,load.indexOf('INSERT INTO requests')).replaceAll('service_training','student_load'));
 sql(sourcePort,'USE student_load;\n'+code('insert-resolved'));
 assert.equal(sql(sourcePort,'USE student_load; SELECT request_no,client_id,branch_id,status_id FROM requests ORDER BY request_no;'),'R101\t1\t1\t1\nR102\t2\t1\t2\nR103\t1\t2\t3');
});
check('Сверка обнаруживает подмену существующего клиента, которую не ловит FK',()=>{
 assert.equal(source(code('compare-source-parent')),'');
 assert.equal(source("START TRANSACTION; UPDATE requests SET client_id=2 WHERE request_no='R101';\n"+code('compare-source-parent')+'\nROLLBACK;'),'1\tC01\tC02');
});
source(code('view-owner-setup'));
const objects=fs.readFileSync('examples/sql/04_objects.sql','utf8');
source(objects.slice(objects.indexOf('CREATE DEFINER='),objects.indexOf('DELIMITER $$')));
check('Владелец VIEW создан до определения, и VIEW возвращает R101 и R102',()=>assert.equal(source('SELECT request_no FROM v_open_requests ORDER BY request_no;'),'R101\nR102'));
source(code('trigger-example'));
const procedure=['procedure-create-start','procedure-example','procedure-body-finish','procedure-create-end'].map(code).join('\n');
check('Начало, два фрагмента тела и завершение создают одну процедуру',()=>source(procedure));
check('CALL с экрана подтверждает статус, работу и одно событие аудита',()=>{
 assert.equal(source(code('procedure-call')),'CLOSED\tDIAG');
 assert.equal(source("SELECT COUNT(*) FROM audit_request_status a JOIN requests r ON r.id=a.request_id WHERE r.request_no='R101';"),'1');
});
check('Поздняя ошибка и повторный CALL дают отказ без частичного изменения',()=>{
 sql(sourcePort,"USE service_training; CALL close_request(2,'UNKNOWN');",{failure:/foreign key constraint fails/i});
 sql(sourcePort,"USE service_training; CALL close_request(1,'DIAG');",{failure:/уже закрыта/});
 assert.equal(source("SELECT s.code,(SELECT COUNT(*) FROM completed_works w WHERE w.request_id=r.id),(SELECT COUNT(*) FROM audit_request_status a WHERE a.request_id=r.id) FROM requests r JOIN request_statuses s ON s.id=r.status_id WHERE r.request_no='R102';"),'WORK\t0\t0');
});
check('Последовательный опыт индекса выполняется без повторного CREATE существующего имени',()=>{
 source(fs.readFileSync('examples/sql/06_index_experiment.sql','utf8'));
 source(code('plans-reset'));source(code('plans-example'));
 assert.equal(source("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='requests_plan' AND index_name='idx_plan_branch_status_date';"),'3');
 source('DROP TABLE requests_plan;');
});
check('Пользователь с новой ролью читает VIEW и не читает requests',()=>{
 const creation=source(code('role-user-setup')),password=creation.split('\t')[2];assert(password);
 source(code('activation-example').split('-- В новом')[0]);
 const userArgs=args(sourcePort).filter(a=>!a.startsWith('--user=')).concat('--user=training_operator');
 const good=invoke('mysql',userArgs,'SELECT COUNT(*) FROM service_training.v_open_requests;',{env:{...process.env,MYSQL_PWD:password}});
 assert.equal(good.status,0,good.stderr);assert.equal(good.stdout.trim(),'1');
 const denied=invoke('mysql',userArgs,'SELECT * FROM service_training.requests;',{env:{...process.env,MYSQL_PWD:password}});
 assert.notEqual(denied.status,0);assert.match(denied.stderr,/denied/i);
});
source("DELETE FROM completed_works WHERE request_id=1; UPDATE requests SET status_id=1 WHERE request_no='R101'; DELETE FROM audit_request_status;");
source(objects.slice(objects.lastIndexOf('CREATE SQL SECURITY INVOKER VIEW v_source_mismatch')));
const out=path.resolve('outputs/standalone-sql');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'backup.cnf'),`[client]\nprotocol=tcp\nhost=127.0.0.1\nport=${sourcePort}\nuser=root\n`);
fs.writeFileSync(path.join(out,'restore.cnf'),`[client]\nprotocol=tcp\nhost=127.0.0.1\nport=${restorePort}\nuser=root\n`);
check('Однострочная команда dump с экрана создаёт копию',()=>{
 const dump=code('dump-example').split(/\s+/);assert.equal(dump.shift(),'mysqldump');
 const r=invoke('mysqldump',dump,'',{cwd:out});assert.equal(r.status,0,r.stderr);assert(fs.statSync(path.join(out,'service_training.sql')).size>1000);
});
check('SOURCE из лекции восстанавливает копию в отдельную чистую цель',()=>{
 const connection=code('restore-connect').split('\n')[0].split(/\s+/);assert.equal(connection.shift(),'mysql');
 const preflight=invoke('mysql',connection,"SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='service_training';",{cwd:out});assert.equal(preflight.status,0,preflight.stderr);assert.equal(preflight.stdout.replaceAll('\r\n','\n').trim(),'COUNT(*)\n0');
 sql(restorePort,code('view-owner-setup'));
 const r=invoke('mysql',connection,code('restore-import'),{cwd:out});assert.equal(r.status,0,r.stderr);
 assert.equal(target("SELECT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'),(SELECT COUNT(*) FROM information_schema.views WHERE table_schema=DATABASE()),(SELECT COUNT(*) FROM requests),(SELECT COUNT(*) FROM completed_works),(SELECT COUNT(*) FROM audit_request_status);"),'13\t3\t3\t1\t0');
 assert.equal(target('SELECT request_no FROM v_open_requests ORDER BY request_no;'),'R101\nR102');
 assert.equal(target(code('procedure-call')),'CLOSED\tDIAG');
});
for(const f of ['backup.cnf','restore.cnf'])fs.unlinkSync(path.join(out,f));
fs.writeFileSync('reports/standalone-sql-verification.json',JSON.stringify({contentVersion:course.contentVersion,version:sql(sourcePort,'SELECT VERSION();'),isolated:true,checks,status:'passed',limits:'Execution covers the listed student paths on two fresh loopback instances. It is not execution of every fragment in the course.'},null,2)+'\n');
console.log(JSON.stringify({checks:checks.length,status:'passed'}));
