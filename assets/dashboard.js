(() => {
  const stages = ['New lead','Contacted','Qualified','Review offered','Review booked','Review completed','Quote sent','Follow-up due','Won','Lost','Onboarded'];
  const $ = id => document.getElementById(id);
  const rank = { High: 0, Medium: 1, Low: 2 };
  const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  let leads = JSON.parse(localStorage.getItem('acePoolLeads') || '[]');
  let activeId = null;

  if (!leads.length) {
    leads = [{ id: 1, name: 'Example prospect', postcode: 'CB23', phone: '', email: '', source: 'Example', status: 'New lead', priority: 'High', nextAction: 'Open the Lead Map and work the highest-scoring lead', nextDate: tomorrow(), notes: 'Example only', whyNow: 'Example only', pain: 'Example only', offer: 'Complimentary Pool Review', angle: 'Example only', history: '' }];
    save();
  }

  function save() { localStorage.setItem('acePoolLeads', JSON.stringify(leads)); }
  function escape(s = '') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function lead() { return leads.find(x => String(x.id) === String(activeId)); }

  function scripts(l) {
    const trigger = l.whyNow || 'a public signal connected with the property';
    const need = l.pain || 'pool safety, condition and running costs';
    const offer = l.offer || 'complimentary Pool Review';
    return {
      opening: l.angle || `Hello, I’m Alex from Ace Pools in Comberton. I’m speaking with pool owners locally because small servicing and equipment issues can become expensive or affect whether a pool is safe for family and guests. I’d like to offer a ${offer}—would that be useful?`,
      letter: `Hello, I’m Alex Craig from Ace Pools in Comberton. ${trigger} suggests this may be a useful time to review ${need}. We help pool owners keep their pool safe for family and guests, avoid preventable failures and reduce long-term running costs. I’d be happy to provide a ${offer}. There is no obligation; it simply gives you a clear picture of what is working, what needs attention and what could save money.`,
      followup: `Hello, it’s Alex from Ace Pools. I’m following up about the ${offer}. The purpose is to give you a practical view of safety, equipment condition and avoidable running costs before small issues become expensive. Would a short visit next week suit you?`
    };
  }

  function render() {
    const q = $('search').value.toLowerCase(), sf = $('statusFilter').value, pf = $('priorityFilter').value;
    const rows = leads.filter(l => (!q || `${l.name} ${l.postcode}`.toLowerCase().includes(q)) && (!sf || l.status === sf) && (!pf || l.priority === pf)).sort((a,b) => (rank[a.priority] - rank[b.priority]) || String(a.nextDate).localeCompare(String(b.nextDate)));
    $('leadRows').innerHTML = rows.map(l => `<tr><td class="priority ${l.priority.toLowerCase()}">${escape(l.priority)}</td><td><strong>${escape(l.name)}</strong><br><small>${escape(l.postcode || '')}</small></td><td>${escape(l.whyNow || l.notes || l.source)}</td><td>${escape(l.status)}</td><td>${escape(l.nextAction || '')}</td><td>${escape(l.nextDate || '')}</td><td><button class="btn btn-dark" data-work="${l.id}">Work deal</button></td></tr>`).join('') || '<tr><td colspan="7">No matching leads.</td></tr>';
    $('kpiNew').textContent = leads.filter(l => l.status === 'New lead').length;
    $('kpiReviews').textContent = leads.filter(l => l.status === 'Review booked').length;
    $('kpiQuotes').textContent = leads.filter(l => l.status === 'Quote sent').length;
    $('kpiWon').textContent = leads.filter(l => ['Won','Onboarded'].includes(l.status)).length;
    document.querySelectorAll('[data-work]').forEach(x => x.onclick = () => openDeal(x.dataset.work));
  }

  function showScript() {
    const l = lead(); if (!l) return;
    const type = $('scriptType').value;
    const labels = { opening: 'PHONE / DOORSTEP OPENING', letter: 'LETTER / EMAIL', followup: 'FOLLOW-UP MESSAGE' };
    $('scriptLabel').textContent = labels[type];
    $('dealScript').textContent = scripts(l)[type];
  }

  function openDeal(id) {
    const l = leads.find(x => String(x.id) === String(id)); if (!l) return;
    activeId = l.id;
    $('dealTitle').textContent = l.name;
    $('dealMeta').textContent = [l.postcode, l.source, l.score ? `Score ${l.score}` : ''].filter(Boolean).join(' · ');
    $('dealWhy').textContent = l.whyNow || 'Verify the trigger before contact.';
    $('dealPain').textContent = l.pain || l.notes || 'Qualify the pool condition and current service arrangement.';
    $('dealOffer').textContent = l.offer || 'Complimentary Pool Review';
    $('dealEnergy').textContent = l.energySignal || 'None found';
    $('dealOwnership').textContent = l.ownershipSignal || 'None found';
    $('dealEvidence').href = l.url || '#';
    $('dealEvidence').style.display = l.url ? 'inline-flex' : 'none';
    $('dealStatus').value = l.status || 'New lead'; $('dealPriority').value = l.priority || 'Medium';
    $('dealPhone').value = l.phone || ''; $('dealEmail').value = l.email || '';
    $('dealNextAction').value = l.nextAction || 'Make first contact and offer Pool Review'; $('dealNextDate').value = l.nextDate || tomorrow();
    $('dealOutcome').value = ''; $('dealInteraction').value = ''; $('dealHistory').value = l.history || '';
    $('scriptType').value = l.status === 'New lead' ? 'opening' : 'followup'; showScript();
    updateContactLinks(); $('dealDialog').showModal();
  }

  function updateContactLinks() {
    const phone = $('dealPhone').value.replace(/[^+\d]/g, '');
    const email = $('dealEmail').value.trim();
    $('callLead').href = phone ? `tel:${phone}` : '#'; $('callLead').style.opacity = phone ? '1' : '.45';
    $('emailLead').href = email ? `mailto:${email}?subject=${encodeURIComponent('Complimentary Ace Pools Pool Review')}` : '#'; $('emailLead').style.opacity = email ? '1' : '.45';
  }

  stages.forEach(s => { $('statusFilter').insertAdjacentHTML('beforeend', `<option>${s}</option>`); $('dealStatus').insertAdjacentHTML('beforeend', `<option>${s}</option>`); });
  ['search','statusFilter','priorityFilter'].forEach(id => $(id).oninput = render);
  $('scriptType').onchange = showScript; $('dealPhone').oninput = updateContactLinks; $('dealEmail').oninput = updateContactLinks;
  $('copyScript').onclick = async () => { await navigator.clipboard.writeText($('dealScript').textContent); $('copyScript').textContent = 'Copied'; setTimeout(() => $('copyScript').textContent = 'Copy message', 1200); };
  $('addLead').onclick = () => $('leadDialog').showModal();
  $('leadForm').onsubmit = e => { if (e.submitter?.value === 'cancel') return; leads.unshift({ id: Date.now(), created: new Date().toISOString(), name: $('leadName').value.trim(), postcode: $('leadPostcode').value.trim(), phone: $('leadPhone').value.trim(), email: $('leadEmail').value.trim(), source: $('leadSource').value, status: 'New lead', priority: $('leadPriority').value, nextAction: 'Make first contact and offer Pool Review', nextDate: tomorrow(), notes: $('leadNotes').value.trim(), history: '' }); save(); setTimeout(render, 0); $('leadForm').reset(); };
  $('dealForm').onsubmit = e => {
    if (e.submitter?.value === 'cancel') return;
    const l = lead(); if (!l) return;
    l.status = $('dealStatus').value; l.priority = $('dealPriority').value; l.phone = $('dealPhone').value.trim(); l.email = $('dealEmail').value.trim(); l.nextAction = $('dealNextAction').value.trim(); l.nextDate = $('dealNextDate').value;
    const note = $('dealInteraction').value.trim(), outcome = $('dealOutcome').value;
    if (note || outcome) { const stamp = new Date().toLocaleString('en-GB'); l.history = `[${stamp}] ${outcome}${outcome && note ? ' – ' : ''}${note}\n${l.history || ''}`; }
    save(); setTimeout(render, 0);
  };
  $('removeDeal').onclick = () => { if (confirm('Remove this deal from the pipeline?')) { leads = leads.filter(x => String(x.id) !== String(activeId)); save(); $('dealDialog').close(); render(); } };
  $('exportCsv').onclick = () => { const keys = ['name','postcode','phone','email','source','status','priority','nextAction','nextDate','whyNow','pain','offer','angle','energySignal','ownershipSignal','url','history']; const csv = [keys.join(','), ...leads.map(l => keys.map(k => `"${String(l[k] || '').replace(/"/g, '""')}"`).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); a.download = 'ace-pools-deals.csv'; a.click(); URL.revokeObjectURL(a.href); };
  $('importCsv').onchange = e => { const f = e.target.files[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => { const lines = reader.result.split(/\r?\n/).filter(Boolean), headers = parse(lines.shift()); for (const line of lines) { const vals = parse(line), obj = { id: Date.now() + Math.random(), status:'New lead', priority:'Medium', nextAction:'Review imported record', nextDate:tomorrow() }; headers.forEach((h,i) => obj[h.trim()] = vals[i] || ''); leads.push(obj); } save(); render(); }; reader.readAsText(f); };
  function parse(line) { const out=[]; let v='', q=false; for(let i=0;i<line.length;i++){const c=line[i]; if(c==='"'&&line[i+1]==='"'){v+='"';i++;}else if(c==='"')q=!q;else if(c===','&&!q){out.push(v);v='';}else v+=c;} out.push(v); return out; }
  render(); const requested = new URLSearchParams(location.search).get('lead'); if (requested) setTimeout(() => openDeal(requested), 0);
})();
