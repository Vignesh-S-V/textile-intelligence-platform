// api/yarn.js
// Official textile/yarn/fibre price scraper.
// Historical cotton yarn: Office of the Textile Commissioner, Jan-2021 to Mar-2025.
// Current weekly reports are split across official price sheets 3-7.
const HISTORICAL_URL='https://www.txcindia.gov.in/html/ecomicsection/Cotton%20Yarn%20Prices.pdf';
const WEEKLY_URLS=[
 {url:'https://txcindia.gov.in/html/pricessheet3.pdf',sheet:'Cotton Yarn'},
 {url:'https://txcindia.gov.in/html/pricessheet4.pdf',sheet:'Man Made Fibres'},
 {url:'https://txcindia.gov.in/html/pricessheet5.pdf',sheet:'Blended Yarn & Viscose Spun Yarn'},
 {url:'https://txcindia.gov.in/html/pricessheet6.pdf',sheet:'Man Made Filament Yarns'},
 {url:'https://txcindia.gov.in/html/pricessheet7.pdf',sheet:'Wool/Woollen Yarn'}
];
const CENTRE_META={Coimbatore:{state:'Tamil Nadu',district:'Coimbatore'},Amritsar:{state:'Punjab',district:'Amritsar'},Ahmedabad:{state:'Gujarat',district:'Ahmedabad'}};
const MONTHS={Jan:0,January:0,Feb:1,February:1,Mar:2,March:2,Apr:3,April:3,May:4,Jun:5,June:5,Jul:6,July:6,Aug:7,August:7,Sep:8,September:8,Oct:9,October:9,Nov:10,November:10,Dec:11,December:11};
function cleanLine(x){return x.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function numberOrNull(x){if(!x||x==='-'||/^N\.?A\.?$/i.test(x))return null;const n=Number(String(x).replace(/,/g,''));return Number.isFinite(n)?n:null}
function parseMonthToken(t){const m=t.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)-(\d{2})$/i);if(!m)return null;const k=Object.keys(MONTHS).find(x=>x.toLowerCase()===m[1].toLowerCase());return new Date(Date.UTC(2000+Number(m[2]),MONTHS[k],1))}
function parseHistoricalText(text){const lines=text.split(/\r?\n/).map(cleanLine).filter(Boolean),out=[];let section=null,centre=null;for(const line of lines){if(/Annexure-I/i.test(line))section='Cone Combed';if(/Annexure-II/i.test(line))section='Hosiery Combed';const cm=line.match(/Centre-?\s*wise details:\s*([A-Za-z ]+)/i);if(cm){const c=cm[1].trim();centre=Object.keys(CENTRE_META).find(x=>c.toLowerCase().startsWith(x.toLowerCase()))||null;continue}const t=line.split(' '),date=t.length?parseMonthToken(t[0]):null;if(!date||!centre||!section)continue;const counts=section==='Cone Combed'?(centre==='Amritsar'?['20s','30s','40s']:['20s','30s','40s','60s','80s']):['20s','30s','40s'];const v=t.slice(1);let c=0;for(const count of counts){const p=numberOrNull(v[c]);if(p!==null)out.push({date:date.toISOString().slice(0,10),year:date.getUTCFullYear(),month:date.getUTCMonth()+1,state:CENTRE_META[centre].state,district:CENTRE_META[centre].district,centre,fiber:'Cotton',count,blend:section,product:'Cotton Yarn',price_inr_kg:p,frequency:'Monthly',source:'Office of the Textile Commissioner',source_url:HISTORICAL_URL});c+=v[c]==='-'?1:3}}return out}
const PATTERNS=[
 [/POLY\s*\/\s*COTTON\s+BLENDED\s+YARN/i,'Polyester/Cotton','Polyester/Cotton Blended Yarn'],
 [/POLY\s*\/\s*VISC(?:OSE)?\.?\s+BLENDED\s+YARN/i,'Polyester/Viscose','Polyester/Viscose Blended Yarn'],
 [/POLYESTER\s+VISCOSE\s+BLENDED\s+YARN/i,'Polyester/Viscose','Polyester/Viscose Blended Yarn'],
 [/POLYESTER\s+COTTON\s+BLENDED\s+YARN/i,'Polyester/Cotton','Polyester/Cotton Blended Yarn'],
 [/VISCOSE\s+SPUN\s+YARN/i,'Viscose','Viscose Spun Yarn'],
 [/VISCOSE\s+STAPLE\s+FIB(?:R)?E/i,'Viscose','Viscose Staple Fibre'],
 [/POLYESTER\s+STAPLE\s+FIB(?:R)?E/i,'Polyester','Polyester Staple Fibre'],
 [/VISCOSE\s+FILAMENT\s+YARN/i,'Viscose','Viscose Filament Yarn'],
 [/POLYESTER\s+FILAMENT\s+YARN/i,'Polyester','Polyester Filament Yarn'],
 [/NYLON\s+FILAMENT\s+YARN/i,'Nylon','Nylon Filament Yarn'],
 [/ACRYLIC\s+(?:SPUN\s+)?YARN/i,'Acrylic','Acrylic Yarn'],
 [/TEXTURI[ZS]ED\s+YARN/i,'Polyester','Texturised Yarn'],
 [/POLYESTER\s+YARN/i,'Polyester','Polyester Yarn'],
 [/NYLON\s+YARN/i,'Nylon','Nylon Yarn'],
 [/WOOLLEN\s+YARN/i,'Wool','Woollen Yarn'],
 [/WOOL\s+TOPS?/i,'Wool','Wool Tops']
];
function detect(line,sheet){for(const [re,f,p] of PATTERNS)if(re.test(line))return{fiber:f,product:p};if(/COTTON\s+YARN|COMBED\s+YARN/i.test(line))return{fiber:'Cotton',product:'Cotton Yarn'};return null}
function parseWeeklyText(text,source){const lines=text.split(/\r?\n/).map(cleanLine).filter(Boolean),out=[];let reportDate=null;for(const line of lines){const dm=line.match(/(?:week\s+ending|for\s+the\s+week\s+ending|as\s+on)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i);if(dm){const [dd,mm,yyyy]=dm[1].split(/[./-]/).map(Number);reportDate=`${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`}const d=detect(line,source.sheet);if(!d)continue;const idx=line.toUpperCase().indexOf(d.product.toUpperCase());const tail=idx>=0?line.slice(idx+d.product.length):line;const nums=tail.match(/\b\d{2,5}(?:\.\d+)?\b/g)||[];const p=nums.map(numberOrNull).find(n=>n!==null&&n>20&&n<100000);if(p===undefined)continue;out.push({date:reportDate||new Date().toISOString().slice(0,10),year:Number((reportDate||new Date().toISOString().slice(0,4)).slice(0,4)),month:Number((reportDate||new Date().toISOString().slice(0,7)).slice(5,7)),state:'All India',district:'Official weekly report',centre:'Official market average',fiber:d.fiber,count:'Average',blend:/BLENDED/i.test(d.product)?d.product:'—',product:d.product,price_inr_kg:p,frequency:'Weekly',source:'Office of the Textile Commissioner',source_url:source.url})}return out}
function dedupe(a){const s=new Set();return a.filter(r=>{const k=[r.date,r.centre,r.fiber,r.count,r.product,r.price_inr_kg].join('|');if(s.has(k))return false;s.add(k);return true})}
async function fetchPdf(url){const r=await fetch(url,{headers:{'User-Agent':'Textile-Intelligence-Platform/4.0'}});if(!r.ok)throw new Error(`HTTP ${r.status}: ${url}`);return Buffer.from(await r.arrayBuffer())}
async function parsePdf(b){const pdfParse=(await import('pdf-parse')).default;return (await pdfParse(b)).text||''}
async function fetchHistorical(){return parseHistoricalText(await parsePdf(await fetchPdf(HISTORICAL_URL)))}
async function fetchWeekly(source){try{return parseWeeklyText(await parsePdf(await fetchPdf(source.url)),source)}catch(e){console.warn(`Official ${source.sheet} unavailable:`,e.message);return[]}}
export default async function handler(req,res){if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');res.setHeader('Access-Control-Allow-Origin','*');try{const [h,...w]=await Promise.all([fetchHistorical(),...WEEKLY_URLS.map(fetchWeekly)]);const records=dedupe([...h,...w.flat()]).sort((a,b)=>a.date.localeCompare(b.date)||a.fiber.localeCompare(b.fiber)||a.count.localeCompare(b.count));const dates=records.map(r=>r.date).sort();return res.status(200).json({source:'official-textile-commissioner',records,count:records.length,fiber_types:[...new Set(records.map(r=>r.fiber))].sort(),product_types:[...new Set(records.map(r=>r.product))].sort(),coverage:{historical_cotton:'January 2021 to March 2025',latest_source_record:dates.at(-1)||null,weekly_sheets_attempted:WEEKLY_URLS.map(x=>x.sheet),note:'Fiber values are generated from successfully parsed official source rows only; unsupported or missing categories are not hardcoded.'},fetched_at:new Date().toISOString()})}catch(e){console.error(e);return res.status(502).json({error:'Could not scrape official textile price sources.',detail:e instanceof Error?e.message:String(e)})}}
