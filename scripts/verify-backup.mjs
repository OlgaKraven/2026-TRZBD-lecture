import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
export function verifyBackup({bin,sourcePort,restorePort}){
 const out=path.resolve('outputs/backup');fs.mkdirSync(out,{recursive:true});
 const executable=name=>path.join(bin,name+(process.platform==='win32'?'.exe':''));
 const args=port=>['--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+port,'--user=root','--default-character-set=utf8mb4','--batch','--raw','--skip-column-names'];
 const invoke=(name,argv,input)=>{const r=spawnSync(executable(name),argv,{input,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});if(r.error)throw r.error;return r;};
 const sql=(port,text,{fail=false,argv=args(port)}={})=>{const r=invoke('mysql',argv,text);if(fail){assert.notEqual(r.status,0);assert.match(r.stderr,/denied|constraint fails|No open request/i);return r.stderr.trim();}if(r.status!==0)throw Error(r.stderr);return r.stdout.replace(/\r\n/g,'\n').trim();};
 const source=text=>sql(sourcePort,'USE service_training;\n'+text),target=text=>sql(restorePort,'USE service_training;\n'+text);
 assert.notEqual(String(sourcePort),String(restorePort),'Источник и цель должны быть разными экземплярами');
 assert.equal(sql(restorePort,"SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='service_training';"),'0','Восстановление допускается только в новую цель');
 const checkNames=[];const check=(name,fn)=>{fn();checkNames.push(name);};
 const version=sql(sourcePort,'SELECT VERSION();');assert.equal(sql(restorePort,'SELECT VERSION();'),version);
 const id=s=>'`'+s.replaceAll('`','``')+'`';
 const snapshot=port=>{
  const q=text=>sql(port,'USE service_training;\n'+text);
  const tables=q("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name;").split('\n');
  const data={},definitions={};
  for(const name of tables){
   const cols=q(`SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='${name}' ORDER BY ordinal_position;`).split('\n');
   data[name]=q(`SELECT JSON_ARRAY(${cols.map(id).join(',')}) FROM ${id(name)} ORDER BY ${cols.map(id).join(',')};`);
   definitions[name]=q('SHOW CREATE TABLE '+id(name)+';').replace(/AUTO_INCREMENT=\d+\s*/g,'');
  }
  return {tables,data,definitions,
   views:q('SELECT table_name,view_definition,check_option,is_updatable,definer,security_type FROM information_schema.views WHERE table_schema=DATABASE() ORDER BY table_name;'),
   routines:q('SELECT routine_name,routine_definition,security_type,definer FROM information_schema.routines WHERE routine_schema=DATABASE() ORDER BY routine_name;'),
   triggers:q('SELECT trigger_name,event_manipulation,event_object_table,action_statement,action_timing,definer FROM information_schema.triggers WHERE trigger_schema=DATABASE() ORDER BY trigger_name;'),
   foreignKeys:q('SELECT table_name,column_name,referenced_table_name,referenced_column_name FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND referenced_table_name IS NOT NULL ORDER BY table_name,column_name;')};
 };
 const before=snapshot(sourcePort);assert.equal(before.tables.length,13);assert.equal(before.foreignKeys.split('\n').length,8);
 assert.equal(source('SELECT COUNT(*) FROM completed_works;'),'1');
 const password=randomBytes(24).toString('hex');
 sql(sourcePort,`CREATE USER 'training_backup'@'localhost' IDENTIFIED BY '${password}'; GRANT SELECT,SHOW VIEW,TRIGGER,EVENT ON service_training.* TO 'training_backup'@'localhost'; GRANT SHOW_ROUTINE ON *.* TO 'training_backup'@'localhost';`);
 const config=path.join(out,'backup.cnf').replaceAll('\\','/');
 fs.writeFileSync(config,`[client]\nhost=127.0.0.1\nport=${sourcePort}\nuser=training_backup\npassword=${password}\ndefault-character-set=utf8mb4\n`,{mode:0o600});
 const dump=path.join(out,'service_training.sql');
 const dumpArgs=['--defaults-extra-file='+config,'--protocol=TCP','--single-transaction','--routines','--events','--triggers','--hex-blob','--no-tablespaces','--set-gtid-purged=OFF','--result-file='+dump,'service_training'];
 const dumpResult=invoke('mysqldump',dumpArgs);assert.equal(dumpResult.status,0,dumpResult.stderr);
 checkNames.push('dump выполнен ограниченной учётной записью training_backup');
 sql(restorePort,"CREATE DATABASE service_training CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE USER 'trzbd_view_owner'@'localhost' ACCOUNT LOCK; GRANT SELECT ON service_training.* TO 'trzbd_view_owner'@'localhost';");
 sql(restorePort,fs.readFileSync(dump,'utf8'),{argv:[...args(restorePort),'service_training']});
 const restored=snapshot(restorePort);
 check('13 таблиц и состав имён совпали',()=>assert.deepEqual(restored.tables,before.tables));
 check('все строки всех таблиц совпали',()=>assert.deepEqual(restored.data,before.data));
 check('определения таблиц и 8 FK совпали',()=>{assert.deepEqual(restored.definitions,before.definitions);assert.equal(restored.foreignKeys,before.foreignKeys);});
 check('3 view, процедура и триггер восстановлены с определениями',()=>{assert.equal(restored.views,before.views);assert.equal(restored.routines,before.routines);assert.equal(restored.triggers,before.triggers);});
 check('view исполняются в независимой цели',()=>{assert.equal(target('SELECT request_no FROM v_open_requests ORDER BY request_no;'),'R101\nR102');assert.equal(target('SELECT COUNT(*) FROM v_source_mismatch;'),'0');});
 check('поздняя ошибка процедуры откатывает статус, работу и журнал',()=>{sql(restorePort,"USE service_training; CALL close_request(2,'UNKNOWN');",{fail:true});assert.equal(target('SELECT status_id,(SELECT COUNT(*) FROM completed_works WHERE request_id=2),(SELECT COUNT(*) FROM audit_request_status WHERE request_id=2) FROM requests WHERE id=2;'),'2\t0\t0');});
 sql(restorePort,fs.readFileSync('examples/sql/05_roles.sql','utf8'));
 const viewerPassword=randomBytes(24).toString('hex');
 sql(restorePort,`CREATE USER 'restore_viewer'@'localhost' IDENTIFIED BY '${viewerPassword}'; GRANT 'trzbd_viewer' TO 'restore_viewer'@'localhost'; SET DEFAULT ROLE 'trzbd_viewer' TO 'restore_viewer'@'localhost';`);
 const viewerConfig=path.join(out,'restore-viewer.cnf').replaceAll('\\','/');fs.writeFileSync(viewerConfig,`[client]\nhost=127.0.0.1\nport=${restorePort}\nuser=restore_viewer\npassword=${viewerPassword}\n`,{mode:0o600});
 const viewer=['--defaults-extra-file='+viewerConfig,'--protocol=TCP','--batch','--raw','--skip-column-names'];
 check('роли поставлены отдельно: viewer читает view и не читает requests',()=>{assert.equal(sql(restorePort,'SELECT COUNT(*) FROM service_training.v_open_requests;',{argv:viewer}),'2');sql(restorePort,'SELECT * FROM service_training.requests;',{argv:viewer,fail:true});});
 check('успешное закрытие в цели создаёт статус, работу и журнал',()=>{target("CALL close_request(1,'DIAG');");assert.equal(target('SELECT status_id,(SELECT COUNT(*) FROM completed_works WHERE request_id=1),(SELECT COUNT(*) FROM audit_request_status WHERE request_id=1) FROM requests WHERE id=1;'),'3\t1\t1');});
 check('источник не изменён копированием и испытанием цели',()=>assert.deepEqual(snapshot(sourcePort),before));
 const report={version,sourcePort:String(sourcePort),restorePort:String(restorePort),separateInstances:true,baseline:{tables:13,foreignKeys:8,views:3,routines:1,triggers:1,requests:3,positions:4,works:1},dump:{sha256:createHash('sha256').update(fs.readFileSync(dump)).digest('hex'),bytes:fs.statSync(dump).size,options:dumpArgs.filter(a=>!a.startsWith('--defaults-extra-file=')&&!a.startsWith('--result-file='))},checks:checkNames.map(name=>({name,status:'passed'}))};
 fs.writeFileSync('reports/backup-verification.json',JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync('reports/schema-metadata.json',JSON.stringify({version,tables:before.tables,foreignKeys:before.foreignKeys.split('\n').map(line=>{const [table,column,parent,parentColumn]=line.split('\t');return {table,column,parent,parentColumn};})},null,2)+'\n');
 console.log(JSON.stringify({backup:'passed',checks:report.checks.length,separateInstances:true}));return report;
}
