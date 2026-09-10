/* Keeps user-selected filter values stable while the cascading option lists refresh. */
(() => {
  let snapshot = null;
  const ids = ['state','district','centre','fiber','product','yarn_type','spinning','count','blend','yarn_name','year','month'];
  const capture = () => { snapshot = Object.fromEntries(ids.map(id => [id, document.getElementById(id)?.value || ''])); };
  const restore = () => {
    if (!snapshot) return;
    let changed = false;
    ids.forEach(id => { const el=document.getElementById(id); if(el && snapshot[id] && [...el.options].some(o=>o.value===snapshot[id]) && el.value!==snapshot[id]) { el.value=snapshot[id]; changed=true; } });
    snapshot = null;
    if (changed && window.TIP?.renderAll) window.TIP.renderAll();
  };
  document.addEventListener('change', capture, true);
  document.addEventListener('change', restore, false);
})();
