import {useEffect,useRef,useState} from 'react'
import type {Case} from './learning'
import {read,save} from './learning'
import {SubjectModel} from './SubjectModel'
import {useLessonPlayer} from './useLessonPlayer'
import {PlayerControls} from './PlayerControls'
import {DatabaseCaseModel} from './DatabaseCaseModel'
type Draft={prediction:string;choice:string;why:string;conclusion:string;checked:boolean;step:number}
const blank:Draft={prediction:'',choice:'',why:'',conclusion:'',checked:false,step:0}
export function Activity({item,base,theme,onTheme,embedded=false,audience=false,session='',onClose}:{item:Case;base:string;theme:string;onTheme:()=>void;embedded?:boolean;audience?:boolean;session?:string;onClose?:()=>void}){
 const storage=`trzbd:case:${item.id}:${item.revision}`
 const [draft,setDraft]=useState(()=>({...blank,...audience?{}:read<Partial<Draft>>(storage,{})})),[explain,setExplain]=useState(false),[error,setError]=useState(''),[showAudience,setShowAudience]=useState(false),[remote,setRemote]=useState({step:0,reveal:false})
 const channel=useRef<BroadcastChannel|null>(null),latest=useRef({step:draft.step,reveal:showAudience});latest.current={step:draft.step,reveal:showAudience}
 const update=(patch:Partial<Draft>)=>{if(patch.checked===false)setShowAudience(false);setDraft(d=>({...d,...patch}))}
 useEffect(()=>{if(!audience&&!save(storage,draft))setError('Не удалось сохранить черновик на устройстве. Оставьте эту вкладку открытой.')},[draft,storage,audience])
 const player=useLessonPlayer(storage+':intro',draft.prediction.trim()?2:0,draft.step,s=>setDraft(d=>d.step===s.step?d:{...d,step:s.step}))
 const correct=Number(draft.choice)===item.correct
 useEffect(()=>{if(!session)return;const ch=new BroadcastChannel(`trzbd:case-show:${session}:${item.id}`);channel.current=ch;ch.onmessage=e=>{if(e.data?.type==='ready'&&!audience)ch.postMessage({type:'state',...latest.current});if(audience&&e.data?.type==='state')setRemote({step:Math.max(0,Math.min(2,Number(e.data.step)||0)),reveal:e.data.reveal===true})};ch.postMessage({type:'ready'});return()=>{ch.close();channel.current=null}},[session,item.id,audience])
 useEffect(()=>{if(!audience)channel.current?.postMessage({type:'state',step:draft.step,reveal:showAudience})},[draft.step,showAudience,audience])
 const href=base+'?'+new URLSearchParams({lecture:item.lectureId,slide:item.passportId})
 if(audience)return <div className="activity case-projection" data-local-controls><p className="slide-eyebrow">РАЗБОР КЕЙСА</p><h1>{item.title}</h1><section><h2>Условие</h2><p>{item.data}</p><p><b>{item.question}</b></p></section><DatabaseCaseModel model={item.model} id={item.id} revision={item.revision} checked={remote.reveal} audience session={session} active={remote.step>=1}/>{remote.step>=1&&<SubjectModel id={item.id} revision={item.revision} checked={remote.reveal} audience session={session}/>} {remote.reveal&&<section className="case-public-answer"><h2>Разбор решения</h2><p><b>{item.options[item.correct]}</b></p><p>{item.reason}</p></section>}</div>
 return <main className={'activity'+(embedded?' embedded-case':'')} data-local-controls><header>{embedded?<button onClick={onClose}>← К слайдам</button>:<a href={href}>← Вернуться к паспорту</a>}<button onClick={onTheme}>{theme==='light'?'Тёмная тема':'Светлая тема'}</button></header><h1>{item.title}</h1>
 <section className="activity-data"><h2>Исходные условия</h2><p>{item.data}</p><p><strong>{item.question}</strong></p></section>
 <DatabaseCaseModel model={item.model} id={item.id} revision={item.revision} checked={draft.checked} session={session} active={draft.step>=1}/>
 <label>Мой прогноз<textarea aria-label="Мой прогноз" value={draft.prediction} onChange={e=>update({prediction:e.target.value})} placeholder="Предскажите результат до исследования"/></label>
 <section className="investigation" aria-label="Пошаговое исследование"><PlayerControls player={player}/>
 <div className="inspection-map"><div className={draft.step===0?'focus':''}><b>Дано</b><p>{item.data}</p></div><span aria-hidden="true">→</span><div className={draft.step===1?'focus':''}><b>Сопоставление</b><p>{draft.step>=1?item.inspect:'Сначала зафиксируйте прогноз, затем перейдите к сопоставлению условий.'}</p></div><span aria-hidden="true">→</span><div className={draft.step===2?'focus':''}><b>Проверяемое решение</b><p>{draft.step===2?item.question:'Какая операция и какое свидетельство нужны для вывода?'}</p></div></div></section>
 <div hidden={draft.step<1}><SubjectModel id={item.id} revision={item.revision} checked={draft.checked} active={draft.step>=1} session={session}/></div>
 {draft.step===2&&<section><h2>Выберите решение</h2><fieldset><legend>{item.question}</legend>{item.options.map((o,i)=><label className="choice" key={o}><input type="radio" name={item.id} checked={draft.choice===String(i)} onChange={()=>{update({choice:String(i),checked:false});setExplain(false)}}/>{o}</label>)}</fieldset><label>Моё обоснование<textarea aria-label="Моё обоснование" value={draft.why} onChange={e=>update({why:e.target.value,checked:false})}/></label><button className="primary" disabled={draft.choice===''||!draft.why.trim()} onClick={()=>update({checked:true})}>Проверить решение</button>
 {draft.checked&&<div role="status" className="case-feedback"><b>{correct?'Выбор верен':'Пересмотрите выбор'}</b><p>{correct?item.reason:`Вариант «${item.options[Number(draft.choice)]}» не обеспечивает требуемый вывод. ${item.reason}`}</p><p>Обоснование остаётся для обсуждения с преподавателем: автоматическая проверка относится только к выбранному варианту.</p><button onClick={()=>setExplain(e=>!e)}>{explain?'Скрыть разбор':'Сравнить с разбором'}</button>{session&&<button className="primary" onClick={()=>setShowAudience(s=>!s)}>{showAudience?'Скрыть разбор у аудитории':'Показать разбор аудитории'}</button>}{explain&&<div><strong>{item.options[item.correct]}</strong><p>{item.reason}</p></div>}</div>}
 <label>Уточнённый вывод<textarea aria-label="Уточнённый вывод" value={draft.conclusion} onChange={e=>update({conclusion:e.target.value})}/></label></section>}
 {error&&<p role="alert">{error}</p>}</main>
}
