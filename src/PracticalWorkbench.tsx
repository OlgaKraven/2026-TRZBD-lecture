import {useEffect,useRef,useState} from 'react'
import type {Case} from './learning'
import {read,save} from './learning'
import {useLessonPlayer} from './useLessonPlayer'
import {PlayerControls} from './PlayerControls'
import {DatabaseDiagram} from './DatabaseCaseModel'
export function PracticalWorkbench({item,audience=false,session=''}:{item:Case;audience?:boolean;session?:string}){
 const key=`trzbd:practical:${item.id}:${item.revision}`,variants=item.practical.variants
 const [variant,setVariant]=useState(()=>audience?'base':read(key+':variant','base'))
 const selected=variants.find(v=>v.id===variant)||variants[0],stages=selected.stages
 const channel=useRef<BroadcastChannel|null>(null),variantRef=useRef(selected.id);variantRef.current=selected.id
 const player=useLessonPlayer(key+':player',stages.length-1,0,s=>channel.current?.postMessage({type:'state',...s,variant:variantRef.current}))
 const latest=useRef(player.state),receive=useRef(player.receive);latest.current=player.state;receive.current=player.receive
 useEffect(()=>{if(!session)return;const ch=new BroadcastChannel(`trzbd:practical:${session}:${item.id}`);channel.current=ch;ch.onmessage=e=>{const d=e.data;if(d?.type==='ready'&&!audience)ch.postMessage({type:'state',...latest.current,variant:variantRef.current});if(audience&&d?.type==='state'&&variants.some(v=>v.id===d.variant)&&Number.isFinite(d.step)&&Number.isFinite(d.fraction)){setVariant(d.variant);receive.current(d)}};ch.postMessage({type:'ready'});return()=>{ch.close();channel.current=null}},[session,item.id,audience,variants,selected.id])
 const change=(id:string)=>{variantRef.current=id;setVariant(id);save(key+':variant',id);player.go(0)}
 const stage=stages[Math.min(player.state.step,stages.length-1)],next=stages[player.state.step+1]
 const stageRef=useRef<HTMLDivElement>(null)
 useEffect(()=>{if(audience&&player.state.step>0)stageRef.current?.scrollIntoView({block:'start',behavior:'instant'})},[audience,player.state.step,selected.id])
 return <section className="practical-workbench" aria-label="Практическое решение" data-local-controls>
 <header className="workbench-heading"><h2>Действия с данными и результат</h2>{variants.length>1&&(!audience?<label>Условия разбора<select value={selected.id} onChange={e=>change(e.target.value)}>{variants.map(v=><option value={v.id} key={v.id}>{v.label}</option>)}</select></label>:<p>{selected.label}</p>)}</header>
 {!audience&&<><PlayerControls player={player} name="Действия разбора" labels={{back:'Отменить шаг',next:next?.action||'Решение получено'}}/><ol className="action-sequence">{stages.map((s,i)=><li key={i}><button aria-current={i===player.state.step?'step':undefined} onClick={()=>player.go(i)}>{i}. {s.action}</button></li>)}</ol></>}
 <div ref={stageRef} className="practical-stage" data-step={player.state.step}><h3>{stage.title}</h3><p>{stage.explanation}</p>{player.playing&&next&&<p className="operation-pending">Выполняем шаг: {next.action}</p>}</div>
 <DatabaseDiagram model={{...item.model,tables:stage.tables,links:stage.links||item.model.links}} reveal focus={-1}/>
 <div className="operation-workspace"><section className="operation-code"><h3>{stage.sql?(stage.sqlRole==='action'?'SQL действия':'Запрос для исследования'):'Перед первой операцией'}</h3>{stage.sql?<pre><code>{stage.sql}</code></pre>:<p>Сначала проследите поля, ключи и строки исходного набора. Затем выполните действие кнопкой шага или включите последовательный показ.</p>}</section>
 <section className="operation-result" aria-live="polite" aria-label="Результат действия"><h3>{stage.result?.name||'Результат ещё не получен'}</h3>{stage.result?<div className="practical-result-scroll" tabIndex={0}><table key={selected.id+':'+player.state.step}><thead><tr>{stage.result.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{stage.result.rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v==='NULL'?<em>NULL</em>:v===''?'∅ (пустой текст)':v}</td>)}</tr>)}</tbody></table>{stage.result.rows.length===0&&<p className="empty-result">0 строк. {item.model.trace[2]}</p>}</div>:<p>После действия здесь появятся вычисленные строки, изменённые ограничения или конкретная запись результата проверки.</p>}</section></div>
 {player.state.step===stages.length-1&&<section className="practical-conclusion"><h3>Основание решения</h3><p>{item.reason}</p></section>}
 </section>
}
