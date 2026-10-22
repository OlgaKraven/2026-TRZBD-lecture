export const table=(title,columns,rows,walkthrough)=>({title,columns,rows,walkthrough});
export const code=(title,code,walkthrough)=>({title,code,walkthrough});
export const single=(prompt,options,correct,explanation)=>({type:'single',prompt,options,correct,explanation});
export const multiple=(prompt,options,correct,explanation)=>({type:'multiple',prompt,options,correct,explanation});
export const short=(prompt,accepted,explanation)=>({type:'short',prompt,accepted,explanation});
export const matching=(prompt,items,options,pairs,explanation)=>({type:'matching',prompt,items,options,pairs,explanation});
export const block=(id,title,lead,mechanism,reasoning,worked,task,notebook,extra={})=>({id,title,lead,mechanism,reasoning,worked,task,notebook,...extra});
export const requests=()=>table('Учебный набор: три принятые заявки',['id / request_no','client_id / branch_id','status_id / received_at'],[['1 / R101','1 / 1','1 / 2026-09-01 09:00:00'],['2 / R102','2 / 1','2 / 2026-09-01 10:00:00'],['3 / R103','1 / 2','3 / 2026-09-02 11:00:00']],'Это синтетический стенд курса. В справочнике клиентов 1=C01, 2=C02; филиалы 1=B01, 2=B02, 3=B03; статусы 1=NEW, 2=WORK, 3=CLOSED. Рядом всегда различаем внутренний id и код источника: одинаковые цифры в разных таблицах не означают один объект. Исходных строк requests.csv шесть; ещё три строки отклонены, а не потеряны.');
export const lecture=(introduction,outcome,context,blocks,source,preparation)=>({introduction,outcome,context,blocks:blocks.map((b,i)=>({...b,covers:[i+1],questionNumber:i+1,source:b.source||source})),preparation});
