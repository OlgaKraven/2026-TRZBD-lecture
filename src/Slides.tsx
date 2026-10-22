import {useLayoutEffect,useRef,useState} from 'react'
import type {Course,Lecture,Slide,Profile,Question,Answer,Key} from './learning'
import {complete,grade,read,save} from './learning'
export function Dialog({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null)
 useLayoutEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{previous?.focus()}},[])
 return <dialog ref={ref} onCancel={close} onClick={e=>{if(e.target===ref.current)close()}}><header><h2>{title}</h2><button aria-label="Закрыть" onClick={close}>×</button></header>{children}</dialog>
}
function QuestionTitle({text}:{text:string}){
 const ref=useRef<HTMLHeadingElement>(null),[line,setLine]=useState<number|null>(null)
 useLayoutEffect(()=>{const measure=()=>{const spans=Array.from(ref.current?.children||[]) as HTMLElement[],ys=[...new Set(spans.map(s=>Math.round(s.offsetTop)))];setLine(ys.length===2?ys[1]:null)};measure();const ro=new ResizeObserver(measure);if(ref.current)ro.observe(ref.current);document.fonts.ready.then(measure);return()=>ro.disconnect()},[text])
 return <h1 ref={ref} className="question-title">{text.replace(/^\d+\.\s*/,'').split(' ').map((w,i)=><span key={i} className={line!==null&&Math.round((ref.current?.children[i] as HTMLElement)?.offsetTop)===line?'last-line':''}>{w} </span>)}</h1>
}
export function Visual({slide}:{slide:Slide}){
 if(slide.visual?.type==='codeParts')return <div className="code-example">{slide.visual.parts.map((p,i)=><pre key={i}><code>{p.code}</code></pre>)}</div>
 if(slide.rows&&slide.columns)return <div className="table-scroll" tabIndex={0}><table><thead><tr>{slide.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{slide.rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>
 if(slide.image)return <figure><img src={slide.image.src} alt={slide.image.alt}/>{slide.image.caption&&<figcaption>{slide.image.caption}</figcaption>}</figure>
 return null
}
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
export function SlidePaper({course,lecture,slide,index,profile,question,base,staticView=false,print=false,children,onExpand}:{course:Course;lecture:Lecture;slide:Slide;index:number;profile:Profile;question?:Question;base:string;staticView?:boolean;print?:boolean;children?:React.ReactNode;onExpand?:()=>void}){
 const visual=Boolean(slide.visual||slide.image||slide.rows),passport=question?.passportId===slide.id
 const notebook=question&&slide.kind==='notebook'
 const title=slide.kind==='title',section=slide.kind==='section'
 const activityHref=base+'?'+new URLSearchParams({mode:'interactive',case:question?.id||''})
 return <article className={'paper kind-'+slide.kind+(passport?' passport':'')} data-slide-id={slide.id}><header className="paper-header"><div>{title&&<img className="wordmark" src={base+course.logo} alt="Синергия"/>}<span>{course.code} · {lecture.semester} семестр</span></div><div>{visual&&!print&&!staticView&&<button className="expand primary" onClick={onExpand}>Развернуть схему</button>}<span>Тема {String(course.lectures.indexOf(lecture)+1).padStart(2,'0')}</span>{!title&&<img className="mark" src={base+'brand/synergy-mark.png'} alt="Синергия"/>}</div></header>
 <div className="paper-content">{title?<div className="title-grid"><div><h1>{slide.title}</h1><p>{course.discipline}</p><div className="profile-lines"><small>Преподаватель</small><strong>{profile.fullName}</strong><span>{profile.position}</span><span>{profile.department}</span></div></div><img className="mascot" src={base+course.mascot.replace('-catalog','')} alt={course.mascotAlt}/></div>:section?<><span className="question-eyebrow">Вопрос {question?.number}</span><QuestionTitle text={slide.title}/><p className="section-lead">{slide.body}</p></>:passport?<><h1>{question.case.title}</h1><div className="passport-grid"><div><h2>Задача</h2><p>{question.case.data}</p><p>{question.case.question}</p></div><div><h2>Что проверить</h2><p>Зафиксируйте прогноз, сопоставьте условия, выберите решение и обоснуйте его. После проверки сравните причинное объяснение.</p></div></div><p className="scenario-line">Самостоятельный случай: {question.case.title}. Исходные условия и наблюдения доступны по шагам.</p>{!staticView&&!print?<a className="primary button" href={activityHref} target="_blank" rel="noopener">Интерактивная схема ↗</a>:print?<a href={activityHref}>Интерактивная схема</a>:null}</>:notebook?<><h1>Запишите</h1><div className="notebook-grid"><div className="definition"><b>{question.definition.term}</b><p>— {question.definition.definition}</p></div><div><h2>Правило и проверка</h2><p>{question.rule}</p></div></div></>:<><h1>{slide.title}</h1>{slide.body&&<p>{slide.body}</p>}{slide.bullets&&<ul className="body-list">{slide.bullets.map((b,i)=><li key={i}>{b}</li>)}</ul>}{slide.references?.map((r,i)=><p key={i}>{r.url?<a href={r.url} target="_blank" rel="noopener">{r.citation}</a>:r.citation}</p>)}{slide.kind==='materials'&&<a href={course.materialsUrl} target="_blank" rel="noopener">Материалы курса</a>}{visual&&<Visual slide={slide}/>} {children}</>}
 </div>{section&&<div className="chevron" aria-hidden="true"/>}<footer>{question&&<span>Вопрос {question.number}</span>}<span>{index+1} / {lecture.slides.length}</span></footer></article>
}
