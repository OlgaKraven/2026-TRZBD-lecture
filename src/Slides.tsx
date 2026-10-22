import {useId,useLayoutEffect,useRef,useState} from 'react'
import type {Slide,Answer,Key} from './learning'
import {complete,grade,read,save} from './learning'
import {TeachingVisual} from './TeachingVisual'
export function Dialog({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId()
 useLayoutEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{previous?.focus()}},[])
 return <dialog ref={ref} aria-labelledby={titleId} onCancel={close} onClick={e=>{if(e.target===ref.current)close()}}><header><h2 id={titleId}>{title}</h2><button aria-label="Закрыть" onClick={close}>×</button></header>{children}</dialog>
}
export function Visual({slide,print=false}:{slide:Slide;print?:boolean}){return <TeachingVisual key={slide.id} slide={slide} print={print}/>}
export function Quiz({slide,bank,prefix,print=false,staticView=false,reveal=false,revealedText='',onResult,onExplain}:{slide:Slide;bank:Record<string,Key>;prefix:string;print?:boolean;staticView?:boolean;reveal?:boolean;revealedText?:string;onResult:()=>void;onExplain:(s:Slide)=>void}){
 const t=slide.task!,key=bank[t.id],storage=prefix+':answers:'+t.id
 const [draft,setDraft]=useState(()=>read<{answer:Answer;checked:boolean}>(storage,{answer:t.type==='multiple'?[]:t.type==='matching'?{}:'',checked:false}))
 const [mobile]=useState(()=>matchMedia('(max-width:600px)').matches)
 const change=(answer:Answer)=>{const d={answer,checked:false};setDraft(d);save(storage,d)}
 const checked=draft.checked&&key,correct=checked&&grade(key,draft.answer)
 const submit=()=>{if(!complete(slide,draft.answer))return;const d={...draft,checked:true};setDraft(d);save(storage,d);onResult()}
 if(print||staticView)return <div className="static-task"><p>{t.prompt}</p>{t.options&&<ol>{t.options.map(o=><li key={o.id}>{o.text}</li>)}</ol>}{t.items&&<ul>{t.items.map(o=><li key={o.id}>{o.text}</li>)}</ul>}{reveal&&(key||revealedText)&&<aside><b>Разбор</b><p>{revealedText||key?.explanation}</p></aside>}</div>
 return <section className="assessment" data-local-controls><p>{t.prompt}</p><fieldset><legend className="sr-only">Ваш ответ</legend>{t.options&&t.type!=='matching'&&t.options.map(o=><label className="choice" key={o.id}><input type={t.type==='multiple'?'checkbox':'radio'} name={t.id} checked={Array.isArray(draft.answer)?draft.answer.includes(o.id):draft.answer===o.id} onChange={()=>change(t.type==='multiple'?[...(Array.isArray(draft.answer)?draft.answer.filter(x=>x!==o.id):[]),...(Array.isArray(draft.answer)&&draft.answer.includes(o.id)?[]:[o.id])]:o.id)}/>{o.text}</label>)}
 {t.type==='short'&&<label>Ваш ответ<input className="short-answer" aria-label="Краткий ответ" value={String(draft.answer)} onChange={e=>change(e.target.value)}/></label>}
 {t.type==='matching'&&t.items?.map(item=><label className="matching" key={item.id}>{item.text}<select aria-label={'Соответствие: '+item.text} value={typeof draft.answer==='object'&&!Array.isArray(draft.answer)?draft.answer[item.id]||'':''} onChange={e=>change({...typeof draft.answer==='object'&&!Array.isArray(draft.answer)?draft.answer:{},[item.id]:e.target.value})}><option value="">Выберите…</option>{t.options?.map(o=><option key={o.id} value={o.id}>{o.text}</option>)}</select></label>)}
 </fieldset><button className="primary" onClick={submit}>Проверить</button>{checked&&<p className="task-status" role="status">{mobile?'Ответ сохранён':correct?'Правильно · 1 / 1':'Нужна доработка · 0 / 1'}</p>}{checked&&<button onClick={()=>onExplain(slide)}>{mobile?'Пояснение к случаю':'Разбор ответа'}</button>}</section>
}
