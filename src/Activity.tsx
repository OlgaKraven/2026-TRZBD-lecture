import type {Case} from './learning'
import {PracticalWorkbench} from './PracticalWorkbench'
export function Activity({item,base,theme,onTheme,embedded=false,audience=false,session='',onClose}:{item:Case;base:string;theme:string;onTheme:()=>void;embedded?:boolean;audience?:boolean;session?:string;onClose?:()=>void}){
 const href=base+'?'+new URLSearchParams({lecture:item.lectureId,slide:item.passportId})
 return <main className={'activity practical-activity'+(embedded?' embedded-case':'')+(audience?' case-projection':'')} data-local-controls>
 {!audience&&<header>{embedded?<button onClick={onClose}>← К слайдам</button>:<a href={href}>← Вернуться к лекции</a>}<button onClick={onTheme}>{theme==='light'?'Тёмная тема':'Светлая тема'}</button></header>}
 <p className="practical-eyebrow">РАЗБОР КЕЙСА</p><h1>{item.title}</h1>
 <section className="activity-data"><h2>Задача и исходные условия</h2><p>{item.data}</p><p><strong>{item.question}</strong></p><p className="case-dataset-note">Здесь дан отдельный учебный набор. Используйте показанные имена, ключи и строки; внутренние id общего стенда к нему не переносятся.</p></section>
 <PracticalWorkbench item={item} audience={audience} session={session}/>
 </main>
}
