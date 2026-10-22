import {useEffect,useId,useRef} from 'react'
import type {CaseModel} from './learning'
import {useLessonPlayer} from './useLessonPlayer'
import type {PlayerSnapshot} from './useLessonPlayer'
import {PlayerControls} from './PlayerControls'
export function DatabaseDiagram({model,compact=false,focus=-1,fraction=0,reveal=false}:{model:CaseModel;compact?:boolean;focus?:number;fraction?:number;reveal?:boolean}){
 const n=model.tables.length,w=n*310,h=compact?175:240,marker=useId().replaceAll(':','')
 return <div className={'database-diagram'+(compact?' compact':'')} aria-label="Схема данных кейса">
 {n>1&&<svg className="database-links" viewBox={`0 0 ${w} 72`} role="img" aria-label={model.links.map(l=>l.label).join('; ')}><defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="currentColor"/></marker></defs>{model.links.map((l,i)=>{const x=l.from*310+155,y=l.to*310+155,curve=20+(i%3)*19;return <g key={i}><path className={focus>=1?'active-link':''} d={`M${x},69 C${x},${69-curve} ${y},${69-curve} ${y},69`} markerEnd={`url(#${marker})`} pathLength="1" style={{strokeDasharray:focus===1?'0.08 0.04':undefined,strokeDashoffset:focus===1?-fraction*.4:0}}/></g>})}</svg>}
 <div className="database-tables" style={{gridTemplateColumns:`repeat(${n},minmax(0,1fr))`}}>{model.tables.map((t,i)=><article key={i} className={'database-table'+(focus===0?' db-focus':'')}><h3>{t.name}</h3><ul>{t.columns.map(c=><li key={c} className={/PK|FK|UNIQUE/.test(c)?'key-field':''}><code>{c}</code></li>)}</ul>{!compact&&<div className="db-table-scroll" tabIndex={0} style={{maxHeight:h}}>{t.result&&!reveal?<p className="result-locked">Строки результата сопоставим после попытки.</p>:t.rows.length?<table><thead><tr>{t.columns.map(c=><th key={c}>{c.split(' ')[0]}</th>)}</tr></thead><tbody>{t.rows.map((r,ri)=><tr key={ri} className={focus===1&&ri===Math.min(t.rows.length-1,Math.floor(fraction*t.rows.length))?'db-row-focus':''}>{r.map((v,j)=><td key={j}>{v===''?'∅ (пустой текст)':v==='NULL'?<em>NULL</em>:v}</td>)}</tr>)}</tbody></table>:<p className="empty-table">Исходных строк нет.</p>}</div>}</article>)}</div>
 <ol className="database-relations">{model.links.map((l,i)=><li key={i}>{l.label}</li>)}</ol>
 </div>
}
export function DatabaseCaseModel({model,id,revision,checked,audience=false,session='',active=true}:{model:CaseModel;id:string;revision:string;checked:boolean;audience?:boolean;session?:string;active?:boolean}){
 const channel=useRef<BroadcastChannel|null>(null),host=useRef<HTMLElement>(null)
 const player=useLessonPlayer(`trzbd:database:${id}:${revision}`,active?(checked?3:2):0,0,s=>channel.current?.postMessage({type:'state',...s}))
 const latest=useRef(player.state),receive=useRef(player.receive);latest.current=player.state;receive.current=player.receive
 useEffect(()=>{if(!active)player.pause()},[active,player.pause])
 useEffect(()=>{if(!session)return;const ch=new BroadcastChannel(`trzbd:database:${session}:${id}`);channel.current=ch;ch.onmessage=e=>{if(e.data?.type==='ready'&&!audience)ch.postMessage({type:'state',...latest.current});if(audience&&e.data?.type==='state'&&Number.isFinite(e.data.step)&&Number.isFinite(e.data.fraction))receive.current(e.data as PlayerSnapshot)};ch.postMessage({type:'ready'});return()=>{ch.close();channel.current=null}},[session,id,audience,checked,active])
 const step=player.state.step
 useEffect(()=>{if(audience&&step>0)host.current?.scrollIntoView({block:'start',behavior:'instant'})},[audience,step])
 return <section ref={host} className="database-case-model" data-local-controls aria-label="Схема и данные кейса"><h2>Таблицы, связи и операция</h2>
 {!audience&&<PlayerControls player={player} labels={{back:'Назад по данным',next:'Далее по данным'}} name="Разбор данных кейса"/>}
 <DatabaseDiagram model={model} focus={step===0?0:step<=2?1:2} fraction={player.state.fraction} reveal={checked&&step===3}/>
 <div className="database-step" role="status"><b>{['1. Исходные данные','2. Операция и условие','3. Проверка результата','4. Вывод по данным'][step]}</b><p>{step===2?'По указанной операции определите, какие строки, свойства или состояния подтверждают ваш вывод. Сопоставьте его с прогнозом и обоснуйте решение.':step===3?model.trace[2]:model.trace[step]}</p></div>
 {step>=1&&<pre className="case-sql"><code>{model.sql}</code></pre>}
 {checked&&step===3&&<div className="model-result"><h3>Наблюдаемый результат</h3><p>{model.trace[2]}</p></div>}
 </section>
}
