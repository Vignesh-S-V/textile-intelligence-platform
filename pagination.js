/* Client-side pagination: the Yarn Intelligence table shows 10 rows per page. */
(() => {
  const PAGE_SIZE = 10;
  let page = 1;
  const $ = id => document.getElementById(id);
  function render() {
    const body=$('history-body'), box=$('history-pagination');
    if(!body||!box)return;
    const rows=[...body.querySelectorAll('tr')];
    if(!rows.length||rows[0].querySelector('.empty')){box.innerHTML='';box.classList.add('hidden');return;}
    const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)); page=Math.min(Math.max(1,page),pages);
    rows.forEach((row,i)=>row.style.display=i>=(page-1)*PAGE_SIZE&&i<page*PAGE_SIZE?'':'none');
    box.classList.remove('hidden');
    box.innerHTML=`<span class="status">Showing ${((page-1)*PAGE_SIZE)+1}–${Math.min(page*PAGE_SIZE,rows.length)} of ${rows.length.toLocaleString()}</span><div class="toolbar"><button class="btn" data-page="prev" ${page===1?'disabled':''}>‹ Previous</button><span class="pill indigo">Page ${page} / ${pages}</span><button class="btn" data-page="next" ${page===pages?'disabled':''}>Next ›</button></div>`;
    box.querySelector('[data-page="prev"]')?.addEventListener('click',()=>{page--;render()});
    box.querySelector('[data-page="next"]')?.addEventListener('click',()=>{page++;render()});
  }
  function install(){
    const body=$('history-body'); if(!body||$('history-pagination'))return;
    const wrap=body.closest('.table-wrap'),box=document.createElement('div'); box.id='history-pagination';box.className='toolbar';box.style.cssText='justify-content:space-between;margin-top:10px';wrap?.after(box);
    new MutationObserver(()=>{page=1;render()}).observe(body,{childList:true}); render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
