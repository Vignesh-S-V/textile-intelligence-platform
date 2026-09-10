/* Forecasting module: exact product identity, refinement-aware fallback, rolling backtesting and market anchoring. */
(() => {
  'use strict';
  const S=()=>window.TIP?.state, $=id=>document.getElementById(id);
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const clamp=v=>Math.max(0,Number(v)||0);
  const mape=(actual,pred)=>{const e=[];for(let i=0;i<actual.length;i++)if(actual[i]!==0&&Number.isFinite(actual[i])&&Number.isFinite(pred[i]))e.push(Math.abs((actual[i]-pred[i])/actual[i])*100);return e.length?mean(e):Infinity};
  const linear=(y,h)=>{const n=y.length;if(n<2)return Array(h).fill(y.at(-1));const xb=(n-1)/2,yb=mean(y),b=y.reduce((s,v,i)=>s+(i-xb)*(v-yb),0)/(n*(n*n-1)/12),a=yb-b*xb;return Array.from({length:h},(_,j)=>clamp(a+b*(n+j)))};
  const drift=(y,h)=>{if(y.length<2)return Array(h).fill(y.at(-1));const d=(y.at(-1)-y[0])/(y.length-1);return Array.from({length:h},(_,j)=>clamp(y.at(-1)+d*(j+1)))};
  const recent=(y,h)=>Array(h).fill(mean(y.slice(-Math.min(6,y.length))));
  const holt=(y,h)=>{if(y.length<4)return drift(y,h);let l=y[0],b=y[1]-y[0],a=.35,g=.18;for(let i=1;i<y.length;i++){const old=l;l=a*y[i]+(1-a)*(l+b);b=g*(l-old)+(1-g)*b}return Array.from({length:h},(_,j)=>clamp(l+(j+1)*b))};
  const damped=(y,h)=>{if(y.length<4)return drift(y,h);let l=y[0],b=y[1]-y[0],a=.3,g=.15,phi=.82;for(let i=1;i<y.length;i++){const old=l;l=a*y[i]+(1-a)*(l+phi*b);b=g*(l-old)+(1-g)*phi*b}return Array.from({length:h},(_,j)=>clamp(l+b*(phi*(1-Math.pow(phi,j+1))/(1-phi))))};
  const seasonal=(y,h)=>y.length<24?null:Array.from({length:h},(_,j)=>clamp(y[y.length-12+(j%12)]));
  const candidates=(y,h)=>{const c=[['Adaptive Holt',holt],['Damped Trend',damped],['Linear Trend',linear],['Drift',drift],['Recent Mean',recent]],s=seasonal(y,h);if(s)c.push(['Seasonal Naive',()=>s]);return c};
  const backtest=(y,fn,h)=>{const minTrain=Math.max(6,Math.min(24,Math.floor(y.length*.55))),a=[],p=[];for(let end=minTrain;end<y.length;end+=Math.max(1,Math.min(h,3))){const take=Math.min(h,y.length-end);a.push(...y.slice(end,end+take));p.push(...fn(y.slice(0,end),take))}return mape(a,p)};
  const choose=(y,h)=>{let best=null;for(const [name,fn] of candidates(y,h)){const score=backtest(y,fn,h);if(score<Infinity&&(!best||score<best.mape))best={name,fn,mape:score}}return best||{name:'Recent Mean',fn:recent,mape:Infinity}};
  const nextMonth=k=>{const [y,m]=k.split('-').map(Number),d=new Date(Date.UTC(y,m-1,1));d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,7)};
  const series=rows=>{const m={};rows.forEach(r=>{const k=String(r.date||'').slice(0,7),v=Number(r.price_inr_kg);if(/^\d{4}-\d{2}$/.test(k)&&Number.isFinite(v))(m[k]??=[]).push(v)});return Object.keys(m).sort().map(month=>({month,value:mean(m[month])}))};
  const coreIds=['fiber','product','yarn_type','count'];
  const refinementIds=['state','district','centre','spinning','blend','yarn_name','year','month'];
  function values(ids){return Object.fromEntries(ids.map(id=>[id,$(id)?.value||'']))}
  function filterRows(base, wanted){return base.filter(r=>Object.entries(wanted).every(([id,v])=>!v||String(r[id]).toLowerCase()===String(v).toLowerCase()))}
  function getForecastRows(){
    const s=S(); if(!s)return {rows:[],scope:'none',relaxed:[]};
    const all=values([...coreIds,...refinementIds]);
    const exact=filterRows(s.records,all);
    if(series(exact).length>=6)return {rows:exact,scope:'Exact active filters',relaxed:[]};
    const core=filterRows(s.records,values(coreIds));
    if(series(core).length>=6)return {rows:core,scope:'Core product identity',relaxed:refinementIds.filter(id=>all[id])};
    return {rows:exact,scope:'Exact active filters',relaxed:[]};
  }
  function marketAnchor(){
    const s=S();if(!s)return null;const market=$('market-filter')?.value||'';if(!market)return null;let rows=s.market.filter(r=>String(r.market||'').toLowerCase()===market.toLowerCase());const f=$('fiber')?.value,p=$('product')?.value,t=$('yarn_type')?.value,c=$('count')?.value;if(f)rows=rows.filter(r=>String(r.fiber||'').toLowerCase()===f.toLowerCase());if(p)rows=rows.filter(r=>String(r.product||'').toLowerCase()===p.toLowerCase());if(t)rows=rows.filter(r=>String(r.yarn_type||'').toLowerCase()===t.toLowerCase());if(c)rows=rows.filter(r=>String(r.count||'').toLowerCase()===c.toLowerCase());const d=[...new Set(rows.map(r=>r.date).filter(Boolean))].sort().at(-1),rr=d?rows.filter(r=>r.date===d):[];if(!rr.length)return null;const mids=rr.map(r=>(Number(r.price_min_inr_kg)+Number(r.price_max_inr_kg))/2).filter(Number.isFinite);return mids.length?{market,date:d,value:mean(mids)}:null;
  }
  function render(){
    const s=S(),status=$('forecast-status'),note=$('forecast-note');if(!s||!status)return;
    if(s.charts?.forecast){s.charts.forecast.destroy();delete s.charts.forecast}
    const missing=coreIds.filter(id=>!$(id)?.value);
    if(missing.length){const labels={fiber:'Fiber',product:'Yarn Category',yarn_type:'Yarn Type',count:'Count'};status.textContent=`Select ${missing.map(id=>labels[id]).join(' + ')}`;status.className='status warn';note.textContent='Forecast needs Fiber + Yarn Category + Yarn Type + Count. State, District, Centre, Spinning, Blend, Yarn Name, Year and Month are optional refinements.';return}
    const picked=getForecastRows(),ser=series(picked.rows);if(ser.length<6){status.textContent='Insufficient verified history';status.className='status warn';note.textContent=`Only ${ser.length} monthly points are available for this product identity. At least 6 verified monthly points are required; no synthetic history is created.`;return}
    const h=window.TIP.forecastHorizon||3,y=ser.map(x=>x.value),best=choose(y,h),raw=best.fn(y,h),anchor=marketAnchor();let factor=1;if(anchor&&y.at(-1)>0)factor=anchor.value/y.at(-1);const pred=raw.map(v=>v*factor);
    let last=ser.at(-1).month,future=[];for(let i=0;i<h;i++){last=nextMonth(last);future.push(last)}
    const cy=String(new Date().getFullYear()),current=ser.filter(x=>x.month.startsWith(cy));
    const labels=[...current.map(x=>x.month),...future],actual=[...current.map(x=>x.value),...Array(h).fill(null)],forecast=[...Array(Math.max(0,current.length-1)).fill(null)];if(current.length)forecast.push(anchor?anchor.value:current.at(-1).value);pred.forEach(v=>forecast.push(v));
    const accuracy=Number.isFinite(best.mape)?Math.max(0,100-best.mape):null;
    status.textContent=`${anchor?'Market-anchored • ':''}${best.name} • ${accuracy===null?'Validation unavailable':`Historical backtest ${accuracy.toFixed(1)}%`}${picked.relaxed.length?' • refinements relaxed':''}`;status.className=accuracy!==null&&accuracy>=95?'status ok':'status warn';
    note.textContent=anchor?`Latest ${anchor.market} market indication (${anchor.date}: ₹${anchor.value.toFixed(2)}/kg) is used only as a clearly labelled starting anchor. ${picked.scope==='Core product identity'?'Exact location/specification filters did not contain enough monthly history, so the model used the core product identity series. ':''}Historical backtest accuracy does not validate the market anchor.`:`Model uses ${picked.scope.toLowerCase()} and only verified historical records. ${picked.relaxed.length?`The following refinements were relaxed because they did not contain 6 monthly points: ${picked.relaxed.join(', ')}.`:''}`;
    if(!window.Chart)return;
    s.charts.forecast=new Chart($('forecast-chart'),{type:'line',data:{labels,datasets:[{label:'Historical ₹/kg',data:actual,borderWidth:2,pointRadius:3,tension:.25},{label:anchor?'Market-Anchored Forecast ₹/kg':'Forecast ₹/kg',data:forecast,borderWidth:2,borderDash:[7,4],pointRadius:3,tension:.25}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{boxWidth:10,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ₹${Number(c.parsed.y).toFixed(2)}/kg`}}},scales:{y:{beginAtZero:false,title:{display:true,text:'₹ / kg'}}}}});
  }
  function loadEnhancements(){['/filter-stability.js','/pagination.js'].forEach(src=>{if(!document.querySelector(`script[src="${src}"]`)){const x=document.createElement('script');x.src=src;document.body.appendChild(x)}})}
  function boot(){window.TIP.forecastHorizon=3;loadEnhancements();document.querySelectorAll('.forecast-option').forEach(b=>b.addEventListener('click',()=>{window.TIP.forecastHorizon=Number(b.dataset.h);render()}));window.addEventListener('tip:data-updated',render);window.addEventListener('tip:filters-updated',render);render()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
