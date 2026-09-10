(()=>{
  const state={horizon:3,chart:null,ready:false};
  const $=id=>document.getElementById(id);
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
  const clamp=(v,lo=0)=>Math.max(lo,v);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const mape=(actual,pred)=>{const e=[];for(let i=0;i<actual.length;i++)if(Number.isFinite(actual[i])&&actual[i]!==0&&Number.isFinite(pred[i]))e.push(Math.abs((actual[i]-pred[i])/actual[i])*100);return e.length?mean(e):Infinity};
  const monthlySeries=rows=>{const m={};rows.forEach(r=>{const k=String(r.date||'').slice(0,7),v=Number(r.price_inr_kg);if(/^\d{4}-\d{2}$/.test(k)&&Number.isFinite(v))(m[k]??=[]).push(v)});return Object.keys(m).sort().map(k=>({month:k,value:mean(m[k])}));};
  const linear=(y,h)=>{const n=y.length;if(n<2)return Array(h).fill(y.at(-1));const xb=(n-1)/2,yb=mean(y),b=y.reduce((s,v,i)=>s+(i-xb)*(v-yb),0)/(n*(n*n-1)/12),a=yb-b*xb;return Array.from({length:h},(_,j)=>clamp(a+b*(n+j)))};
  const drift=(y,h)=>{const n=y.length;if(n<2)return Array(h).fill(y.at(-1));const d=(y[n-1]-y[0])/(n-1);return Array.from({length:h},(_,j)=>clamp(y[n-1]+d*(j+1)))};
  const recentMean=(y,h)=>Array(h).fill(mean(y.slice(-Math.min(6,y.length))));
  const holt=(y,h)=>{if(y.length<4)return drift(y,h);let l=y[0],b=y[1]-y[0],a=.35,g=.18;for(let i=1;i<y.length;i++){const old=l;l=a*y[i]+(1-a)*(l+b);b=g*(l-old)+(1-g)*b}return Array.from({length:h},(_,j)=>clamp(l+(j+1)*b))};
  const damped=(y,h)=>{if(y.length<4)return drift(y,h);let l=y[0],b=y[1]-y[0],a=.3,g=.15,phi=.82;for(let i=1;i<y.length;i++){const old=l;l=a*y[i]+(1-a)*(l+phi*b);b=g*(l-old)+(1-g)*phi*b}return Array.from({length:h},(_,j)=>clamp(l+b*(phi*(1-Math.pow(phi,j+1))/(1-phi))))};
  const seasonal=(y,h)=>{if(y.length<24)return null;return Array.from({length:h},(_,j)=>clamp(y[y.length-12+(j%12)]));};
  const seasonalTrend=(y,h)=>{const s=seasonal(y,h);if(!s)return null;const base=holt(y,h);return s.map((v,i)=>clamp(.65*v+.35*base[i]));};
  const candidates=(y,h)=>{const c=[['Adaptive Holt',holt],['Damped trend',damped],['Linear trend',linear],['Drift',drift],['Recent mean',recentMean]];const s=seasonal(y,h),st=seasonalTrend(y,h);if(s)c.push(['Seasonal naive',()=>s]);if(st)c.push(['Seasonal-trend ensemble',()=>st]);return c};
  const backtest=(y,fn,h)=>{const minTrain=Math.max(6,Math.min(24,Math.floor(y.length*.55)));const actual=[],pred=[];for(let end=minTrain;end<y.length;end+=Math.max(1,Math.min(h,3))){const take=Math.min(h,y.length-end),p=fn(y.slice(0,end),take);actual.push(...y.slice(end,end+take));pred.push(...p.slice(0,take))}return mape(actual,pred)};
  const choose=(y,h)=>{let best=null;for(const [name,fn] of candidates(y,h)){const score=backtest(y,fn,h);if(score<Infinity&&(!best||score<best.mape))best={name,fn,mape:score}}return best||{name:'Recent mean',fn:recentMean,mape:Infinity};};
  const futureMonth=k=>{const [y,m]=k.split('-').map(Number);const d=new Date(Date.UTC(y,m-1,1));d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,7)};
  const requiredFilters=['fiber','yarn_type','count'];
  const filterContext=()=>requiredFilters.map(id=>({id,value:$(id)?.value||''}));
  const filterLabel=()=>filterContext().map(x=>x.value).filter(Boolean).join(' • ');

  async function buildMarket(){
    if($('live-market-card'))return;
    const anchor=document.querySelector('.chart');if(!anchor)return;
    const card=document.createElement('section');card.className='card';card.id='live-market-card';
    card.innerHTML='<div class="row"><h2>Latest Yarn Market Indication</h2><div id="live-market-status" class="status">Loading market reports...</div></div><div class="note">🟡 MARKET INDICATOR — public trade/news reports only. This is not a real-time tradable quote and is never substituted for missing data.</div><div class="tablewrap"><table class="table"><thead><tr><th>Published</th><th>Market</th><th>Fiber</th><th>Yarn Type</th><th>Count</th><th>Price ₹/kg</th><th>GST</th><th>Source</th></tr></thead><tbody id="live-market-body"><tr><td colspan="8" class="empty">Loading...</td></tr></tbody></table></div>';
    anchor.parentNode.insertBefore(card,anchor.nextSibling);
    try{
      const q=await fetch('/api/live-yarn?refresh='+Date.now(),{cache:'no-store'}),j=await q.json();
      if(!q.ok)throw Error(j.error||'API error');
      const rows=Array.isArray(j.records)?j.records:[], latest=j.latest_source_record;
      const latestRows=latest?rows.filter(r=>r.date===latest):[];
      const status=$('live-market-status');
      if(!latestRows.length){status.textContent='No published market-report price available';status.className='status warn';$('live-market-body').innerHTML='<tr><td colspan="8" class="empty">No verified market-report yarn price is currently available. No value has been invented or copied forward.</td></tr>';return;}
      status.textContent=`Latest source report: ${latest} • ${latestRows.length} observations`;
      status.className='status ok';
      $('live-market-body').innerHTML=latestRows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.market)}</td><td>${esc(r.fiber)}</td><td>${esc(r.yarn_type)}</td><td>${esc(r.count)}</td><td>₹${Number(r.price_min_inr_kg).toFixed(2)} – ₹${Number(r.price_max_inr_kg).toFixed(2)}</td><td>${r.gst_included===false?'Extra':r.gst_included===true?'Included':'Not stated'}</td><td><a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.source)}</a></td></tr>`).join('');
    }catch(e){
      $('live-market-status').textContent='Unable to load market reports: '+e.message;$('live-market-status').className='status err';
      $('live-market-body').innerHTML='<tr><td colspan="8" class="empty">Market-report data could not be loaded.</td></tr>';
    }
  }

  function build(){if($('forecast-card'))return;const hist=document.querySelector('.chart');if(!hist)return;const card=document.createElement('section');card.className='card';card.id='forecast-card';card.innerHTML=`<div class="row"><h2>Yarn Price Forecast</h2><div id="forecast-status" class="status">Select forecast period</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px"><button type="button" class="refresh forecast-option" data-h="3">3 Months</button><button type="button" class="refresh forecast-option" data-h="6">6 Months</button><button type="button" class="refresh forecast-option" data-h="12">1 Year</button></div><div class="chart"><canvas id="forecast-chart"></canvas></div><div id="forecast-note" class="note"></div></div>`;hist.parentNode.insertBefore(card,hist.nextSibling);card.querySelectorAll('.forecast-option').forEach(b=>b.onclick=()=>{state.horizon=Number(b.dataset.h);render()});state.ready=true;render()}

  function render(){
    if(!state.ready||typeof filtered!=='function')return;
    const status=$('forecast-status'),note=$('forecast-note');
    if(state.chart){state.chart.destroy();state.chart=null}
    document.querySelectorAll('.forecast-option').forEach(b=>b.style.opacity=Number(b.dataset.h)===state.horizon?'1':'.65');

    const missing=filterContext().filter(x=>!x.value).map(x=>x.id);
    if(missing.length){
      status.textContent='Select Fiber + Yarn Type + Count for a comparable forecast';
      status.className='status warn';
      note.textContent='The previous chart was misleading because the default “All” selection averaged different yarns, counts and blends together. A ₹/kg forecast must be built for one comparable product definition, not all yarn records combined.';
      return;
    }

    const rows=filtered(),series=monthlySeries(rows);
    if(series.length<6){
      status.textContent='Insufficient verified monthly history for this exact product';
      status.className='status warn';
      note.textContent=`Selected series: ${filterLabel()}. Forecast withheld because fewer than 6 monthly observations are available for this exact filter selection. No current market price is copied into the historical series.`;
      return;
    }

    const currentYear=String(new Date().getFullYear()),current=series.filter(x=>x.month.startsWith(currentYear));
    const y=series.map(x=>x.value),chosen=choose(y,state.horizon),pred=chosen.fn(y,state.horizon);
    let last=series.at(-1).month;const future=[];for(let i=0;i<state.horizon;i++){last=futureMonth(last);future.push(last)}
    const labels=[...current.map(x=>x.month),...future],actual=[...current.map(x=>x.value),...Array(state.horizon).fill(null)],forecast=[...Array(Math.max(0,current.length-1)).fill(null)];if(current.length)forecast.push(current.at(-1).value);pred.forEach(v=>forecast.push(v));
    const accuracy=Number.isFinite(chosen.mape)?Math.max(0,100-chosen.mape):null;
    status.textContent=`${chosen.name} • ${accuracy===null?'Validation unavailable':`Backtested accuracy: ${accuracy.toFixed(1)}%`}`;
    status.className=accuracy!==null&&accuracy>=95?'status ok':'status warn';
    note.textContent=`Forecast for ${filterLabel()} using verified historical records only. The latest public market-indication table is intentionally NOT mixed into this model because its Tiruppur/Mumbai trade-report prices are not automatically comparable with every historical TXC/NTC observation. Current market reports should be used as a separate market indicator. 95% is a validation target, not a guarantee.`;
    state.chart=new Chart($('forecast-chart'),{type:'line',data:{labels,datasets:[{label:'Current Year Historical Average ₹/kg',data:actual,borderWidth:2,pointRadius:3,tension:.25},{label:'Forecast ₹/kg',data:forecast,borderWidth:2,borderDash:[7,4],pointRadius:3,tension:.25}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:{callbacks:{label:c=>`${c.dataset.label}: ₹${Number(c.parsed.y).toFixed(2)}/kg`}}},scales:{x:{ticks:{maxTicksLimit:18}},y:{title:{display:true,text:'Price (₹/kg)'},beginAtZero:false}}}});
  }

  document.addEventListener('change',e=>{if(e.target?.closest?.('#filters'))setTimeout(()=>{build();render()},0)});
  const boot=setInterval(()=>{if(typeof filtered==='function'&&document.querySelector('.chart')){clearInterval(boot);build();buildMarket()}},100);
})();