type TextTable={name:string;columns:string[];rows:string[][]}
type TextModel={tables:TextTable[];links:{from:number;to:number;label:string}[];sql:string}
type TextStage={title:string;explanation:string;tables:TextTable[];links?:TextModel['links'];sql:string;result:TextTable|null}
type TextNote={script:string;preparation?:string;questions?:string;answer?:string;notebook?:string}
type TextSlide={id:string;title:string;columns?:string[];rows?:string[][];references?:{citation:string;url?:string}[];visual?:{type:string;parts?:{code:string}[]};task?:{prompt:string;items?:{text:string}[];options?:{text:string}[]};image?:{src:string;alt:string}}
type TextLecture={title:string;slides:TextSlide[]}
type TextCourse={lectures:TextLecture[]}
type TextLearning={lectureModels?:Record<string,TextModel>;questions:{passportId:string;case:{practical:{variants:{label:string;stages:TextStage[]}[]}}}[]}

const cell=(value:unknown)=>String(value).replaceAll('|','\\|').replaceAll('\n','<br>')
const table=(columns:string[],rows:string[][])=>'| '+columns.map(cell).join(' | ')+' |\n| '+columns.map(()=>'---').join(' | ')+' |\n'+rows.map(row=>'| '+row.map(v=>cell(v)||'∅').join(' | ')+' |').join('\n')+'\n\n'
const modelText=(model:TextModel)=>model.tables.map(t=>'**'+t.name+'**\n\n'+t.columns.map(c=>'- '+c).join('\n')+'\n\n'+(t.rows.length?table(t.columns,t.rows):'')).join('\n')+model.links.map(l=>'- '+model.tables[l.from].name+' → '+model.tables[l.to].name+': '+l.label).join('\n')+'\n\n'+(model.sql?'```sql\n'+model.sql+'\n```\n\n':'')

export function teacherMarkdown(course:TextCourse,lecture:TextLecture,learning:TextLearning,notes:Record<string,TextNote>){
 let text='# '+(course.lectures.indexOf(lecture)+1)+'. '+lecture.title+'\n\n'
 const preparation=[...new Set(lecture.slides.map(s=>notes[s.id]?.preparation).filter(Boolean))]
 if(preparation.length)text+='## Подготовка к занятию\n\n'+preparation.join('\n\n')+'\n\n'
 for(const [index,slide]of lecture.slides.entries()){
  const note=notes[slide.id]
  if(!note?.script)throw Error('Нет текста слайда '+slide.id)
  const anchor='screen-'+String(index+1).padStart(3,'0'),item=learning.questions.find(q=>q.passportId===slide.id)
  text+='<a id="'+anchor+'"></a>\n## Слайд '+(index+1)+'. '+slide.title+'\n<!-- source-slides: '+slide.id+' -->\n\n'
  const model=learning.lectureModels?.[slide.id]
  if(model)text+='### Схема и исходные данные\n\n'+modelText(model)
  if(slide.references)text+=slide.references.map(r=>r.citation+(r.url?'\n\n[Открыть источник]('+r.url+')':'')).join('\n\n')+'\n\n'
  if(slide.rows&&slide.columns)text+=table(slide.columns,slide.rows)
  if(slide.visual?.type==='codeParts')for(const part of slide.visual.parts||[])text+='```'+(/^(node|mysql(?:dump)?\b|request_no,)/.test(part.code)?'text':'sql')+'\n'+part.code+'\n```\n\n'
  if(slide.task?.items)text+='**Элементы для сопоставления:**\n\n'+slide.task.items.map((x,i)=>(i+1)+'. '+x.text).join('\n')+'\n\n'
  if(slide.task?.options)text+='**Варианты ответа:**\n\n'+slide.task.options.map((x,i)=>(i+1)+'. '+x.text).join('\n')+'\n\n'
  if(slide.image)text+='!['+slide.image.alt+']('+slide.image.src+')\n\n'
  text+=note.script+'\n\n'
  if(item)for(const variant of item.case.practical.variants){
   text+='### Условия: '+variant.label+'\n\n'
   for(const [step,stage]of variant.stages.entries()){
    text+='#### Шаг '+step+'. '+stage.title+'\n\n'+stage.explanation+'\n\n'
    const previous=variant.stages[step-1],changed=!previous||JSON.stringify(stage.tables)!==JSON.stringify(previous.tables)
    if(changed)text+=modelText({tables:stage.tables,links:stage.links||[],sql:''})
    if(stage.sql)text+='```sql\n'+stage.sql+'\n```\n\n'
    if(stage.result&&!(changed&&stage.tables.some(t=>JSON.stringify(t)===JSON.stringify(stage.result))))text+=table(stage.result.columns,stage.result.rows)
   }
  }
  if(note.questions&&note.questions!==slide.task?.prompt)text+='**Вопрос группе:** '+note.questions+'\n\n'
  if(note.answer)text+='### '+(slide.task?'Для преподавателя: после самостоятельной попытки':'Ожидаемый ответ и разбор')+'\n\n'+note.answer+'\n\n'
  if(note.notebook&&!note.script.includes(note.notebook))text+='**Запись в тетрадь:** '+note.notebook+'\n\n'
 }
 return text.trimEnd()+'\n'
}
