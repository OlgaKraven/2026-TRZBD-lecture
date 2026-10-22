import {useEffect,useState} from 'react'
import type {Case} from './learning'
import {read,save} from './learning'
import {SubjectModel} from './SubjectModel'
type Draft={prediction:string;choice:string;why:string;conclusion:string;checked:boolean;step:number}
const blank:Draft={prediction:'',choice:'',why:'',conclusion:'',checked:false,step:0}
export function Activity({item,base,theme,onTheme}:{item:Case;base:string;theme:string;onTheme:()=>void}){
 const storage=`trzbd:case:${item.id}:${item.revision}`
 const [draft,setDraft]=useState(()=>({...blank,...read<Partial<Draft>>(storage,{})})),[explain,setExplain]=useState(false),[error,setError]=useState('')
 const update=(patch:Partial<Draft>)=>setDraft(d=>({...d,...patch}))
 useEffect(()=>{if(!save(storage,draft))setError('Не удалось сохранить черновик на устройстве. Оставьте эту вкладку открытой.')},[draft,storage])
 const correct=Number(draft.choice)===item.correct
 const href=base+'?'+new URLSearchParams({lecture:item.lectureId,slide:item.passportId})
 return <main className="activity" data-local-controls><header><a href={href}>← Вернуться к паспорту</a><button onClick={onTheme}>{theme==='light'?'Тёмная тема':'Светлая тема'}</button></header><h1>{item.title}</h1>
 <section className="activity-data"><h2>Исходные условия</h2><p>{item.data}</p><p><strong>{item.question}</strong></p></section>
 <label>Мой прогноз<textarea aria-label="Мой прогноз" value={draft.prediction} onChange={e=>update({prediction:e.target.value})} placeholder="Предскажите результат до исследования"/></label>
 <section className="investigation" aria-label="Пошаговое исследование"><nav><button disabled={draft.step===0} onClick={()=>update({step:draft.step-1})}>Назад</button><span aria-live="polite">Шаг {draft.step} / 2</span><button disabled={draft.step===2||!draft.prediction.trim()} onClick={()=>update({step:draft.step+1})}>Далее</button></nav>
 <div className="inspection-map"><div className={draft.step===0?'focus':''}><b>Дано</b><p>{item.data}</p></div><span aria-hidden="true">→</span><div className={draft.step===1?'focus':''}><b>Сопоставление</b><p>{draft.step>=1?item.inspect:'Сначала зафиксируйте прогноз, затем перейдите к сопоставлению условий.'}</p></div><span aria-hidden="true">→</span><div className={draft.step===2?'focus':''}><b>Проверяемое решение</b><p>{draft.step===2?item.question:'Какая операция и какое свидетельство нужны для вывода?'}</p></div></div></section>
 <div hidden={draft.step<1}><SubjectModel id={item.id} revision={item.revision} checked={draft.checked}/></div>
 {draft.step===2&&<section><h2>Выберите решение</h2><fieldset><legend>{item.question}</legend>{item.options.map((o,i)=><label className="choice" key={o}><input type="radio" name={item.id} checked={draft.choice===String(i)} onChange={()=>{update({choice:String(i),checked:false});setExplain(false)}}/>{o}</label>)}</fieldset><label>Моё обоснование<textarea aria-label="Моё обоснование" value={draft.why} onChange={e=>update({why:e.target.value,checked:false})}/></label><button className="primary" disabled={draft.choice===''||!draft.why.trim()} onClick={()=>update({checked:true})}>Проверить решение</button>
 {draft.checked&&<div role="status" className="case-feedback"><b>{correct?'Выбор верен':'Пересмотрите выбор'}</b><p>{correct?item.reason:`Вариант «${item.options[Number(draft.choice)]}» не обеспечивает требуемый вывод. ${item.reason}`}</p><p>Обоснование остаётся для обсуждения с преподавателем: автоматическая проверка относится только к выбранному варианту.</p><button onClick={()=>setExplain(e=>!e)}>{explain?'Скрыть разбор':'Сравнить с разбором'}</button>{explain&&<div><strong>{item.options[item.correct]}</strong><p>{item.reason}</p></div>}</div>}
 <label>Уточнённый вывод<textarea aria-label="Уточнённый вывод" value={draft.conclusion} onChange={e=>update({conclusion:e.target.value})}/></label></section>}
 {error&&<p role="alert">{error}</p>}</main>
}
