import {createRoot} from 'react-dom/client'
import {LectureSite,validateCourse} from '@olgakraven/lecture-engine'
import '@olgakraven/lecture-engine/style.css'
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
  document.title=`${course.code} · ${course.discipline}`
  root.render(<LectureSite course={course} base={import.meta.env.BASE_URL} bundledTeacherNotes="teacher-notes.json"/> )
 }catch(error){root.render(<main><h1>Курс не загрузился</h1><p role="alert">{String(error)}</p><button onClick={()=>void load()}>Повторить</button></main>)}
}
void load()
