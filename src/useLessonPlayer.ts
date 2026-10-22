import {useCallback,useEffect,useRef,useState} from 'react'
import {read,save} from './learning'
export type PlayerSnapshot={step:number;fraction:number}
export function useLessonPlayer(key:string,limit:number,initial=0,onChange?:(s:PlayerSnapshot)=>void){
 const [state,setState]=useState<PlayerSnapshot>(()=>{const s=read(key,{step:initial,fraction:0});return {step:Math.min(limit,Math.max(0,Number(s.step)||0)),fraction:Math.min(.999,Math.max(0,Number(s.fraction)||0))}})
 const current=useRef(state),running=useRef(false),notify=useRef(onChange),[playing,setPlaying]=useState(false),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion:reduce)').matches)
 notify.current=onChange
 const commit=useCallback((s:PlayerSnapshot,remote=false)=>{current.current=s;setState(s);save(key,s);if(!remote)notify.current?.(s)},[key])
 const pause=useCallback(()=>{running.current=false;setPlaying(false)},[])
 const go=useCallback((step:number)=>{pause();commit({step:Math.max(0,Math.min(limit,step)),fraction:0})},[pause,commit,limit])
 const receive=useCallback((s:PlayerSnapshot)=>{pause();commit({step:Math.min(limit,Math.max(0,s.step)),fraction:Math.min(.999,Math.max(0,s.fraction))},true)},[pause,commit,limit])
 const toggle=()=>{if(running.current){pause();return}if(reduced||limit===0)return;if(current.current.step>=limit)commit({step:0,fraction:0});else commit({...current.current});running.current=true;setPlaying(true)}
 useEffect(()=>{if(state.step>limit)go(limit)},[limit,state.step,go])
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion:reduce)'),change=()=>{setReduced(media.matches);if(media.matches)pause()},visibility=()=>{if(document.hidden)pause()};media.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility)}},[pause])
 useEffect(()=>{if(!playing)return;let frame=0,last:number|undefined;const tick=(time:number)=>{
  if(!running.current)return;const delta=last===undefined?0:Math.min(80,time-last);last=time;let {step,fraction}=current.current;
  fraction+=delta/1800;if(fraction>=1){step++;fraction-=1;}if(step>=limit){step=limit;fraction=0;pause();}
  commit({step,fraction});if(running.current)frame=requestAnimationFrame(tick)
 };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[playing,limit,commit,pause])
 return {state,playing,reduced,limit,go,pause,toggle,receive}
}
export type LessonPlayer=ReturnType<typeof useLessonPlayer>
