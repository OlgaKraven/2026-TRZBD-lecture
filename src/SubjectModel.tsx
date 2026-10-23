import {useEffect,useRef,useState} from 'react'
import {read,save} from './learning'
import {useLessonPlayer} from './useLessonPlayer'
import {PlayerControls} from './PlayerControls'
import type {PlayerSnapshot} from './useLessonPlayer'
// Pure computations keep provenance and multiplicity; presentation never mutates the input.
export type Row={id:string;parent:string|null}
export function joinRows(left:string[],right:Row[],kind:'INNER'|'LEFT'){
 return left.flatMap(id=>{const matches=right.filter(r=>r.parent===id);return matches.length?matches.map(r=>({left:id,right:r.id,origin:'совпадение ON'})):kind==='LEFT'?[{left:id,right:'NULL',origin:'NULL добавлен LEFT JOIN'}]:[]})
}
export function transactionSnapshot(step:number,fail:boolean){
 const rolledBack=fail&&step>=3,committed=!fail&&step>=3
 return {status:step>=1&&!rolledBack?'CLOSED':'WORK',works:step>=2&&!fail?1:0,audit:step>=1&&!rolledBack?1:0,transaction:step===0?'До операции':rolledBack?'ROLLBACK':committed?'COMMIT':'Не подтверждено'}
}
export function joinCase(id:string,scenario:string){
 const orders=id.endsWith('-joins'),outer=id.endsWith('-outer'),aggregate=id.endsWith('-aggregate'),changed=scenario==='compare'
 const left=orders?['C8','C9']:['B4','B5']
 const right=orders?[{id:'O1',parent:'C8',status:'WORK'},{id:'O2',parent:'C8',status:'WORK'}]:[{id:'R4',parent:'B4',status:'WORK'},...aggregate&&changed?[{id:'R5',parent:'B5',status:'WORK'}]:[]]
 const joined=joinRows(left,right,orders&&!changed?'INNER':'LEFT')
 const result=outer&&!changed?joined.filter(r=>right.some(source=>source.id===r.right&&source.status==='WORK')):joined
 const counts=left.map(id=>({id,all:joined.filter(r=>r.left===id).length,keys:joined.filter(r=>r.left===id&&r.right!=='NULL').length}))
 const labels=orders?['INNER JOIN: условие кейса','LEFT JOIN: сохранить C9']:outer?["WHERE r.status='WORK'","Условие r.status='WORK' в ON"]:['B5 без заявок','B5 с одной заявкой']
 const sql=orders?`SELECT c.id,o.id FROM clients c ${changed?'LEFT':'INNER'} JOIN orders o ON o.client_id=c.id;`:outer?`SELECT b.id,r.id FROM branches b\nLEFT JOIN requests r ON r.branch_id=b.id${changed?" AND r.status='WORK'":""}${changed?'':"\nWHERE r.status='WORK'"};`:'SELECT b.id,COUNT(*) AS joined_rows,COUNT(r.id) AS request_count\nFROM branches b LEFT JOIN requests r ON r.branch_id=b.id GROUP BY b.id;'
 return {left,right,result,counts,labels,sql,orders,outer,aggregate}
}
export function SubjectModel({id,revision,checked,active=true,audience=false,session=''}:{id:string;revision:string;checked:boolean;active?:boolean;audience?:boolean;session?:string}){
 const storage=`trzbd:model:${id}:${revision}`,stored=read(storage,{step:0,scenario:'base'})
 const [scenario,setScenario]=useState(stored.scenario)
 const channel=useRef<BroadcastChannel|null>(null),scenarioRef=useRef(scenario);scenarioRef.current=scenario
 const player=useLessonPlayer(storage+':player',checked?3:2,stored.step,s=>channel.current?.postMessage({type:'state',...s,scenario:scenarioRef.current}))
 const latest=useRef(player.state),receive=useRef(player.receive);latest.current=player.state;receive.current=player.receive
 useEffect(()=>{if(!session)return;const ch=new BroadcastChannel(`trzbd:subject:${session}:${id}`);channel.current=ch;ch.onmessage=e=>{if(e.data?.type==='ready'&&!audience)ch.postMessage({type:'state',...latest.current,scenario:scenarioRef.current});if(audience&&e.data?.type==='state'&&Number.isFinite(e.data.step)&&Number.isFinite(e.data.fraction)&&['base','compare','success'].includes(e.data.scenario)){setScenario(e.data.scenario);receive.current(e.data as PlayerSnapshot)}};ch.postMessage({type:'ready'});return()=>{ch.close();channel.current=null}},[session,id,audience,checked])
 const {step}=player.state
 useEffect(()=>{if(!active)player.pause()},[active,player.pause])
 useEffect(()=>{save(storage,{step,scenario})},[storage,step,scenario])
 const joins=/s07-07-control-queries-content-(joins|outer|aggregate)$/.test(id),product=id.endsWith('s08-01-views-content-joins'),tx=/s08-02-coordinated-data-changes-content-(boundary|errors|trigger|proof)$/.test(id),index=id.endsWith('s08-03-search-field-indexes-content-selectivity')
 const host=useRef<HTMLElement>(null)
 useEffect(()=>{if(audience&&step>0)host.current?.scrollIntoView({block:'start',behavior:'instant'})},[audience,step,scenario])
 if(!joins&&!product&&!tx&&!index)return null

 const change=(value:string)=>{scenarioRef.current=value;setScenario(value);player.go(0)}
 const showResult=checked&&step===3
 const join=joinCase(id,scenario)
 return <section ref={host} className="subject-model" role="region" data-local-controls aria-label="Предметная модель"><h2>{tx?'Снимки транзакции':index?'Доля совпадений':product?'Кратность двух дочерних связей':'Сопоставление исходных строк'}</h2>
 <p>Ручное исследование. Полный результат открывается после проверки решения. Шаги показывают учебный порядок рассмотрения.</p>
 {!audience&&<PlayerControls player={player} labels={{back:'Назад по модели',next:'Далее по модели'}} name="Управление предметной моделью"/>}
 {joins&&<>{!audience?<label>Операция<select value={scenario} onChange={e=>change(e.target.value)}><option value="base">{join.labels[0]}</option><option value="compare">{join.labels[1]}</option></select></label>:<p>Операция: {join.labels[scenario==='base'?0:1]}</p>}
 <div className="model-columns"><div><b>{join.orders?'clients':'branches'}</b><table><thead><tr><th>id PK</th></tr></thead><tbody>{join.left.map(x=><tr key={x}><td>{x}</td></tr>)}</tbody></table></div><div><b>{join.orders?'orders':'requests'}</b><table><thead><tr><th>id PK</th><th>{join.orders?'client_id':'branch_id'} FK</th>{join.outer&&<th>status</th>}</tr></thead><tbody>{join.right.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.parent}</td>{join.outer&&<td>{r.status}</td>}</tr>)}</tbody></table></div></div>
 {scenario!=='base'&&<p className="scenario-comparison">Изменённое условие для сравнения: {join.labels[1]}. Ответ на исходный вопрос кейса относится к варианту «{join.labels[0]}».</p>}
 {step>=1&&<p>ON сопоставляет id родителя и {join.orders?'client_id заказа: C8 даёт пары с O1 и O2.':'branch_id заявки: B4 даёт пару с R4. Для B5 отдельно проверяем наличие дочерней строки.'}</p>}
 {step>=2&&<pre className="case-sql"><code>{join.sql}</code></pre>}
 {showResult&&<><h3>Результат {join.outer?'после всех условий':join.aggregate?'соединения до подсчёта':'соединения'}</h3><table className="join-result"><thead><tr><th>Левая строка</th><th>Правая строка</th><th>Происхождение</th></tr></thead><tbody>{join.result.map((r,i)=><tr key={i}><td>{r.left}</td><td>{r.right}</td><td>{r.origin}</td></tr>)}</tbody></table>
 {join.outer&&<p>{scenario==='base'?"B5 исключён: r.status=NULL не даёт TRUE для WHERE r.status='WORK'.":"Условие статуса проверяется при подборе правой пары в ON; LEFT JOIN сохраняет B5 с добавленным NULL."}</p>}
 {join.aggregate&&<><h3>Подсчёт по филиалу</h3><table className="aggregate-result"><thead><tr><th>Филиал</th><th>COUNT(*)</th><th>COUNT(r.id)</th></tr></thead><tbody>{join.counts.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.all}</td><td>{r.keys}</td></tr>)}</tbody></table><p>{scenario==='base'?'Для B5 NULL добавлен соединением: одна результирующая строка и ноль известных r.id.':'У B5 теперь реальная заявка R5: COUNT(r.id) увеличился до 1; COUNT(*) по-прежнему равен 1.'}</p></>}
 <p>Порядок строк учебный; без ORDER BY SQL не обещает этот порядок.</p></>}</>}
 {product&&<>{showResult?<div className="product-grid">{['W1','W2'].map(w=><div key={w}><b>{w}</b>{['D1','D2','D3'].map(d=><span key={d}>{w+' × '+d}</span>)}</div>)}</div>:<div className="model-columns"><div><b>Работы заявки</b><p>W1<br/>W2</p></div><div><b>Детали заявки</b><p>D1<br/>D2<br/>D3</p></div></div>}{step>=1&&<p>Обе стороны ссылаются на одну заявку; между работой и деталью дополнительного предиката нет.</p>}{showResult&&<p>2 × 3 = 6 строк. Без DISTINCT разные пары сохраняются; суммы по одной стороне могут умножиться.</p>}</>}
 {tx&&<>{!audience?<label>Исход операции<select value={scenario} onChange={e=>change(e.target.value)}><option value="base">Отказ INSERT по FK</option><option value="success">Допустимая работа</option></select></label>:<p>Исход операции: {scenario==='base'?'отказ INSERT по FK':'допустимая работа'}</p>}{scenario==='success'&&<p className="scenario-comparison">Изменённое условие: выбранный вид работы существует и вставка допустима. Сравните с исходным отказом по FK; решение исходного кейса относится к варианту отказа.</p>}<table><thead><tr><th>Снимок</th><th>Заявка</th><th>Работы</th><th>Аудит</th></tr></thead><tbody>{[transactionSnapshot(step,scenario==='base')].map(s=><tr key={s.transaction}><td>{s.transaction}</td><td>{s.status}</td><td>{s.works}</td><td>{s.audit}</td></tr>)}</tbody></table><p>{step===0?'Начальное состояние: WORK, работ и записей аудита этой операции нет.':step===1?'Успешный UPDATE изменяет статус и вызывает триггер в той же транзакции.':'Вставка работы проверяет ссылку. Ошибка оператора сама не заменяет обработчик отката всей операции.'}</p>{showResult&&<div className="model-result">{(()=>{const s=transactionSnapshot(3,scenario==='base');return <p>{s.transaction}: статус {s.status}, работ {s.works}, аудит {s.audit}. {scenario==='base'?'EXIT HANDLER выполняет ROLLBACK и RESIGNAL.':'Оба действия подтверждены вместе.'}</p>})()}</div>}</>}
 {index&&<><div className="selectivity-bar" aria-label="18000 совпадений из 24000 строк"><span style={{width:'75%'}}>18000</span><span>6000</span></div><p>Всего 24000 строк. Условию соответствуют 18000, остальным — 6000.</p>{step>=1&&<p>Здесь используем именно долю совпадений: matched / total. Другие определения термина требуют явного указания формулы.</p>}{showResult&&<p>18000 / 24000 = 0,75 = 75%. По этой доле нельзя вычислить время выполнения запроса.</p>}</>}
 </section>
}
