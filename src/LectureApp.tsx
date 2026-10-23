import {useCallback,useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowRight,List,Maximize,MousePointer2,MoreHorizontal,MonitorPlay} from 'lucide-react'
import type {Course,Lecture,Note,Profile,Learning,Slide,Key} from './learning'
import {read,save,normalize} from './learning'
import {CourseCatalog} from './CourseCatalog'
import {Activity} from './Activity'
import {Dialog,Quiz,Visual} from './Slides'
import {SlidePaper} from './SlidePaper'
import {QuestionResults} from './QuestionResults'
import {mergeTeacherNotes} from './teacherNotes'
import {teacherMarkdown} from './lib/teacherMarkdown'
import './lecture.css'
import './reference-fixes.css'
import './database-cases.css'
const blankProfile:Profile={fullName:'',position:'',department:''}
type PublicState={slideId:string;theme:'light'|'dark';profile:Profile;pointer:{x:number;y:number}|null;reveal:boolean;black:boolean;answerText?:string;caseOpen?:boolean}
export function LectureApp({course,learning,base}:{course:Course;learning:Learning;base:string}){
 const prefix=`lecture:${base}:${course.id}`,versionPrefix=prefix+':'+course.contentVersion
 const [query,setQuery]=useState(()=>new URLSearchParams(location.search)),[theme,setTheme]=useState<'light'|'dark'>(()=>read(prefix+':theme','light'))
 const [autoTheme,setAutoTheme]=useState(()=>read(prefix+':auto-theme',false))
 const [profile,setProfile]=useState<Profile>(()=>read(prefix+':profile',blankProfile)),[materials,setMaterials]=useState(()=>read(prefix+':materials',course.materialsUrl))
 const [modal,setModal]=useState(''),[explain,setExplain]=useState<Slide|null>(null),[notes,setNotes]=useState<Record<string,Note>>({}),[notesError,setNotesError]=useState(''),[bank,setBank]=useState<Record<string,Key>>({})
 const [tab,setTab]=useState('script'),[pointerOn,setPointerOn]=useState(false),[pointer,setPointer]=useState<{x:number;y:number}|null>(null),[reveal,setReveal]=useState(false),[black,setBlack]=useState(false),[audienceState,setAudienceState]=useState<PublicState|null>(null),[revision,setRevision]=useState(0),[notice,setNotice]=useState('')
 const channel=useRef<BroadcastChannel|null>(null),popup=useRef<Window|null>(null)
 const mode=query.get('mode')||'viewer',lecture=course.lectures.find(l=>l.id===query.get('lecture')),session=query.get('session')||''
 const requested=mode==='audience'&&audienceState?audienceState.slideId:query.get('slide'),index=lecture?Math.max(0,lecture.slides.findIndex(s=>s.id===requested)):0,slide=lecture?.slides[index]
 const navigate=useCallback((params:Record<string,string>)=>{const url=new URL(location.href);url.search=new URLSearchParams(params).toString();history.pushState(null,'',url);setQuery(new URLSearchParams(url.search));setModal('');setReveal(false);window.scrollTo(0,0)},[])
 const go=useCallback((n:number)=>{if(!lecture)return;const s=lecture.slides[Math.max(0,Math.min(lecture.slides.length-1,n))];const url=new URL(location.href);url.searchParams.set('slide',s.id);history.replaceState(null,'',url);setQuery(new URLSearchParams(url.search));setReveal(false);setPointer(null);save(`${versionPrefix}:${lecture.id}:progress`,s.id)},[lecture,versionPrefix])
 useEffect(()=>{const pop=()=>setQuery(new URLSearchParams(location.search));addEventListener('popstate',pop);return()=>removeEventListener('popstate',pop)},[])
 useEffect(()=>{const font=new FontFace('Raleway',`url(${base+course.font})`,{weight:'100 900'});font.load().then(f=>document.fonts.add(f)).catch(()=>{})},[course.font,base])
 useEffect(()=>{document.documentElement.dataset.theme=theme;save(prefix+':theme',theme)},[theme,prefix])
 useEffect(()=>{save(prefix+':auto-theme',autoTheme);if(!autoTheme||mode==='audience')return;const media=matchMedia('(prefers-color-scheme:dark)'),update=()=>setTheme(media.matches?'dark':'light');update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[autoTheme,mode,prefix])
 useEffect(()=>{save(prefix+':profile',profile)},[profile,prefix])
 useEffect(()=>{save(prefix+':materials',materials)},[materials,prefix])
 useEffect(()=>{if(mode!=='print'||query.get('auto')!=='1')return;let cancelled=false;Promise.all([document.fonts.ready,...Array.from(document.images).map(i=>i.decode().catch(()=>{}))]).then(()=>{if(!cancelled)window.print()});return()=>{cancelled=true}},[mode,query])
 useEffect(()=>{if(mode==='audience')return;let stopped=false;fetch(base+'assessment.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(!stopped){if(data.contentVersion!==course.contentVersion)throw Error();setBank(data.keys)}}).catch(()=>setNotice('Не удалось загрузить проверку ответов. Обновите страницу.'));return()=>{stopped=true}},[mode,course.contentVersion,base])
 useEffect(()=>{if(mode!=='presenter')return;let stopped=false;fetch(base+'teacher-notes.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(async data=>{if(stopped)return;if(data.courseId!==course.id||data.contentVersion!==course.contentVersion)throw Error('Редакции не совпадают');const key=prefix+':private:'+course.contentVersion,merged=await mergeTeacherNotes(base,prefix,course.contentVersion,data.notes);if(stopped)return;setNotes(merged);if(!save(key,merged))setNotesError('Не удалось сохранить заметки на устройстве.');}).catch(()=>setNotesError('Не удалось загрузить текст преподавателя. Обновите страницу.'));return()=>{stopped=true}},[mode,base,course.id,course.contentVersion,prefix])
 useEffect(()=>{if(!slide||mode==='audience'||mode==='print'||mode==='interactive')return;const key=(e:KeyboardEvent)=>{const t=e.target as HTMLElement;if(modal||explain||e.altKey||e.ctrlKey||e.metaKey||t.closest('input,textarea,select,[contenteditable="true"],dialog,[data-local-controls]'))return;if(e.key===' '&&t.closest('button,a'))return;const d=['ArrowRight','PageDown',' '].includes(e.key)?1:['ArrowLeft','PageUp'].includes(e.key)?-1:0;if(d||e.key==='Home'||e.key==='End'){e.preventDefault();go(e.key==='Home'?0:e.key==='End'?lecture!.slides.length-1:index+d)}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[slide,mode,modal,explain,go,index,lecture])
 // Only public presentation state crosses the channel. Teacher fields never enter this payload.
 useEffect(()=>{if(!session||!lecture||!['presenter','audience'].includes(mode))return;const name=`trzbd:show:${session}:${course.contentVersion}`,ch=new BroadcastChannel(name);channel.current=ch;
  ch.onmessage=e=>{const d=e.data;if(mode==='audience'&&d?.type==='state'&&lecture.slides.some(s=>s.id===d.state?.slideId)){setAudienceState(d.state);setTheme(d.state.theme);setProfile(d.state.profile)}if(mode==='presenter'&&d?.type==='ready'){const latest=read<PublicState|null>(name,null);if(latest)ch.postMessage({type:'state',state:latest})}};
  if(mode==='audience'){const latest=read<PublicState|null>(name,null);if(latest&&lecture.slides.some(s=>s.id===latest.slideId)){setAudienceState(latest);setTheme(latest.theme);setProfile(latest.profile)}ch.postMessage({type:'ready'})}
  return()=>{ch.close();channel.current=null}
 },[session,lecture,course.contentVersion,mode])
 useEffect(()=>{if(mode!=='presenter'||!slide||!session)return;const state:PublicState={slideId:slide.id,theme,profile,pointer: pointerOn?pointer:null,reveal,black,caseOpen:modal==='case',...reveal&&slide.task?{answerText:bank[slide.task.id]?.explanation||''}:{}};save(`trzbd:show:${session}:${course.contentVersion}`,state);channel.current?.postMessage({type:'state',state})},[mode,slide,session,theme,profile,pointer,pointerOn,reveal,black,course.contentVersion,bank,modal])
 const full=()=>{if(document.fullscreenElement)void document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>setNotice('Полный экран недоступен в этом окне.'))}
 const start=()=>{if(!lecture||!slide)return;const s=crypto.randomUUID(),url=base+'?'+new URLSearchParams({mode:'audience',lecture:lecture.id,slide:slide.id,session:s});popup.current=window.open(url,'audience-'+s);if(!popup.current){setNotice('Разрешите открытие окна аудитории в браузере и повторите запуск.');return}setBlack(false);navigate({mode:'presenter',lecture:lecture.id,slide:slide.id,session:s})}
 const stop=()=>{setBlack(true);if(slide&&session){const state={slideId:slide.id,theme,profile,pointer:null,reveal:false,black:true};save(`trzbd:show:${session}:${course.contentVersion}`,state);channel.current?.postMessage({type:'state',state})}if(lecture&&slide)navigate({lecture:lecture.id,slide:slide.id})}
 const qFor=(s:Slide)=>learning.questions.find(q=>q.id===learning.slides[s.id]?.questionId)
 const openLecture=(l:Lecture)=>{const saved=read(`${versionPrefix}:${l.id}:progress`,l.slides[0].id);navigate({lecture:l.id,slide:l.slides.some(s=>s.id===saved)?saved:l.slides[0].id})}
 const printScope=(scope:string)=>{window.open(base+'?'+new URLSearchParams({mode:'print',scope,auto:'1'}),'_blank','noopener')}
 const result=()=>setRevision(x=>x+1)
 const quiz=(s:Slide,staticView=false,print=false)=><Quiz key={s.id} slide={s} bank={bank} prefix={versionPrefix} staticView={staticView} print={print} reveal={mode==='audience'?audienceState?.reveal:reveal} revealedText={mode==='audience'?audienceState?.answerText:undefined} onResult={result} onExplain={setExplain}/>
 const paper=(s:Slide,i:number,staticView=false,print=false)=><SlidePaper course={course} lecture={lecture!} slide={s} index={i} profile={profile} question={qFor(s)} courseModel={learning.lectureModels?.[s.id]} base={base} staticView={staticView} print={print} onExpand={()=>setModal('expand')} onOpenCase={()=>setModal('case')}>{s.task&&quiz(s,staticView,print)}</SlidePaper>
 if(mode==='interactive'){const item=learning.questions.find(q=>q.id===query.get('case'))?.case;return item?<Activity key={item.id} item={item} base={base} theme={theme} onTheme={()=>{setAutoTheme(false);setTheme(theme==='light'?'dark':'light')}}/>:<main><h1>Случай не найден</h1><a href={base}>Каталог лекций</a></main>}
 if(mode==='print'){const scope=query.get('scope');return <main className="print-view">{course.lectures.filter(l=>scope==='all'||l.id===scope||'semester-'+l.semester===scope).map(l=>l.slides.map((s,i)=><section className="print-page" key={s.id}><SlidePaper course={course} lecture={l} slide={s} index={i} profile={profile} question={qFor(s)} courseModel={learning.lectureModels?.[s.id]} base={base} print>{s.task&&quiz(s,true,true)}</SlidePaper></section>))}</main>}
 if(!lecture||!slide)return <CourseCatalog course={course} base={base} profile={profile} materials={materials} theme={theme} storagePrefix={prefix} invalidLecture={query.has('lecture')} onOpenLecture={openLecture} onPrint={printScope} onProfileChange={setProfile} onMaterialsChange={setMaterials} onThemeChange={t=>{setAutoTheme(false);setTheme(t)}}/>
 const audience=mode==='audience',presenter=mode==='presenter'
 const currentNote=notes[slide.id]
 const teacherFile='lecture-'+String(course.lectures.indexOf(lecture)+1).padStart(2,'0')+'.teacher.md'
 return <main className={'lecture-app '+(presenter?'presenter':audience?'audience':'viewer')}>
 {!audience&&<header className="toolbar"><button onClick={()=>navigate({})}>Каталог</button><div className="toolbar-title"><small>{course.code.split('·')[0].trim()} · {lecture.semester} семестр</small><b>{lecture.title}</b></div><button aria-label="Содержание" title="Содержание" onClick={()=>setModal('contents')}><List/></button><button aria-label="Указка" title="Указка" aria-pressed={pointerOn} onClick={()=>setPointerOn(x=>!x)}><MousePointer2/></button><button aria-label="Во весь экран" title="Во весь экран" onClick={full}><Maximize/></button><button aria-label="Ещё" title="Ещё" onClick={()=>setModal('more')}><MoreHorizontal/></button><button className="primary" onClick={presenter&&session?stop:start}><MonitorPlay/>{presenter&&session?'Завершить показ':'Режим показа'}</button></header>}
 {notice&&!audience&&<p className="notice" role="alert">{notice}</p>}
 <div className="working-area"><section className="presentation-column"><div className="stage"><div className="slide-frame" onPointerMove={e=>{if(pointerOn&&!audience){const rect=e.currentTarget.getBoundingClientRect();setPointer({x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height})}}} onPointerLeave={()=>{if(pointerOn)setPointer(null)}}>
 {audience&&audienceState?.black?<div className="black-screen"/>:audience&&audienceState?.caseOpen&&qFor(slide)?<div className="case-stage"><Activity key={qFor(slide)!.id} item={qFor(slide)!.case} base={base} theme={theme} onTheme={()=>{}} embedded audience session={session}/></div>:paper(slide,index,audience)}
 {(audience?audienceState?.pointer:pointerOn&&pointer)&&<span className="laser" style={{left:((audience?audienceState!.pointer!:pointer!).x*100)+'%',top:((audience?audienceState!.pointer!:pointer!).y*100)+'%'}}/>}
 </div></div>{!audience&&<><div className="progress"><span style={{width:((index+1)/lecture.slides.length*100)+'%'}}/></div><div className="visual-controls-outlet" data-local-controls/><nav className="slide-nav"><button aria-label="Предыдущий слайд" disabled={index===0} onClick={()=>go(index-1)}><ArrowLeft/>Назад</button><span className="nav-counter">{index+1}/{lecture.slides.length}</span><button aria-label="Следующий слайд" disabled={index===lecture.slides.length-1} onClick={()=>go(index+1)}>Вперёд<ArrowRight/></button></nav>{presenter&&<p className="next-slide">Далее: {lecture.slides[index+1]?.title||'Конец лекции'}</p>}</>}
 </section>
 {presenter&&<aside className="teacher-panel"><div role="tablist" aria-label="Материал преподавателя">{[['script','Сценарий'],['notebook','Запишите'],['questions','Вопросы'],['answer','Ответ'],['personal','Личные заметки']].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div>
 <div role="tabpanel">{notesError&&<p role="alert">{notesError}</p>}{tab==='personal'?<PersonalNote key={slide.id} storage={prefix+':personal:'+slide.id}/>:<div className="teacher-text">{currentNote?.[tab as keyof Note]||'Для этого экрана отдельная запись не требуется.'}</div>}</div>
 {slide.task&&<button className="primary" onClick={()=>setReveal(x=>!x)}>{reveal?'Скрыть ответ у аудитории':'Показать ответ аудитории'}</button>}
 <a className="button teacher-download" href={base+'teacher-text/'+teacherFile} download={teacherFile} onClick={async event=>{
  if(import.meta.env.DEV)return
  event.preventDefault()
  try{
   const response=await fetch(base+'teacher-notes.json')
   if(!response.ok)throw Error('Download failed')
   const pack=await response.json()
   if(pack.contentVersion!==course.contentVersion)throw Error('Teacher text version mismatch')
   const blob=new Blob([teacherMarkdown(course,lecture,learning,pack.notes)],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a')
   link.href=url;link.download=teacherFile;document.body.append(link);link.click();link.remove()
   setTimeout(()=>URL.revokeObjectURL(url),1000)
  }catch{setNotice('Не удалось скачать текст преподавателя. Повторите попытку.')}
 }}>Скачать текст преподавателя</a>
 </aside>}
 </div>
 {modal==='contents'&&<Dialog title="Содержание" close={()=>setModal('')}><div className="contents-list">{lecture.slides.map((s,i)=><button key={s.id} aria-current={s.id===slide.id?'step':undefined} onClick={()=>{go(i);setModal('')}}><span className="contents-page">{i+1}.</span> {s.kind==='section'?'Вопрос '+s.title:s.title}</button>)}</div></Dialog>}
 {modal==='case'&&qFor(slide)&&<Dialog title="Разбор кейса" close={()=>setModal('')}><Activity key={qFor(slide)!.id} item={qFor(slide)!.case} base={base} theme={theme} onTheme={()=>{setAutoTheme(false);setTheme(theme==='light'?'dark':'light')}} embedded session={session} onClose={()=>setModal('')}/></Dialog>}
 {modal==='more'&&<Dialog title="Ещё" close={()=>setModal('')}><div className="menu-actions"><button onClick={()=>{setAutoTheme(false);setTheme(theme==='light'?'dark':'light')}}>{theme==='light'?'Включить тёмную тему':'Включить светлую тему'}</button><button aria-pressed={autoTheme} onClick={()=>setAutoTheme(true)}>Авто — системная тема</button><button onClick={()=>setModal('profile')}>Профиль преподавателя</button><button onClick={()=>setModal('results')}>Обзор самопроверки</button><button onClick={()=>setModal('glossary')}>Глоссарий</button><button onClick={()=>printScope(lecture.id)}>Печатный просмотр</button><button onClick={()=>{navigate({mode:'presenter',lecture:lecture.id,slide:slide.id})}}>Текст преподавателя</button></div></Dialog>}
 {modal==='profile'&&<Dialog title="Преподаватель" close={()=>setModal('')}><ProfileEditor value={profile} change={setProfile}/><button className="primary wide" onClick={()=>setModal('')}>Готово</button></Dialog>}
 {modal==='expand'&&<Dialog title={slide.title} close={()=>setModal('')}><div className="expanded-visual"><Visual slide={slide}/></div></Dialog>}
 {explain&&<Dialog title="Правильный ответ и разбор" close={()=>setExplain(null)}><p>{bank[explain.task!.id]?.explanation}</p></Dialog>}
 {modal==='results'&&<Dialog title="Обзор самопроверки" close={()=>setModal('')}><QuestionResults key={revision} lecture={lecture} learning={learning} bank={bank} prefix={versionPrefix} go={n=>{go(n);setModal('')}}/></Dialog>}
 {modal==='glossary'&&<Dialog title="Глоссарий" close={()=>setModal('')}><Glossary course={course} navigate={navigate}/></Dialog>}
 </main>
}
function PersonalNote({storage}:{storage:string}){const [text,setText]=useState(()=>read(storage,'')),[error,setError]=useState(false);return <label>Личная заметка<textarea value={text} onChange={e=>{setText(e.target.value);setError(!save(storage,e.target.value))}}/>{error&&<span role="alert">Не удалось сохранить заметку.</span>}</label>}
function ProfileEditor({value,change}:{value:Profile;change:(p:Profile)=>void}){return <>{[['fullName','ФИО'],['position','Должность'],['department','Кафедра / лаборатория']].map(([key,label])=><label key={key}>{label}<input value={value[key as keyof Profile]} onChange={e=>change({...value,[key]:e.target.value})}/></label>)}</>}
const aliases:Record<string,string>={entity:'сущность',transaction:'транзакция',index:'индекс',role:'роль','primary key':'первичный ключ','foreign key':'внешний ключ',constraint:'ограничение целостности'}
function Glossary({course,navigate}:{course:Course;navigate:(p:Record<string,string>)=>void}){const [search,setSearch]=useState('');return <><label>Найти термин<input value={search} onChange={e=>setSearch(e.target.value)}/></label>{course.glossary?.filter(g=>normalize(g.term+' '+g.definition).includes(normalize(aliases[normalize(search)]||search))).map(g=><section key={g.term}><h3>{g.term}</h3><p>{g.definition}</p>{g.slideIds.map(id=>{const l=course.lectures.find(l=>l.slides.some(s=>s.id===id))!;return <button key={id} onClick={()=>navigate({lecture:l.id,slide:id})}>{l.title} — Запишите</button>})}</section>)}</>}
