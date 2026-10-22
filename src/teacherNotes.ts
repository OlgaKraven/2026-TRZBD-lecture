import type {Note} from './learning'
import {read} from './learning'
export async function mergeTeacherNotes(base:string,prefix:string,version:string,defaults:Record<string,Note>){
 const current=read<Record<string,Note>>(prefix+':private:'+version,{})
 const merged={...defaults,...current}
 const previous=read<Record<string,Note>>(prefix+':private:trzbd-2026.10.22-content-all-r4',{})
 if(!Object.keys(previous).length)return merged
 const response=await fetch(base+'notes-compatibility.json')
 if(!response.ok)throw Error('Не удалось проверить прежние заметки')
 const map=await response.json()
 if(map.previousVersion!=='trzbd-2026.10.22-content-all-r4')throw Error('Неизвестная редакция заметок')
 const hash=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))))).map(b=>b.toString(16).padStart(2,'0')).join('')
 for(const [id,note] of Object.entries(previous)){
  if(!defaults[id]||!map.fingerprints[id])continue
  const patch:Partial<Note>={}
  for(const field of ['script','preparation','notebook','questions','answer'] as const){
   if(typeof note[field]!=='string')continue
   if(await hash(note[field])!==map.fingerprints[id][field]&&(!current[id]||current[id][field]===defaults[id][field]))patch[field]=note[field]
  }
  if(Object.keys(patch).length)merged[id]={...merged[id],...patch}
 }
 return merged
}
