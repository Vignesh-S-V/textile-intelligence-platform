import express from 'express';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app=express();
const __filename=fileURLToPath(import.meta.url);const __dirname=dirname(__filename);const PORT=process.env.PORT||10000;
app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');next()});
app.use(express.static(__dirname,{extensions:['html']}));
function readJson(file){return JSON.parse(readFileSync(join(__dirname,'data',file),'utf8'))}
function cache(res,seconds=300){res.setHeader('Cache-Control',`public, max-age=${seconds}, stale-while-revalidate=1800`);res.setHeader('Access-Control-Allow-Origin','*')}
app.get('/api/yarn',(req,res)=>{try{const data=readJson('yarn.json'),records=Array.isArray(data.records)?data.records:[],dates=records.map(r=>r.date).filter(Boolean).sort();cache(res);res.json({source:data.source||'official-textile-sources',records,count:records.length,fiber_types:[...new Set(records.map(r=>r.fiber).filter(Boolean))].sort(),product_types:[...new Set(records.map(r=>r.product).filter(Boolean))].sort(),coverage:{...(data.coverage||{}),latest_source_record:dates.at(-1)||null}})}catch(error){console.error(error);res.status(500).json({error:'Official yarn dataset could not be loaded'})}});
app.get('/api/live-yarn',(req,res)=>{try{const data=readJson('live_yarn.json'),records=Array.isArray(data.records)?data.records:[],dates=records.map(r=>r.date).filter(Boolean).sort(),latest=dates.at(-1)||null;cache(res,300);res.json({source:data.source||'public-market-reports',records,count:records.length,latest_source_record:latest,latest_count:latest?records.filter(r=>r.date===latest).length:0,source_tier:'MARKET_INDICATOR',generated_at:data.generated_at||null})}catch(error){console.error(error);res.status(500).json({error:'Market-report dataset could not be loaded'})}});
app.get('/api/operations',(req,res)=>{try{const data=readJson('operations.json'),records=Array.isArray(data.records)?data.records:[];cache(res,120);res.json({source:'operations-snapshot',records,count:records.length,connected:records.length>0,schema_version:data.version||'1.0'})}catch(error){console.error(error);res.status(500).json({error:'Operations dataset could not be loaded'})}});
app.get('/health',(req,res)=>res.json({status:'ok',service:'textile-intelligence-platform',version:'3.0.0',timestamp:new Date().toISOString()}));
app.listen(PORT,'0.0.0.0',()=>console.log(`Textile Intelligence Platform running on port ${PORT}`));
