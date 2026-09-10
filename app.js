/* Main application controller: navigation, data loading, filters, analytics, exports and operations import. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { records: [], market: [], operations: [], charts: {}, coverage: {}, loading: false };
  const filters = [
    ['state','State','All States','state'],['district','District / Region','All Districts / Regions','district'],
    ['centre','Centre / Region','All Centres / Regions','centre'],['fiber','Fiber','All Fibers','fiber'],
    ['product','Yarn Category','All Yarn Categories','product'],['yarn_type','Yarn Type','All Yarn Types','yarn_type'],
    ['spinning','Spinning','All Spinning Types','spinning'],['count','Count','All Counts','count'],
    ['blend','Blend','All Blends','blend'],['yarn_name','Yarn Name','All Yarn Names','yarn_name'],
    ['year','Year','All Years','year'],['month','Month','All Months','month']
  ];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
  const money = v => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const unique = a => [...new Set(a.filter(v => v !== undefined && v !== null && String(v) !== ''))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
  const toast = message => { const t=$('toast'); t.textContent=message; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),2600); };

  function normalizeRecord(r){
    const x={...r}; x.product=x.product||'Yarn';
    const raw=[x.yarn_type,x.blend,x.yarn_name,x.product].filter(Boolean).join(' ').toUpperCase();
    if(!x.yarn_type || x.yarn_type==='Cotton Yarn'){
      if(/COMBED|\bCBD\b/.test(raw)) x.yarn_type='Combed Yarn';
      else if(/CARDED|\bKARDED\b|\bKD\b/.test(raw)) x.yarn_type='Carded Yarn';
      else if(/HOSIERY/.test(raw)) x.yarn_type='Hosiery Yarn';
      else x.yarn_type=x.product;
    }
    x.year=x.year??Number(String(x.date||'').slice(0,4)); x.month=x.month??Number(String(x.date||'').slice(5,7));
    x.yarn_category=x.product;
    return x;
  }

  function buildFilters(){
    $('filters').innerHTML=filters.map(([id,label,all])=>`<div class="filter"><label>${label}</label><select id="${id}"><option value="">${all}</option></select></div>`).join('');
    filters.forEach(([id])=>$(id).addEventListener('change',()=>{populateFilters();renderAll();}));
  }
  function selected(id){ return $(id)?.value || ''; }
  function rowsExcept(skip){
    return state.records.filter(r=>filters.every(([id,, ,key])=>id===skip || !selected(id) || String(r[key])===String(selected(id))));
  }
  function filtered(){
    return state.records.filter(r=>filters.every(([id,, ,key])=>!selected(id)||String(r[key])===String(selected(id)))).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }
  function populateFilters(){
    filters.forEach(([id,,all,key])=>{
      const e=$(id); if(!e)return; const old=e.value; const vals=unique(rowsExcept(id).map(r=>r[key]));
      e.innerHTML=`<option value="">${all}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
      if(vals.some(v=>String(v)===String(old))) e.value=old;
    });
  }
  function monthly(rows){
    const m={}; rows.forEach(r=>{const k=String(r.date||'').slice(0,7),v=num(r.price_inr_kg);if(/^\d{4}-\d{2}$/.test(k)&&v!==null)(m[k]??=[]).push(v)});
    return Object.keys(m).sort().map(k=>({month:k,value:mean(m[k])}));
  }
  function destroyChart(key){if(state.charts[key]){state.charts[key].destroy();state.charts[key]=null}}
  function makeChart(key,id,type,data,options={}){destroyChart(key);if(!window.Chart)return;state.charts[key]=new Chart($(id),{type,data,options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{boxWidth:10,usePointStyle:true}}},...options}})}

  function renderHistory(){
    const rows=filtered(), series=monthly(rows); $('history-count').textContent=`${rows.length.toLocaleString()} records`;
    $('filter-status').textContent=`${rows.length.toLocaleString()} verified observations • ${series.length} monthly points`;
    const labels=series.map(x=>x.month), data=series.map(x=>x.value);
    makeChart('history','history-chart','line',{labels,datasets:[{label:'Monthly average ₹/kg',data,tension:.28,pointRadius:2,fill:true,borderWidth:2}]},{scales:{y:{beginAtZero:false,title:{display:true,text:'₹ / kg'}}}});
    $('history-body').innerHTML=rows.length?rows.slice().reverse().map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.state||'—')}</td><td>${esc(r.district||'—')}</td><td>${esc(r.centre||'—')}</td><td>${esc(r.fiber||'—')}</td><td>${esc(r.product||'—')}</td><td>${esc(r.yarn_type||'—')}</td><td>${esc(r.count||'—')}</td><td>${esc(r.spinning||'—')}</td><td>${esc(r.blend||'—')}</td><td>${esc(r.yarn_name||r.product||'—')}</td><td>${money(num(r.price_inr_kg))}</td><td><span class="pill ${String(r.source_short||'').toLowerCase()==='ntc'?'indigo':''}">${esc(r.source_short||r.source||'SOURCE')}</span></td></tr>`).join(''):'<tr><td colspan="13" class="empty"><strong>No verified observations match the active filters.</strong><small>Broaden the selection. The platform does not invent or copy-forward missing prices.</small></td></tr>';
  }

  function renderOverview(){
    const rows=filtered(), nums=rows.map(r=>num(r.price_inr_kg)).filter(v=>v!==null), series=monthly(rows);
    const latest=rows.at(-1), latestVal=latest?num(latest.price_inr_kg):null;
    $('kpi-records').textContent=rows.length.toLocaleString(); $('kpi-records-meta').textContent=state.records.length?`of ${state.records.length.toLocaleString()} loaded records`:'';
    $('kpi-average').textContent=money(mean(nums)); $('kpi-latest').textContent=money(latestVal); $('kpi-latest-meta').textContent=latest?`${latest.date} • ${latest.source_short||latest.source||'source'}`:'No observation';
    const market=latestMarketForSelection(); $('kpi-market').textContent=market?money((market.price_min_inr_kg+market.price_max_inr_kg)/2):'—'; $('kpi-market-meta').textContent=market?`${market.market} • ${market.date}`:'No matching market indicator';
    $('overview-series').textContent=rows.length?`${rows.length.toLocaleString()} records`:'No data';
    const labels=series.map(x=>x.month),data=series.map(x=>x.value); makeChart('overview','overview-chart','line',{labels,datasets:[{label:'Monthly average ₹/kg',data,tension:.28,pointRadius:2,fill:true,borderWidth:2}]},{plugins:{legend:{display:false}},scales:{y:{beginAtZero:false,title:{display:true,text:'₹ / kg'}}}});
    const first=series[0]?.value,last=series.at(-1)?.value,change=first&&last?((last-first)/first)*100:null;
    $('insights-list').innerHTML=[
      ['Price direction',change===null?'Insufficient history':`${change>=0?'+':''}${change.toFixed(1)}% from first to latest month`,change===null?'neutral':change>=0?'up':'down'],
      ['Latest observation',latest?`${latest.date} • ${latest.yarn_type||latest.product||'Yarn'}`:'No matching record','neutral'],
      ['Monthly coverage',`${series.length} distinct months`,'neutral'],
      ['Market separation',market?'Market indicator available':'No matching published market indicator',market?'up':'neutral']
    ].map(([a,b,c])=>`<div class="metric-row"><span>${esc(a)}</span><b class="${c}">${esc(b)}</b></div>`).join('');
    renderCoverage();
  }
  function renderCoverage(){
    const c=state.coverage||{}, sourceCounts={}; state.records.forEach(r=>sourceCounts[r.source_short||r.source||'Unknown']=(sourceCounts[r.source_short||r.source||'Unknown']||0)+1);
    $('coverage-summary').innerHTML=[...Object.entries(sourceCounts)].sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<div class="metric-row"><span>${esc(s)}</span><b>${n.toLocaleString()}</b></div>`).join('')||'<div class="empty">No source records loaded.</div>';
  }
  function latestMarketForSelection(){
    let rows=state.market.filter(r=>!selected('fiber')||String(r.fiber).toLowerCase()===selected('fiber').toLowerCase()).filter(r=>!selected('product')||String(r.product).toLowerCase()===selected('product').toLowerCase()).filter(r=>!selected('yarn_type')||String(r.yarn_type).toLowerCase()===selected('yarn_type').toLowerCase()).filter(r=>!selected('count')||String(r.count).toLowerCase()===selected('count').toLowerCase()).filter(r=>!$('market-filter')?.value||String(r.market).toLowerCase()===$('market-filter').value.toLowerCase());
    const latest=[...new Set(rows.map(r=>r.date).filter(Boolean))].sort().at(-1); return latest?rows.find(r=>r.date===latest):null;
  }
  function renderMarket(){
    const markets=unique(state.market.map(r=>r.market)); const e=$('market-filter'),old=e.value; e.innerHTML='<option value="">All Markets</option>'+markets.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(markets.includes(old))e.value=old;
    let rows=state.market.filter(r=>!selected('fiber')||String(r.fiber).toLowerCase()===selected('fiber').toLowerCase()).filter(r=>!selected('product')||String(r.product).toLowerCase()===selected('product').toLowerCase()).filter(r=>!selected('yarn_type')||String(r.yarn_type).toLowerCase()===selected('yarn_type').toLowerCase()).filter(r=>!selected('count')||String(r.count).toLowerCase()===selected('count').toLowerCase()).filter(r=>!selected('market-filter')||String(r.market).toLowerCase()===selected('market-filter').toLowerCase());
    const latest=[...new Set(rows.map(r=>r.date).filter(Boolean))].sort().at(-1); rows=latest?rows.filter(r=>r.date===latest):[];
    $('live-market-body').innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.market)}</td><td>${esc(r.fiber)}</td><td>${esc(r.product||'—')}</td><td>${esc(r.yarn_type||'—')}</td><td>${esc(r.count||'—')}</td><td>${money(num(r.price_min_inr_kg))} – ${money(num(r.price_max_inr_kg))}</td><td>${r.gst_included===false?'Extra':r.gst_included===true?'Included':'Not stated'}</td><td><a class="source-link" href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.source)}</a></td></tr>`).join(''):'<tr><td colspan="9" class="empty"><strong>No matching published market indication.</strong><small>Market reports are separate from official historical observations.</small></td></tr>';
  }
  function renderAnalytics(){
    const rows=filtered(); const countBy=k=>Object.entries(rows.reduce((m,r)=>(m[r[k]||'Not specified']=(m[r[k]||'Not specified']||0)+1,m),{})).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const chart=(key,id,k,label)=>{const d=countBy(k);makeChart(key,id,'doughnut',{labels:d.map(x=>x[0]),datasets:[{data:d.map(x=>x[1])}]},{plugins:{legend:{position:'bottom',labels:{font:{size:10}}}}})};
    chart('source','source-chart','source_short','Source'); chart('fiber','fiber-chart','fiber','Fiber'); chart('product','product-chart','product','Product');
    const nums=rows.map(r=>num(r.price_inr_kg)).filter(v=>v!==null), s=monthly(rows), top=rows.length?Object.entries(rows.reduce((m,r)=>(m[r.yarn_type||r.product]=(m[r.yarn_type||r.product]||0)+1,m),{})).sort((a,b)=>b[1]-a[1])[0]:null;
    $('analytics-insights').innerHTML=[['Observations',rows.length.toLocaleString()],['Average price',money(mean(nums))],['Monthly points',String(s.length)],['Most represented yarn type',top?`${top[0]} (${top[1]})`:'—']].map(([a,b])=>`<div class="metric-row"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('');
  }
  function renderQuality(){
    const rows=state.records, dates=unique(rows.map(r=>r.date)), sources=unique(rows.map(r=>r.source_short||r.source)); const missingDate=rows.filter(r=>!r.date).length,missingPrice=rows.filter(r=>num(r.price_inr_kg)===null).length,dupes=rows.length-new Set(rows.map(r=>JSON.stringify([r.date,r.state,r.district,r.centre,r.product,r.yarn_type,r.count,r.price_inr_kg]))).size;
    $('dq-total').textContent=rows.length.toLocaleString();$('dq-dates').textContent=dates.length.toLocaleString();$('dq-sources').textContent=sources.length.toLocaleString();
    $('quality-list').innerHTML=[['Missing dates',missingDate,missingDate?'warn':'ok'],['Missing prices',missingPrice,missingPrice?'warn':'ok'],['Exact duplicate rows',dupes,dupes?'warn':'ok'],['Records from 2021 onward',rows.filter(r=>String(r.date)>='2021-01-01').length,'ok']].map(([a,b,c])=>`<div class="metric-row"><span>${esc(a)}</span><b class="${c}">${Number(b).toLocaleString()}</b></div>`).join('');
  }
  function renderOperations(){
    const rows=state.operations;if(!rows.length)return; const head=rows.filter(r=>String(r.status||'').toLowerCase()==='active' || r.active===true).length;
    const prod=rows.filter(r=>r.quantity!=null).reduce((s,r)=>s+(Number(r.quantity)||0),0),inv=rows.filter(r=>r.inventory_quantity!=null).reduce((s,r)=>s+(Number(r.inventory_quantity)||0),0),demand=rows.filter(r=>r.demand_qty!=null).reduce((s,r)=>s+(Number(r.demand_qty)||0),0),bom=rows.filter(r=>r.bom_stock_qty!=null).reduce((s,r)=>s+(Number(r.bom_stock_qty)||0),0);
    if(head)$('op-headcount').textContent=head.toLocaleString(); if(prod)$('op-production').textContent=prod.toLocaleString(); if(inv)$('op-inventory').textContent=inv.toLocaleString(); if(demand)$('op-sales').textContent=bom?`${((bom/demand)*100).toFixed(1)}% BOM coverage`:'Demand loaded';
    $('operations-message').innerHTML=`<div class="notice">Imported ${rows.length.toLocaleString()} operation rows for this browser session. Metrics above use only supplied values.</div>`;
  }
  function parseCSV(text){
    const out=[], rows=[]; let row=[],cell='',quote=false;
    for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quote&&n==='"'){cell+='"';i++;continue}if(c==='"'){quote=!quote;continue}if(c===','&&!quote){row.push(cell);cell='';continue}if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';continue}cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}
    if(!rows.length)return out; const headers=rows.shift().map(h=>h.trim().toLowerCase().replace(/\s+/g,'_')); rows.forEach(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]?.trim()??'');out.push(o)});return out;
  }
  function download(name,text,type='text/plain'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function csv(rows){if(!rows.length)return '';const keys=unique(rows.flatMap(r=>Object.keys(r)));return [keys.join(','),...rows.map(r=>keys.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n')}
  function reportObject(){const rows=filtered(), nums=rows.map(r=>num(r.price_inr_kg)).filter(v=>v!==null), series=monthly(rows);return {generated_at:new Date().toISOString(),filters:Object.fromEntries(filters.map(([id,label])=>[label,selected(id)||'All'])),summary:{records:rows.length,average_price_inr_kg:mean(nums),monthly_points:series.length,latest:rows.at(-1)||null},data_quality:{loaded_records:state.records.length,sources:unique(state.records.map(r=>r.source_short||r.source))}}}
  function renderReport(){const o=reportObject();$('report-content').innerHTML=`<div class="grid layout-3"><div class="quality-item"><b>${o.summary.records.toLocaleString()}</b><span>Filtered records</span></div><div class="quality-item"><b>${money(o.summary.average_price_inr_kg)}</b><span>Average price</span></div><div class="quality-item"><b>${o.summary.monthly_points}</b><span>Monthly points</span></div></div><div class="section-space notice">Generated ${new Date(o.generated_at).toLocaleString('en-IN')}. Report is derived from the current filters and loaded source records.</div>`}
  async function loadData(){
    if(state.loading)return;state.loading=true;$('system-status').textContent='● Loading data';$('system-status').className='pill amber';
    try{const [yr,mr,op]=await Promise.all([fetch('/api/yarn',{cache:'no-store'}),fetch('/api/live-yarn',{cache:'no-store'}),fetch('/api/operations',{cache:'no-store'})]);if(!yr.ok)throw new Error('Official yarn API failed');const y=await yr.json(),m=mr.ok?await mr.json():{records:[]},o=op.ok?await op.json():{records:[]};state.records=(y.records||[]).filter(r=>r.date&&r.date>='2021-01-01').map(normalizeRecord);state.market=m.records||[];state.operations=o.records||[];state.coverage=y.coverage||{};populateFilters();renderAll();$('system-status').textContent='● Data loaded';$('system-status').className='pill green';toast(`Loaded ${state.records.toLocaleString?.()||state.records.length} verified yarn records`)}catch(e){$('system-status').textContent='● Data error';$('system-status').className='pill amber';toast(e.message);console.error(e)}finally{state.loading=false}}
  function renderAll(){renderOverview();renderHistory();renderMarket();renderAnalytics();renderQuality();renderOperations();renderReport();window.dispatchEvent(new CustomEvent('tip:data-updated',{detail:{records:state.records,market:state.market}}))}
  function nav(){document.querySelectorAll('.nav button[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(`view-${b.dataset.view}`).classList.add('active');$('top-title').textContent=b.textContent.trim();$('top-subtitle').textContent=({overview:'Enterprise view of textile market and manufacturing intelligence',yarn:'Verified yarn history, current market indications and forecast',operations:'Production, inventory, workforce and sales-vs-BOM readiness',analytics:'Interactive source, fiber and product analytics', 'data-quality':'Data validation, quality controls and lineage',reports:'Auditable exports and executive report generation',methodology:'Source hierarchy and forecasting governance'})[b.dataset.view]||'';$('sidebar').classList.remove('open') }))}
  function wire(){
    nav();buildFilters();
    $('mobile-menu').onclick=()=>$('sidebar').classList.toggle('open');$('refresh-all').onclick=loadData;$('refresh-official').onclick=loadData;
    $('clear-filters').onclick=()=>{filters.forEach(([id])=>$(id).value='');populateFilters();renderAll()}; $('market-filter').onchange=()=>{renderMarket();renderOverview();window.dispatchEvent(new CustomEvent('tip:filters-updated'))};
    $('operations-file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;state.operations=parseCSV(await f.text());renderOperations();toast(`Imported ${state.operations.length} operation rows`) };
    $('clear-operations').onclick=()=>{state.operations=[];['op-headcount','op-production','op-inventory','op-sales'].forEach(id=>$(id).textContent='Not connected');$('operations-message').innerHTML='<div class="empty"><strong>ERP / MES / WMS connector not configured</strong><small>Import a compatible CSV or populate data/operations.json through your ETL pipeline.</small></div>';toast('Imported operations cleared')};
    $('download-schema').onclick=()=>download('operations-schema.json',JSON.stringify({employees:['employee_id','status','department','production_flag'],production:['date','product','quantity','unit','line'],inventory:['sku','category','inventory_quantity','unit','value'],sales_bom:['order_id','product','demand_qty','bom_stock_qty']},null,2),'application/json');
    $('export-analytics').onclick=()=>download('textile-filtered-analytics.csv',csv(filtered()),'text/csv');$('report-csv').onclick=()=>download('textile-intelligence-report.csv',csv(filtered()),'text/csv');$('report-json').onclick=()=>download('textile-intelligence-report.json',JSON.stringify(reportObject(),null,2),'application/json');$('report-print').onclick=()=>window.print();
  }
  window.TIP={state,filters,selected,filtered,monthly,renderAll};
  document.addEventListener('DOMContentLoaded',()=>{wire();loadData()});
})();
