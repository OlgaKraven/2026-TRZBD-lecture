import type {Course,Lecture,Note,Slide} from '@olgakraven/lecture-engine'
export type {Course,Lecture,Note,Slide}
export type Profile={fullName:string;position:string;department:string}
export type CaseModel={tables:{name:string;columns:string[];rows:string[][];result?:boolean}[];links:{from:number;to:number;label:string}[];sql:string;trace:string[]}
export type Case={id:string;revision:string;title:string;lectureId:string;passportId:string;data:string;question:string;options:string[];correct:number;reason:string;inspect:string;model:CaseModel}
export type Question={id:string;number:number;title:string;definition:{term:string;definition:string};rule:string;case:Case;passportId:string;testId:string;testIds?:string[];slideIds:string[]}
export type Learning={contentVersion:string;questions:Question[];slides:Record<string,{questionId:string;number:number}>;lectureModels:Record<string,CaseModel>}
export type CatalogProps={course:Course;base:string;profile:Profile;materials:string;theme:'light'|'dark';storagePrefix:string;invalidLecture:boolean;onOpenLecture:(l:Lecture)=>void;onPrint:(scope:string)=>void;onProfileChange:(p:Profile)=>void;onMaterialsChange:(s:string)=>void;onThemeChange:(s:'light'|'dark')=>void}
export type Answer=string|string[]|Record<string,string>
export type Key={type:string;correct?:string[];accepted?:string[];pairs?:Record<string,string>;explanation:string}
export function read<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
export function save(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
export const normalize=(s:string)=>s.normalize('NFKC').trim().toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ')
export function grade(key:Key,a:Answer):boolean{
 if(key.type==='short')return Boolean(key.accepted?.some(x=>normalize(x)===normalize(String(a))))
 if(key.type==='matching')return Boolean(key.pairs&&Object.entries(key.pairs).every(([id,v])=>typeof a==='object'&&!Array.isArray(a)&&a[id]===v))
 const selected=Array.isArray(a)?a:typeof a==='string'?[a]:[]
 return selected.length===(key.correct?.length||0)&&selected.every(x=>key.correct?.includes(x))
}
export function complete(s:Slide,a:Answer){if(!s.task)return false;const t=s.task;if(t.type==='matching')return typeof a==='object'&&!Array.isArray(a)&&t.items?.every(i=>Boolean(a[i.id]));return Array.isArray(a)?a.length>0:typeof a==='string'&&a.trim().length>0}
