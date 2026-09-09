(()=>{
  const state={horizon:3,chart:null,ready:false};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=id=>document.getElementById(id);
  const monthlySeries=rows=>{
    const m={};
    rows.forEach(r=>{const k=String(r.date||'').slice(0,7),v=Number(r.price_inr_kg);if(/^\d{4}-\d{2}$/.test(k)&&Number.isFinite(v))(m[k]??=[]).push(v)});
    return Object.keys(m).sort().map(k=>({month:k,value:m[k].reduce((a,b)=>a+b,0)/m[k].length}));
  };
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
  const mape=(actual,pred)=>{const e=[];for(let i=0;i<actual.length;i++)if(Number.isFinite(actual[i])&&actual[i]!==0&&Number.isFinite(pred[i]))e.push(Math.abs((actual[i]-pred[i])/actual[i])*100);return e.length?mean(e):Infinity};
  const linearForecast=(y,h)=>{const n=y.length;if(n<2)return Array(h).fill(y.at(-1));const xbar=(n-1)/2,ybar=mean(y);let num=0,den=0;for(let i=0;i<n;i++){num+=(i-xbar)*(y[i]-ybar);den+=(i-xbar)**2}const b=den?num/den:0,a=ybar-b*xbar;return Array.from({length:h},(_,j)=>Math.max(0,a+b*(n+j)))};
  const driftForecast=(y,h)=>{const n=y.length;if(n<2)return Array(h).fill(y.at(-1));const d=(y[n-1]-y[0])/(n-1);return Array.from({length:h},(_,j)=>Math.max(0,y[n-1]+d*(j+1)))};
  const meanForecast=(y,h)=>Array(h).fill(mean(y.slice(-Math.min(6,y.length))));
  const holt=(y,h)=>{if(y.length<3)return driftForecast(y,h);let level=y[0],trend=y[1]-y[0],alpha=.45,beta=.25;for(let i=1;i<y.length;i++){const old=level;level=alpha*y[i]+(1-alpha)*(level+trend);trend=beta*(level-old)+(1-beta)*trend}return Array.from({length:h},(_,j)=>Math.max(0,level+(j+1)*trend))};
  const seasonal=(y,h)=>{if(y.length<24)return null;const out=[];for(let j=0;j<h;j++){const idx=y.length-12+(j%12);out.push(Math.max(0,y[idx]))}return out};
  const candidates=(y,h)=>{const c=[['Holt trend',holt],['Linear trend',linearForecast],['Drift',driftForecast],['Recent mean',meanForecast]];const s=seasonal(y,h);if(s)c.push(['Seasonal naive',()=>s]);return c};
  const backtest=(y,fn,h)=>{const minTrain=Math.max(6,Math.min(18,Math.floor(y.length*.55)));const actual=[],pred=[];for(let end=minTrain;end<y.length;end+=Math.max(1,h)){const train=y.slice(0,end),take=Math.min(h,y.length-end),p=fn(train,take);actual.push(...y.slice(end,end+take));pred.push(...p.slice(0,take))}return mape(actual,pred)};
  const choose=(y,h)=>{let best=null;for(const [name,fn] of candidates(y,h)){const score=backtest(y,fn,h);if(score<Infinity&&(!best||score<best.mape))best={name,fn,mape:score}}return best||{name:'Recent mean',fn:meanForecast,mape:Infinity};};
  const futureMonth=k=>{const [y,m]=k.split('-').map(Number);const d=new Date(Date.UTC(y,m-1,1));d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,7)};
  function build(){
    if($('forecast-card'))return;
    const hist=document.querySelector('.chart');if(!hist)return;
    const card=document.createElement('section');card.className='card';card.id='forecast-card';
    card.innerHTML=`<div class="row"><h2>Yarn Price Forecast</h2><div id="forecast-status" class="status">Select forecast period</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px"><button type="button" class="refresh forecast-option" data-h="3">3 Months</button><button type="button" class="refresh forecast-option" data-h="6">6 Months</button><button type="button" class="refresh forecast-option" data-h="12">1 Year</button></div><div class="chart"><canvas id="forecast-chart"></canvas></div><div id="forecast-note" class="note"></div>`;
    hist.parentNode.insertBefore(card,hist.nextSibling);
    card.querySelectorAll('.forecast-option').forEach(b=>b.onclick=()=>{state.horizon=Number(b.dataset.h);render()});
    state.ready=true;render();
  }
  function render(){
    if(!state.ready||typeof filtered!=='function')return;
    const rows=filtered(),series=monthlySeries(rows),status=$('forecast-status'),note=$('forecast-note');
    if(state.chart){state.chart.destroy();state.chart=null}
    const opts=document.querySelectorAll('.forecast-option');opts.forEach(b=>b.style.opacity=Number(b.dataset.h)===state.horizon?'1':'.65');
    if(series.length<6){status.textContent='Insufficient verified monthly history';status.className='status warn';note.textContent='Forecast is not generated for this filter because fewer than 6 monthly observations are available. This avoids presenting a fabricated forecast.';return}
    const y=series.map(x=>x.value),chosen=choose(y,state.horizon),pred=chosen.fn(y,state.horizon);let last=series.at(-1).month,labels=series.map(x=>x.month);for(let i=0;i<state.horizon;i++)labels.push(last=futureMonth(last));
    const all=series.map(x=>x.value).concat(pred),actual=series.map(x=>x.value),forecast=Array(series.length).fill(null);forecast[series.length-1]=actual.at(-1);pred.forEach(v=>forecast.push(v));
    const accuracy=Number.isFinite(chosen.mape)?Math.max(0,100-chosen.mape):null;
    status.textContent=`${chosen.name} • ${accuracy===null?'Backtest unavailable':`Backtested accuracy: ${accuracy.toFixed(1)}%`}`;status.className=accuracy!==null&&accuracy>=80?'status ok':'status warn';
    note.textContent=`Forecast uses only the currently filtered verified yarn records and monthly averages. Model selected by rolling historical backtesting; accuracy is validation-based, not a 100% guarantee. Forecast horizon: ${state.horizon===12?'1 year':state.horizon+' months'}.`;
    state.chart=new Chart($('forecast-chart'),{type:'line',data:{labels,datasets:[{label:'Historical Average ₹/kg',data:actual,borderWidth:2,pointRadius:2,tension:.25},{label:'Forecast ₹/kg',data:forecast,borderWidth:2,borderDash:[6,4],pointRadius:2,tension:.25}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{tooltip:{callbacks:{label:c=>`${c.dataset.label}: ₹${Number(c.parsed.y).toFixed(2)}/kg`}}},scales:{x:{ticks:{maxTicksLimit:18}},y:{title:{display:true,text:'Price (₹/kg)'},beginAtZero:false}}}});
  }
  document.addEventListener('change',e=>{if(e.target&&e.target.closest&&e.target.closest('#filters'))setTimeout(()=>{build();render()},0)});
  const boot=setInterval(()=>{if(typeof filtered==='function'&&document.querySelector('.chart')){clearInterval(boot);build()}},100);
})();