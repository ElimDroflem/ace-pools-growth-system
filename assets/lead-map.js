(() => {
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const colors = { A:'#e85d5d', B:'#f3b63a', C:'#20a875' };
  let payload, markers, map;
  function addLead(x) {
    let leads = JSON.parse(localStorage.getItem('acePoolLeads') || '[]');
    let existing = leads.find(l => l.sourceId === x.id || l.url === x.url);
    if (!existing) {
      existing = { id:'map-'+x.id, sourceId:x.id, created:new Date().toISOString(), name:x.prospect, postcode:x.area+(x.postcode?' · '+x.postcode:''), phone:'', email:'', source:'Daily territory map', status:'New lead', priority:x.priority==='A'?'High':x.priority==='B'?'Medium':'Low', nextAction:x.action, nextDate:new Date(Date.now()+86400000).toISOString().slice(0,10), notes:x.reasoning||'', whyNow:x.whyNow, pain:x.pain, offer:x.offer, angle:x.angle, energySignal:x.energySignal||'', ownershipSignal:x.ownershipSignal||'', url:x.url, score:x.score, history:'' };
      leads.unshift(existing); localStorage.setItem('acePoolLeads', JSON.stringify(leads));
    }
    location.href = 'dashboard.html?lead=' + encodeURIComponent(existing.id);
  }
  window.addTerritoryLead = id => { const x = payload.leads.find(l => String(l.id) === String(id)); if (x) addLead(x); };
  async function init() {
    try {
      const r = await fetch('data/leads.json', {cache:'no-store'}); if (!r.ok) throw new Error('Lead data unavailable'); payload = await r.json();
      map = L.map('leadMap', {scrollWheelZoom:true}).setView([payload.centre.latitude,payload.centre.longitude],9);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
      L.circleMarker([payload.centre.latitude,payload.centre.longitude],{radius:9,color:'#082536',weight:4,fillColor:'#c7f36b',fillOpacity:1}).addTo(map).bindPopup('<strong>Comberton</strong><br>Ace Pools territory centre');
      markers = L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:50}); map.addLayer(markers);
      $('mapPriority').onchange = render; $('mapDrive').onchange = render; render();
    } catch(e) { $('mapStatus').textContent = 'Lead data could not be loaded. Run the daily refresh workflow.'; }
  }
  const $ = id => document.getElementById(id);
  function render() {
    markers.clearLayers(); const p=$('mapPriority').value, max=+$('mapDrive').value;
    const leads=payload.leads.filter(x=>x.inTerritory&&x.latitude&&x.longitude&&x.driveMinutes<=max&&(!p||x.priority===p)); const areas={};
    for(const x of leads){areas[x.area]=(areas[x.area]||0)+1;const icon=L.divIcon({className:'lead-dot-wrap',html:`<span class="lead-dot" style="background:${colors[x.priority]}">${x.priority}</span>`,iconSize:[32,32],iconAnchor:[16,16]});const m=L.marker([x.latitude,x.longitude],{icon});m.bindPopup(`<div class="lead-popup"><b>${esc(x.prospect)}</b><span>${esc(x.area)} · ${esc(x.driveMinutes)} min · Score ${esc(x.score)}</span><p><strong>Why now:</strong> ${esc(x.whyNow)}</p>${x.energySignal?`<p><strong>Energy:</strong> ${esc(x.energySignal)}</p>`:''}${x.ownershipSignal?`<p><strong>Ownership:</strong> ${esc(x.ownershipSignal)}</p>`:''}<p><strong>Opening:</strong> ${esc(x.angle)}</p><button class="btn btn-primary" onclick="addTerritoryLead('${esc(x.id)}')">Work this lead</button> <a href="${esc(x.url)}" target="_blank" rel="noopener">Evidence</a></div>`);markers.addLayer(m);}
    const verify=payload.leads.filter(x=>x.autoDiscovered&&!x.inTerritory); $('territoryCount').textContent=leads.length; $('hotCount').textContent=leads.filter(x=>x.priority==='A').length; $('areaCount').textContent=Object.keys(areas).length; $('verifyCount').textContent=verify.length; $('updatedAt').textContent=new Date(payload.generatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}); $('mapStatus').textContent=`${leads.length} qualified leads shown within ${max} minutes of Comberton.`;
    $('verifyList').innerHTML=verify.slice(0,10).map(x=>`<div class="hotspot"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.prospect)}</a><span>verify</span></div>`).join('')||'<p class="muted">No unverified signals today.</p>';
    $('hotspots').innerHTML=Object.entries(areas).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([a,n])=>`<div class="hotspot"><b>${esc(a)}</b><span>${n} lead${n===1?'':'s'}</span></div>`).join('')||'<p>No matching areas.</p>';
    $('mapLeadList').innerHTML=leads.sort((a,b)=>b.score-a.score).slice(0,30).map(x=>`<article><span class="map-priority p-${x.priority}">${x.priority}</span><div><b>${esc(x.prospect)}</b><small>${esc(x.area)} · ${esc(x.driveMinutes)} min · ${esc(x.score)}</small><p>${esc(x.whyNow)}</p><button class="btn btn-dark" data-add="${esc(x.id)}">Work this lead</button></div></article>`).join('')||'<p>No matching leads.</p>'; document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>window.addTerritoryLead(b.dataset.add));
  }
  init();
})();
