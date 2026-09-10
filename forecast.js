/* Forecast chart renderer. The statistical engine runs server-side in forecast.py. */
(() => {
'use strict';const $=id=>document.getElementById(id);window.TIP_H=3;
function draw(d){const c=window.TIP?.charts?.forecast;if(c)c.destroy();const labels=[...d.history.map(x=>x.month),...d.forecast.map(x=>x.month)],hist=[...d.history.map(x=>x.price),...Array(d.forecast.length).fill(null)],pred=[...Array(Math.max(0,d.history.length-1)).fill(null),d.history.at(-1).price,...d.forecast.map(x=>x.price)];window.TIP.charts.forecast=new Chart($('forecast-chart'),{type:'line',data:{labels,datasets:[{label:'Historical ₹/kg',data:hist,borderWidth:2,pointRadius:2,tension:.25},{label:'Forecast ₹/kg',data:pred,borderWidth:2,borderDash:[7,4],pointRadius:3,tension:.25}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{boxWidth:10,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ₹${Number(c.parsed.y).toFixed(2)}/kg`}}},scales:{y:{beginAtZero:false,title:{display:true,text:'₹ / kg'}}}}});}
window.addEventListener('tip:forecast-result',e=>{if(e.detail?.ok)draw(e.detail);});
})();
