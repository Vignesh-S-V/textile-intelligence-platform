const MIN_DATE='2021-01-01';
const NTC_FROM='2025-04-01';
const TXC_HIST='https://www.txcindia.gov.in/html/ecomicsection/Cotton%20Yarn%20Prices.pdf';
const TXC_SHEETS=[
  ['https://txcindia.gov.in/html/pricessheet3.pdf','Cotton Yarn'],
  ['https://txcindia.gov.in/html/pricessheet4.pdf','Man Made Fibres'],
  ['https://txcindia.gov.in/html/pricessheet5.pdf','Blended Yarn & Viscose Spun Yarn'],
  ['https://txcindia.gov.in/html/pricessheet6.pdf','Man Made Filament Yarns'],
  ['https://txcindia.gov.in/html/pricessheet7.pdf','Wool/Woollen Yarn']
];
const NTC_ARCHIVES=[
  ['https://www.ntcltd.org/WRO_oldRecords.aspx','Western Region'],
  ['https://www.ntcltd.org/SRO_oldRecords.aspx','Southern Region']
];
const CENTRES={Coimbatore:['Tamil Nadu','Coimbatore'],Amritsar:['Punjab','Amritsar'],Ahmedabad:['Gujarat','Ahmedabad']};
const MONTH={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
const clean=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const num=s=>{const n=Number(String(s??'').replace(/,/g,''));return Number.isFinite(n)?n:null};
function dateDMY(s){const m=String(s).match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);if(!m)return null;const d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));return Number.isNaN(d.getTime())?null:d}
function iso(d){return d.toISOString().slice(0,10)}
function monthDate(s){const m=String(s).match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:uary|ruary|ch|il|e|y|ust|tember|ober|ember|ember)?-(\d{2})$/i);if(!m)return null;const k=m[1][0].toUpperCase()+m[1].slice(1).toLowerCase();return new Date(Date.UTC(2000+Number(m[2]),MONTH[k],1))}
async function getPdfText(url){
  const r=await fetch(url,{headers:{'User-Agent':'Textile-Intelligence-Platform/8.0','Accept':'application/pdf,*/*'},redirect:'follow',signal:AbortSignal.timeout(18000)});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const b=Buffer.from(await r.arrayBuffer());
  const pdfParse=(await import('pdf-parse')).default;
  const parsed=await pdfParse(b);
  return parsed.text||'';
}
function historical(text){
  const lines=text.split(/\r?\n/).map(clean).filter(Boolean),out=[];let section='',centre='';
  for(const line of lines){
    if(/Annexure-I\b/i.test(line))section='Cone Combed';
    if(/Annexure-II\b/i.test(line))section='Hosiery Combed';
    const cm=line.match(/Centre[- ]*wise details:\s*([A-Za-z ]+)/i);
    if(cm){centre=Object.keys(CENTRES).find(k=>cm[1].toLowerCase().includes(k.toLowerCase()))||centre;}
    if(!centre||!section)continue;
    const mt=line.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:uary|ruary|ch|il|e|y|ust|tember|ober|ember|ember)?-\d{2}\b/i);if(!mt)continue;
    const dt=monthDate(mt[0]);if(!dt||iso(dt)<MIN_DATE)continue;
    const counts=section==='Cone Combed'&&centre==='Amritsar'?['20s','30s','40s']:section==='Cone Combed'?['20s','30s','40s','60s','80s']:['20s','30s','40s'];
    const tail=line.slice((mt.index||0)+mt[0].length);
    const values=(tail.match(/\b\d+(?:\.\d+)?\b/g)||[]).map(Number).filter(v=>v>120&&v<2000);
    for(let i=0;i<Math.min(counts.length,values.length);i++){
      const [state,district]=CENTRES[centre];
      out.push({date:iso(dt),year:dt.getUTCFullYear(),month:dt.getUTCMonth()+1,state,district,centre,fiber:'Cotton',count:counts[i],blend:section,product:'Cotton Yarn',price_inr_kg:values[i],frequency:'Monthly',source:'Office of the Textile Commissioner',source_short:'TXC',source_url:TXC_HIST});
    }
  }
  return out;
}
const CLASS=[
 [/POLYESTER[- /]*VISCOSE|VISCOSE[- /]*POLYESTER|\bPV\b/i,'Polyester/Viscose','Polyester/Viscose Blended Yarn'],
 [/POLYESTER[- /]*COTTON|COTTON[- /]*POLYESTER|\bPC\b/i,'Polyester/Cotton','Polyester/Cotton Blended Yarn'],
 [/VISCOSE|VSF/i,'Viscose','Viscose Yarn'],[/POLYESTER|PSF/i,'Polyester','Polyester Yarn'],[/NYLON/i,'Nylon','Nylon Yarn'],[/ACRYLIC/i,'Acrylic','Acrylic Yarn'],[/WOOL/i,'Wool','Wool Yarn'],[/LINEN/i,'Linen','Linen Yarn'],[/HEMP/i,'Hemp','Hemp Yarn'],[/SILK/i,'Silk','Silk Yarn'],[/MODAL/i,'Modal','Modal Yarn'],[/LYOCELL|TENCEL/i,'Lyocell','Lyocell Yarn'],[/COTTON|COMBED/i,'Cotton','Cotton Yarn']
];
function classify(s){for(const [re,f,p] of CLASS)if(re.test(s))return[f,p];return null}
function countFrom(s){const m=String(s).match(/(?:^|[\s|/-])(\d{1,3})\s*S\b/i);return m?m[1]+'s':'—'}
function weekly(text,source){
  const lines=text.split(/\r?\n/).map(clean).filter(Boolean),out=[];let reportDate='';
  for(const line of lines){
    const dm=line.match(/(?:week\s+ending|for\s+the\s+week\s+ending|as\s+on|dated|date)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i);if(dm){const d=dateDMY(dm[1]);if(d)reportDate=iso(d)}
    if(!reportDate)continue;const c=classify(line);if(!c||reportDate<MIN_DATE)continue;
    const tail=line.replace(/.*?(?:YARN|FIBRE|FIBER)/i,' ');const vals=(tail.match(/\b\d+(?:\.\d+)?\b/g)||[]).map(Number).filter(v=>v>20&&v<100000);if(!vals.length)continue;
    out.push({date:reportDate,year:+reportDate.slice(0,4),month:+reportDate.slice(5,7),state:'All India',district:'Official weekly report',centre:'Official market average',fiber:c[0],count:'Average',blend:/BLENDED/i.test(c[1])?c[1]:'—',product:c[1],price_inr_kg:vals[0],frequency:'Weekly',source:'Office of the Textile Commissioner',source_short:'TXC',source_url:source});
  }
  return out;
}
function archiveItems(html,archiveUrl,region){
  const rows=html.match(/<tr[\s\S]*?<\/tr>/gi)||[],items=[];
  for(const row of rows){
    const text=clean(row.replace(/<[^>]+>/g,' '));
    if(!/YARN\s+(?:H1\s+)?PRICE\s+LIST/i.test(text))continue;
    const dm=text.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{4})/);const d=dm&&dateDMY(dm[1]);if(!d||iso(d)<NTC_FROM)continue;
    const urls=[];for(const m of row.matchAll(/(?:href|data-href|src)\s*=\s*["']([^"']+)["']/gi))urls.push(m[1]);
    for(const m of row.matchAll(/["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi))urls.push(m[1]);
    const url=urls.map(u=>{try{return new URL(u.replace(/&amp;/g,'&'),archiveUrl).href}catch{return ''}}).find(u=>/\.pdf(?:[?#]|$)/i.test(u));
    if(url)items.push({region,date:iso(d),url});
  }
  // Keep one latest list per calendar month and region.
  const seen=new Set(),out=[];for(const x of items.sort((a,b)=>b.date.localeCompare(a.date))){const k=x.region+'|'+x.date.slice(0,7);if(seen.has(k))continue;seen.add(k);out.push(x)}return out;
}
function parseNtc(text,item){
  const lines=text.split(/\r?\n/).map(clean).filter(Boolean);const joined=lines.join(' | ');const out=[];const d=dateDMY(item.date);if(!d)return out;
  // NTC PDFs use rows such as: 45s PC 70:30 | Mill | 137.90 | Ex-Mill Rate/kg.
  const re=/([^|\n]{1,220})\s*\|\s*(?:[^|\n]{1,160})\s*\|\s*(\d+(?:\.\d{1,2})?)\s*\|\s*Ex[- ]?Mill\s+Rate\s*\/\s*kg/gi;
  let m;while((m=re.exec(joined))){
    const variety=clean(m[1]),price=num(m[2]);if(!variety||price===null||price<=0||price>=10000)continue;const c=classify(variety);if(!c)continue;
    out.push({date:item.date,year:d.getUTCFullYear(),month:d.getUTCMonth()+1,state:'Not specified by source',district:item.region,centre:item.region,fiber:c[0],count:countFrom(variety),blend:/BLENDED|\bPC\b|\bPV\b|\d{2}:\d{2}/i.test(variety)?'Blended':'—',product:c[1],yarn_name:variety,mill_name:'NTC',price_inr_kg:price,frequency:'Official NTC price list',source:'National Textile Corporation',source_short:'NTC',source_url:item.url,region:item.region});
  }
  return out;
}
async function getNtc(archiveUrl,region){
  try{
    const r=await fetch(archiveUrl,{headers:{'User-Agent':'Textile-Intelligence-Platform/8.0','Accept':'text/html,*/*'},redirect:'follow',signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);const html=await r.text();const items=archiveItems(html,archiveUrl,region);const out=[];
    for(let i=0;i<items.length;i+=5){const batch=items.slice(i,i+5);const settled=await Promise.allSettled(batch.map(async x=>parseNtc(await getPdfText(x.url),x)));for(const s of settled)if(s.status==='fulfilled')out.push(...s.value)}return out;
  }catch(e){console.warn(`NTC ${region}: ${e.message}`);return []}
}
function dedupe(rows){const seen=new Set();return rows.filter(r=>r.date>=MIN_DATE&&Number.isFinite(Number(r.price_inr_kg))&&r.price_inr_kg>0&&!((()=>{const k=[r.date,r.source_short,r.region||'',r.centre,r.fiber,r.count,r.yarn_name||r.product,r.price_inr_kg].join('|');if(seen.has(k))return true;seen.add(k);return false})()));}
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
  try{
    const [hist,...parts]=await Promise.all([
      getPdfText(TXC_HIST).then(historical),
      ...TXC_SHEETS.map(([u,s])=>getPdfText(u).then(t=>weekly(t,u)).catch(e=>{console.warn(`TXC ${s}: ${e.message}`);return []})),
      ...NTC_ARCHIVES.map(([u,r])=>getNtc(u,r))
    ]);
    const records=dedupe([hist,...parts.flat()]).sort((a,b)=>a.date.localeCompare(b.date)||String(a.fiber).localeCompare(String(b.fiber))||String(a.count).localeCompare(String(b.count),undefined,{numeric:true}));
    const ntc=records.filter(r=>r.source_short==='NTC');const dates=records.map(r=>r.date).sort();
    return res.status(200).json({source:'official-textile-sources',records,count:records.length,fiber_types:[...new Set(records.map(r=>r.fiber))].sort(),product_types:[...new Set(records.map(r=>r.product))].sort(),coverage:{minimum_date:MIN_DATE,historical_cotton:'January 2021 to March 2025',ntc_post_mar_2025_records:ntc.length,latest_source_record:dates.at(-1)||null,txc_sources_attempted:TXC_SHEETS.map(x=>x[1]),ntc_archives_attempted:NTC_ARCHIVES.map(x=>x[1]),note:'Rows are parsed from official TXC and NTC publications. Filter values are derived only from successfully parsed official records.'}});
  }catch(e){console.error(e);return res.status(500).json({error:'Official yarn data ingestion failed',detail:e.message});}
}
