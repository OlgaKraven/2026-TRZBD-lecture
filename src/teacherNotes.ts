import type {Note} from './learning'
import {read} from './learning'
export async function mergeTeacherNotes(base:string,prefix:string,version:string,defaults:Record<string,Note>){
 const current=read<Record<string,Note>>(prefix+':private:'+version,{})
 const merged={...defaults,...current}
 const response=await fetch(base+'notes-compatibility.json')
 if(!response.ok)throw Error('Не удалось проверить прежние заметки')
 const map=await response.json()
 if(map.courseId!=='trzbd'||!Array.isArray(map.versions))throw Error('Неизвестная карта заметок')
 const hash=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))))).map(b=>b.toString(16).padStart(2,'0')).join('')
 for(const baseline of map.versions){
 const previous=read<Record<string,Note>>(prefix+':private:'+baseline.previousVersion,{})
 for(const [id,note] of Object.entries(previous)){
  if(!defaults[id]||!baseline.fingerprints[id])continue
  const patch:Partial<Note>={}
  for(const field of ['script','preparation','notebook','questions','answer'] as const){
   if(typeof note[field]!=='string')continue
   if(await hash(note[field])!==baseline.fingerprints[id][field]&&(!current[id]||current[id][field]===defaults[id][field]))patch[field]=note[field]
  }
  if(Object.keys(patch).length)merged[id]={...merged[id],...patch}
 }
 }
 return merged
}
