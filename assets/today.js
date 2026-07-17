(() => {
  const leads = JSON.parse(localStorage.getItem('acePoolLeads') || '[]');
  const today = new Date().toISOString().slice(0,10), rank={High:0,Medium:1,Low:2};
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const open = leads.filter(l=>!['Won','Lost','Onboarded'].includes(l.status));
  const work = open.filter(l=>!l.nextDate||l.nextDate<=today).sort((a,b)=>(a.nextDate||'').localeCompare(b.nextDate||'')||(rank[a.priority]-rank[b.priority]));
  document.getElementById('dueCount').textContent=work.filter(l=>l.nextDate===today).length;
  document.getElementById('overdueCount').textContent=work.filter(l=>l.nextDate&&l.nextDate<today).length;
  document.getElementById('hotCount').textContent=open.filter(l=>l.priority==='High').length;
  document.getElementById('reviewCount').textContent=open.filter(l=>['Review offered','Review booked','Review completed'].includes(l.status)).length;
  document.getElementById('todayList').innerHTML=work.length?work.map(l=>`<article class="today-card ${l.nextDate&&l.nextDate<today?'overdue':''}"><div><div class="eyebrow">${esc(l.priority)} · ${esc(l.status)}</div><h3>${esc(l.name)}</h3><p><strong>Why now:</strong> ${esc(l.whyNow||l.notes||l.source)}</p><p><strong>Next:</strong> ${esc(l.nextAction||'Make contact and offer the Pool Review')}</p><div class="actions"><a class="btn btn-dark" href="dashboard.html?lead=${encodeURIComponent(l.id)}">Open sales brief</a>${l.phone?`<a class="btn btn-aqua" href="tel:${esc(l.phone)}">Call</a>`:''}</div></div><strong>${esc(l.nextDate||'No date')}</strong></article>`).join(''):`<div class="empty"><h2>Nothing is overdue.</h2><p>Open Best Leads and choose the next high-priority prospect.</p><a class="btn btn-primary" href="best-leads.html">Open Best Leads</a></div>`;
})();
import('./cloud-sync.js');
