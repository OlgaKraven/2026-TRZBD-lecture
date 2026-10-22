import {useLayoutEffect,useRef,useState} from 'react'
import type {Course,Lecture,Slide,Profile,Question,CaseModel} from './learning'
import {Visual} from './Slides'
import {DatabaseDiagram} from './DatabaseCaseModel'
function QuestionTitle({text}:{text:string}){
 const ref=useRef<HTMLHeadingElement>(null),[line,setLine]=useState<number|null>(null)
 useLayoutEffect(()=>{const measure=()=>{const spans=Array.from(ref.current?.children||[]) as HTMLElement[],ys=[...new Set(spans.map(s=>Math.round(s.offsetTop)))];setLine(ys.length===2?ys[1]:null)};measure();const ro=new ResizeObserver(measure);if(ref.current)ro.observe(ref.current);document.fonts.ready.then(measure);return()=>ro.disconnect()},[text])
 return <h1 ref={ref} className="question-title">{text.replace(/^\d+\.\s*/,'').split(' ').map((w,i)=><span key={i} className={line!==null&&Math.round((ref.current?.children[i] as HTMLElement)?.offsetTop)===line?'last-line':''}>{w} </span>)}</h1>
}
function Literature({course,slide,base}:{course:Course;slide:Slide;base:string}){
 const books=[...(course.literature?.primary||[]),...(course.literature?.additional||[])]
 return <div className="reading-cards">{slide.references?.map((r,i)=>{
  const n=books.findIndex(b=>b.url===r.url)+1
  return <article className="reading-card" key={i}><img src={base+'qr/book-'+n+'.png'} alt={'QR-код источника '+n}/><div><p>{r.citation}</p>{r.url&&<a href={r.url} target="_blank" rel="noopener">Открыть источник ↗</a>}</div></article>
 })}</div>
}
export function SlidePaper({course,lecture,slide,index,profile,question,base,staticView=false,print=false,children,onExpand,onOpenCase,courseModel}:{course:Course;lecture:Lecture;slide:Slide;index:number;profile:Profile;question?:Question;base:string;staticView?:boolean;print?:boolean;children?:React.ReactNode;onExpand?:()=>void;onOpenCase?:()=>void;courseModel?:CaseModel}){
 const visual=Boolean(slide.visual||slide.image||slide.rows),passport=question?.passportId===slide.id
 const notebook=question&&slide.kind==='notebook',title=slide.kind==='title',section=slide.kind==='section'
 const activityHref=base+'?'+new URLSearchParams({mode:'interactive',case:question?.id||''})
 const eyebrow=title?'ЛЕКЦИЯ':slide.kind==='literature'?'ЛИТЕРАТУРА':slide.kind==='materials'?'МАТЕРИАЛЫ К ЗАНЯТИЯМ':slide.kind==='agenda'?'КАРТА ТЕМЫ':passport?'РАЗБОР КЕЙСА · ВОПРОС '+question.number:''
 const content=title?<div className="title-grid"><div><span className="slide-eyebrow">{eyebrow}</span><h1>{slide.title}</h1><p>{course.discipline}</p><div className="profile-lines"><small>Преподаватель</small><strong>{profile.fullName}</strong><span>{profile.position}</span><span>{profile.department}</span></div></div><img className="mascot" src={base+course.mascot.replace('-catalog','')} alt={course.mascotAlt}/></div>
 :section?<><span className="question-eyebrow">Вопрос {question?.number}</span><QuestionTitle text={slide.title}/><p className="section-lead">{slide.body}</p></>
 :passport?<><span className="slide-eyebrow">{eyebrow}</span><h1>{question.case.title}</h1><div className="passport-condition"><p>{question.case.data}</p><p><b>{question.case.question}</b></p></div><DatabaseDiagram model={question.case.model} compact/>{!staticView&&!print?<button className="primary case-open" onClick={onOpenCase}>Разбор кейса ↗</button>:print?<a href={activityHref}>Разбор кейса</a>:null}</>
 :notebook?<><h1>Запишите</h1><div className="notebook-grid"><div className="definition"><span className="definition-number">{String(question.number).padStart(2,'0')}</span><b>{question.definition.term}</b><p>— {question.definition.definition}</p></div><div><h2>Правило и проверка</h2><p>{question.rule}</p></div></div></>
 :<>{eyebrow&&<span className="slide-eyebrow">{eyebrow}</span>}<h1>{slide.kind==='materials'?'Материалы к занятиям':slide.title}</h1>
 {slide.kind==='literature'?<Literature course={course} slide={slide} base={base}/>
 :slide.kind==='materials'?<div className="materials-card"><img src={base+'qr/trzbd-materials.png'} alt="QR-код для открытия материалов"/><div><h2>Ссылка на материалы</h2><a href={course.materialsUrl} target="_blank" rel="noopener">{course.materialsUrl} ↗</a><p>Отсканируйте QR-код или откройте ссылку.</p></div></div>
 :slide.kind==='agenda'?<ol className="topic-map">{slide.steps?.map(s=><li key={s.title}><span>{s.title}</span><b>{s.text}</b></li>)}</ol>
 :courseModel?<><p className="course-map-meaning">{slide.body}</p><DatabaseDiagram model={courseModel} compact/><p className="schema-key">PK — первичный ключ · FK — внешний ключ · UNIQUE — уникальность</p></>
 :<>{slide.body&&<p>{slide.body}</p>}{slide.bullets&&<ul className="body-list">{slide.bullets.map((b,i)=><li key={i}>{b}</li>)}</ul>}{visual&&<Visual slide={slide} print={print}/>} {children}</>}
 </>
 return <article className={'paper kind-'+slide.kind+(passport?' passport':'')} data-slide-id={slide.id}>
 <header className="paper-header"><div>{title&&<img className="wordmark" src={base+course.logo} alt="Университет Синергия — образование для карьеры"/>}<span>{course.code.split('·')[0].trim()} · {lecture.semester} семестр</span></div><div>{visual&&!print&&!staticView&&<button className="expand primary" onClick={onExpand}>Развернуть схему</button>}<span>Тема {String(course.lectures.indexOf(lecture)+1).padStart(2,'0')}</span>{!title&&<img className="mark" src={base+'brand/synergy-mark.png'} alt="Синергия"/>}</div></header>
 <div className="paper-content">{content}</div>{section&&<div className="chevron" aria-hidden="true"/>}<footer>{question&&<span>Вопрос {question.number}</span>}<span>{String(index+1).padStart(2,'0')}</span></footer></article>
}
