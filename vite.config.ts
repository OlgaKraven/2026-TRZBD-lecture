import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import {teacherMarkdown} from './src/lib/teacherMarkdown.js'
// Local teacher downloads read the single maintained copy. No Markdown enters the public build.
const teacherText={name:'local-teacher-text',configureServer(server:import('vite').ViteDevServer){server.middlewares.use((req,res,next)=>{
 const name=req.url?.split('?')[0].match(/\/teacher-text\/(lecture-\d{2}\.teacher\.md)$/)?.[1]
 if(!name)return next()
 const dir=process.env.TRZBD_TEACHER_DIR
 if(!dir){
  try{
   const course=JSON.parse(fs.readFileSync('public/course.json','utf8')),notes=JSON.parse(fs.readFileSync('public/teacher-notes.json','utf8')),learning=JSON.parse(fs.readFileSync('public/learning.json','utf8')),lecture=course.lectures[Number(name.slice(8,10))-1]
   if(!lecture){res.statusCode=404;res.end('Not found');return}
   res.setHeader('Content-Type','text/markdown; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${name}"`);res.end(teacherMarkdown(course,lecture,learning,notes.notes))
  }catch{res.statusCode=503;res.end('Teacher text unavailable')}
  return
 }
 const filename=path.join(dir,name)
 if(!fs.existsSync(filename)){res.statusCode=404;res.end('Not found');return}
 res.setHeader('Content-Type','text/markdown; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${name}"`);fs.createReadStream(filename).pipe(res)
})}}
export default defineConfig({base:'/2026-TRZBD-lecture/',plugins:[react(),teacherText],server:{host:'127.0.0.1'},build:{sourcemap:false}})
