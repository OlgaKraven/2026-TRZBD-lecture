import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import fs from 'node:fs'
import path from 'node:path'
// Local teacher downloads read the single maintained copy. No Markdown enters the public build.
const teacherText={name:'local-teacher-text',configureServer(server:import('vite').ViteDevServer){server.middlewares.use((req,res,next)=>{
 const name=req.url?.split('?')[0].match(/\/teacher-text\/(lecture-\d{2}\.teacher\.md)$/)?.[1]
 if(!name)return next()
 const dir=process.env.TRZBD_TEACHER_DIR
 if(!dir){res.statusCode=503;res.end('Teacher text directory is not configured');return}
 const filename=path.join(dir,name)
 if(!fs.existsSync(filename)){res.statusCode=404;res.end('Not found');return}
 res.setHeader('Content-Type','text/markdown; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${name}"`);fs.createReadStream(filename).pipe(res)
})}}
export default defineConfig({base:'/2026-TRZBD-lecture/',plugins:[react(),teacherText],server:{host:'127.0.0.1'},build:{sourcemap:false}})
