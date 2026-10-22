import type {Lecture,Learning,Key,Answer} from './learning'
import {read,grade} from './learning'
export function QuestionResults({lecture,learning,bank,prefix,go}:{lecture:Lecture;learning:Learning;bank:Record<string,Key>;prefix:string;go:(n:number)=>void}){
 const get=(id:string)=>read<{checked:boolean;answer:Answer}>(prefix+':answers:'+id,{checked:false,answer:''})
 const first=lecture.slides.find(s=>s.task&&!get(s.task.id).checked)
 return <div><button className="primary" disabled={!first} onClick={()=>{if(first)go(lecture.slides.indexOf(first))}}>К первому непроверенному</button>{learning.questions.filter(q=>q.case.lectureId===lecture.id).map(q=>{
  const slides=lecture.slides.filter(s=>q.slideIds.includes(s.id)&&s.task),checked=slides.filter(s=>get(s.task!.id).checked),correct=checked.filter(s=>bank[s.task!.id]&&grade(bank[s.task!.id],get(s.task!.id).answer))
  return <details key={q.id}><summary>Вопрос {q.number}. {q.title} — {checked.length?`${checked.length} / ${slides.length} проверено · ${correct.length} / ${slides.length} баллов · ошибок ${checked.length-correct.length}`:'Не начато'}</summary>{slides.map(s=><section key={s.id}><h3>{s.title}</h3><p>{s.task?.prompt}</p><button onClick={()=>go(lecture.slides.indexOf(s))}>К заданию</button></section>)}</details>
 })}</div>
}
