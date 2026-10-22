import {createRoot} from 'react-dom/client'
import {validateCourse} from '@olgakraven/lecture-engine'
import {LectureApp} from './LectureApp'
const root=createRoot(document.getElementById('root')!)
async function load(){
 root.render(<p role="status">Загружаем курс…</p>)
 try {
  const response=await fetch(`${import.meta.env.BASE_URL}course.json`,{signal:AbortSignal.timeout(15000)})
  if(!response.ok) throw Error(`Не удалось загрузить курс: ${response.status}`)
  const course=await response.json();validateCourse(course)
  const url=new URL(location.href),topic=url.searchParams.get('topic')
  if(topic&&!url.searchParams.has('lecture')){
   const links=await fetch(`${import.meta.env.BASE_URL}legacy-links.json`).then(r=>r.json())
   url.searchParams.delete('topic');url.searchParams.set('lecture',topic)
   url.searchParams.set('slide',links[topic]?.[url.searchParams.get('slide')||'1']||'')
   history.replaceState(null,'',url)
  }
  const requested=url.searchParams.get('slide')
  if(requested){
   const response=await fetch(`${import.meta.env.BASE_URL}slide-redirects.json`)
   if(!response.ok)throw Error('Не удалось проверить прежнюю ссылку')
   const redirects:Record<string,string>=await response.json()
   if(redirects[requested]&&redirects[requested]!==requested){url.searchParams.set('slide',redirects[requested]);history.replaceState(null,'',url)}
  }
  document.title=`${course.code} · ${course.discipline}`
  const learningResponse=await fetch(`${import.meta.env.BASE_URL}learning.json`)
  if(!learningResponse.ok)throw Error('Не удалось загрузить определения и самостоятельные случаи')
  const learning=await learningResponse.json()
  if(learning.contentVersion!==course.contentVersion)throw Error('Редакции учебных материалов не совпадают')
  root.render(<LectureApp course={course} learning={learning} base={import.meta.env.BASE_URL}/> )
 }catch(error){root.render(<main><h1>Курс не загрузился</h1><p role="alert">{String(error)}</p><button onClick={()=>void load()}>Повторить</button></main>)}
}
void load()
