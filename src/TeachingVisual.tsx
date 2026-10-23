import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import type {Slide} from './learning'
import {useLessonPlayer} from './useLessonPlayer'
import type {PlayerSnapshot} from './useLessonPlayer'
import {PlayerControls} from './PlayerControls'
export function TeachingVisual({slide,print=false}:{slide:Slide;print?:boolean}){
 const query=new URLSearchParams(location.search),audience=query.get('mode')==='audience',session=query.get('session'),channel=useRef<BroadcastChannel|null>(null)
 const host=useRef<HTMLDivElement>(null),[outlet,setOutlet]=useState<HTMLElement|null>(null)
 useEffect(()=>{setOutlet(print||audience||host.current?.closest('dialog')?null:document.querySelector('.visual-controls-outlet'))},[print,audience,slide.id])
 const parts=slide.visual?.type==='codeParts'?slide.visual.parts:null,lines=parts?.flatMap(p=>p.code.split('\n'))
 const codeFrames=lines?.flatMap((line,i)=>line.trim()?[i]:[])
 const limit=codeFrames?.length||slide.rows?.length||(slide.image?3:0)
 const player=useLessonPlayer('trzbd:visual:'+slide.id,limit,0,s=>channel.current?.postMessage({type:'state',...s}))
 useEffect(()=>{player.pause()},[session,player.pause])
 const latest=useRef(player.state);latest.current=player.state
 const receive=useRef(player.receive);receive.current=player.receive
 useEffect(()=>{if(!session||print)return;const ch=new BroadcastChannel('trzbd:visual:'+session+':'+slide.id);channel.current=ch;ch.onmessage=e=>{if(e.data?.type==='ready'&&!audience)ch.postMessage({type:'state',...latest.current});if(e.data?.type==='state'&&Number.isFinite(e.data.step)&&Number.isFinite(e.data.fraction))receive.current(e.data as PlayerSnapshot)};ch.postMessage({type:'ready'});return()=>{ch.close();channel.current=null}},[session,slide.id,audience,print])
 const focus=print?0:player.state.step
 const caption=slide.visual?.caption
 const view=lines?<div className="code-example"><pre><code>{lines.map((line,i)=><span key={i} className={'code-line '+(focus>0&&codeFrames?.[focus-1]===i?'model-focus':'')}>{line||' '}{i<lines.length-1?'\n':''}</span>)}</code></pre>{caption&&caption!==slide.title&&!/^(Проследите исходные|Последовательность чтения)/.test(caption)&&<p className="visual-caption">{caption}</p>}</div>
 :slide.rows&&slide.columns?<div className="table-scroll" tabIndex={0}><table><thead><tr>{slide.columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>{slide.rows.map((r,i)=><tr className={focus===i+1?'model-focus':''} key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>
 :slide.image?<figure className={'er-focus er-step-'+focus}><img src={slide.image.src} alt={slide.image.alt}/>{slide.image.caption&&<figcaption>{slide.image.caption}</figcaption>}{!print&&<div className="er-reading-key">{['Таблицы и атрибуты','Первичные и внешние ключи','Концы связей и кратность'].map((s,i)=><span className={focus===i+1?'model-focus':''} key={s}>{i+1}. {s}</span>)}</div>}</figure>:null
 const controls=!print&&!audience&&limit>0?<PlayerControls player={player} name="Пошаговая схема"/>:null
 return <div ref={host} className="teaching-visual" data-local-controls>{view}{outlet?createPortal(controls,outlet):controls}</div>
}
