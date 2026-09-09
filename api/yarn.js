// api/yarn.js
// Official yarn/fibre price sources used by the Textile Intelligence Platform.
// Historical cotton-yarn series: Office of the Textile Commissioner.
// The weekly price sheet is also parsed for non-cotton fibre/yarn categories when present.

const HISTORICAL_URL = 'https://www.txcindia.gov.in/html/ecomicsection/Cotton%20Yarn%20Prices.pdf';
const CURRENT_WEEKLY_URL = 'https://txcindia.gov.in/html/pricessheet3.pdf';
const CENTRE_META = { Coimbatore:{state:'Tamil Nadu',district:'Coimbatore'}, Amritsar:{state:'Punjab',district:'Amritsar'}, Ahmedabad:{state:'Gujarat',district:'Ahmedabad'} };
const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };

function cleanLine(line){return line.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function numberOrNull(value){if(!value||value==='-'||/^N\.?A\.?$/i.test(value))return null;const n=Number(String(value).replace(/,/g,''));return Number.isFinite(n)?n:null}
function parseMonthToken(token){const m=token.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/i);if(!m)return null;return new Date(Date.UTC(2000+Number(m[2]),MONTHS[m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()],1))}

function parseHistoricalText(text){
 const lines=text.split(/\r?\n/).map(cleanLine).filter(Boolean),records=[];let section=null,centre=null;
 for(const line of lines){
  if(/Annexure-I/i.test(line))section='Cone Combed'; if(/Annexure-II/i.test(line))section='Hosiery Combed';
  const cm=line.match(/Centre-?\s*wise details:\s*([A-Za-z ]+)/i);if(cm){const c=cm[1].trim();centre=Object.keys(CENTRE_META).find(x=>c.toLowerCase().startsWith(x.toLowerCase()))||null;continue}
  const tokens=cleanLine(line).split(' ').filter(Boolean),date=tokens.length?parseMonthToken(tokens[0]):null;if(!date||!centre||!section)continue;
  const counts=section==='Cone Combed'?['20s','30s','40s','60s','80s']:['20s','30s','40s'];const values=tokens.slice(1);let cursor=0;
  for(const count of counts){const priceToken=values[cursor],price=numberOrNull(priceToken);if(price!==null)records.push({date:date.toISOString().slice(0,10),year:date.getUTCFullYear(),month:date.getUTCMonth()+1,state:CENTRE_META[centre].state,district:CENTRE_META[centre].district,centre,fiber:'Cotton',count,blend:section,product:'Cotton Yarn',price_inr_kg:price,frequency:'Monthly',source:'Office of the Textile Commissioner',source_url:HISTORICAL_URL});cursor+=priceToken==='-'?1:3}
 }
 return records;
}

// Recognise non-cotton categories if the current official weekly sheet contains them.
function parseCurrentWeeklyText(text){
 const lines=text.split(/\r?\n/).map(cleanLine).filter(Boolean),records=[];let reportDate=null;
 const categories=[
  ['VISCOSE STAPLE FIBRE','Viscose','Viscose Staple Fibre'],
  ['VISCOSE FILAMENT YARN','Viscose','Viscose Filament Yarn'],
  ['POLYESTER STAPLE FIBRE','Polyester','Polyester Staple Fibre'],
  ['POLYESTER FILAMENT YARN','Polyester','Polyester Filament Yarn'],
  ['TEXTURISED YARN','Polyester','Texturised Yarn'],
  ['NYLON FILAMENT YARN','Nylon','Nylon Filament Yarn'],
  ['POLY/VISC. BLENDED YARN','Polyester/Viscose','Polyester/Viscose Blended Yarn'],
  ['POLY/COTTON BLENDED YARN','Polyester/Cotton','Polyester/Cotton Blended Yarn'],
  ['ACRYLIC YARN','Acrylic','Acrylic Yarn'],
  ['WOOLLEN YARN','Wool','Woollen Yarn'],
 ];
 for(const line of lines){
  const dm=line.match(/week ending\s+(\d{2}[./-]\d{2}[./-]\d{4})/i);if(dm){const [dd,mm,yyyy]=dm[1].split(/[./-]/).map(Number);reportDate=`${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`}
  for(const [label,fiber,product] of categories){
   if(!line.toUpperCase().includes(label))continue;
   const after=line.slice(line.toUpperCase().indexOf(label)+label.length),nums=after.match(/\b\d{2,5}(?:\.\d+)?\b/g)||[],price=numberOrNull(nums[0]);if(price===null)continue;
   records.push({date:reportDate||new Date().toISOString().slice(0,10),year:Number((reportDate||new Date().toISOString().slice(0,4)).slice(0,4)),month:Number((reportDate||new Date().toISOString().slice(0,7)).slice(5,7)),state:'All India',district:'Official weekly report',centre:'Official market average',fiber,count:'Average',blend:product.includes('Blended')?product:'—',product,price_inr_kg:price,frequency:'Weekly',source:'Office of the Textile Commissioner',source_url:CURRENT_WEEKLY_URL});
  }
 }
 return records;
}
function dedupe(records){const seen=new Set();return records.filter(r=>{const k=[r.date,r.centre,r.fiber,r.count,r.product,r.price_inr_kg].join('|');if(seen.has(k))return false;seen.add(k);return true})}
async function fetchPdf(url){const response=await fetch(url,{headers:{'User-Agent':'Textile-Intelligence-Platform/2.0'}});if(!response.ok)throw new Error(`Source returned HTTP ${response.status}: ${url}`);return Buffer.from(await response.arrayBuffer())}
async function parsePdf(buffer){const pdfParse=(await import('pdf-parse')).default;return (await pdfParse(buffer)).text||''}
async function fetchHistorical(){return parseHistoricalText(await parsePdf(await fetchPdf(HISTORICAL_URL)))}
async function fetchCurrentWeekly(){try{return parseCurrentWeeklyText(await parsePdf(await fetchPdf(CURRENT_WEEKLY_URL)))}catch(error){console.warn('Current weekly fibre/yarn report unavailable:',error.message);return []}}

export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');res.setHeader('Access-Control-Allow-Origin','*');
 try{const [historical,current]=await Promise.all([fetchHistorical(),fetchCurrentWeekly()]);const records=dedupe([...historical,...current]).sort((a,b)=>a.date.localeCompare(b.date)||a.fiber.localeCompare(b.fiber)||a.count.localeCompare(b.count));const dates=records.map(r=>r.date).sort();return res.status(200).json({source:'official-textile-commissioner',records,count:records.length,fiber_types:[...new Set(records.map(r=>r.fiber))].sort(),coverage:{historical_cotton:'January 2021 to March 2025',latest_available:dates.at(-1)||null,non_cotton:'included only when present in official weekly sheet'},fetched_at:new Date().toISOString()})}
 catch(error){console.error('Yarn/fibre scraper failed:',error);return res.status(502).json({error:'Could not scrape the official yarn/fibre price sources.',detail:error instanceof Error?error.message:String(error)})}
}
