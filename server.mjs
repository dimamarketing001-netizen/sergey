import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const app=express();
const port=Number(process.env.PORT||4173);
const isProduction=process.env.NODE_ENV==='production'||process.argv.includes('--production');
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false}));
app.use(compression());
app.use(express.json({limit:'32kb'}));
const limiter=rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:true,legacyHeaders:false});
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
function buildLead(body){return{event:clean(body.event,60),date:clean(body.date,30),city:clean(body.city,100),name:clean(body.name,100),phone:clean(body.phone,50),guests:clean(body.guests,20),contactMethod:clean(body.contactMethod,40),comment:clean(body.comment,900),page:clean(body.page,300),website:clean(body.website,120)}}
function message(l){return['🔥 Новая заявка с сайта Сергея Головенькина','',`Событие: ${l.event||'—'}`,`Дата: ${l.date||'—'}`,`Город: ${l.city||'—'}`,`Имя: ${l.name||'—'}`,`Телефон: ${l.phone||'—'}`,`Гостей: ${l.guests||'—'}`,`Удобный канал: ${l.contactMethod||'—'}`,`Комментарий: ${l.comment||'—'}`,'',`Страница: ${l.page||'—'}`].join('\n')}
async function telegram(l){const token=process.env.TELEGRAM_BOT_TOKEN,chatId=process.env.TELEGRAM_CHAT_ID;if(!token||!chatId)return false;const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text:message(l),disable_web_page_preview:true})});if(!r.ok)throw new Error(`Telegram ${r.status}`);return true}
async function webhook(l){const url=process.env.LEAD_WEBHOOK_URL;if(!url)return false;const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'sergey-golovenkin-site',lead:l,text:message(l)})});if(!r.ok)throw new Error(`Webhook ${r.status}`);return true}
app.post('/api/lead',limiter,async(req,res)=>{const l=buildLead(req.body||{});if(l.website)return res.json({ok:true});if(!l.name||!l.phone||!l.city||!l.event||!l.date)return res.status(400).json({ok:false,message:'Заполните имя, телефон, город, формат и дату.'});try{let delivered=false;delivered=(await telegram(l))||delivered;delivered=(await webhook(l))||delivered;if(!delivered)return res.status(503).json({ok:false,needsConfig:true,message:'Канал приёма заявок ещё не настроен.'});return res.json({ok:true})}catch(e){console.error('Lead delivery failed:',e);return res.status(502).json({ok:false,message:'Не удалось передать заявку. Попробуйте ещё раз.'})}});
if(isProduction){const dist=path.join(__dirname,'dist');app.use(express.static(dist,{maxAge:'7d',etag:true}));app.get('*',(req,res)=>res.sendFile(path.join(dist,'index.html')))}else{const{createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares)}
app.listen(port,'127.0.0.1',()=>console.log(`Sergey site: http://127.0.0.1:${port}`));
