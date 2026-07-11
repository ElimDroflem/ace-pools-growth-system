(() => {
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const colors = {A:'#ff6b4a', B:'#d89a19', C:'#20a875'};
  const $ = id => document.getElementById(id);
  let payload, markers, map;

  function addLead(property) {
    const leads = JSON.parse(localStorage.getItem('acePoolLeads') || '[]');
    let existing = leads.find(lead => lead.sourceId === property.id || lead.propertyId === property.propertyId || lead.url === property.url);
    if (!existing) {
      existing = {
        id:'map-'+property.id, sourceId:property.id, propertyId:property.propertyId || '', created:new Date().toISOString(),
        name:property.prospect, postcode:[property.area, property.postcode].filter(Boolean).join(' · '), area:property.area,
        latitude:property.latitude, longitude:property.longitude, driveMinutes:property.driveMinutes,
        phone:'', email:'', contactName:'', contactRoute:property.route, contactConfidence:property.contactability,
        source:'Confirmed pool property register', status:'New lead', priority:property.priority==='A'?'High':'Medium',
        nextAction:property.action, nextDate:new Date(Date.now()+86400000).toISOString().slice(0,10),
        notes:property.reasoning, whyNow:property.whyNow, pain:property.pain, offer:property.offer, angle:property.angle,
        poolType:property.poolType, propertyClass:property.propertyClass, triggerType:property.triggerType,
        energySignal:property.energySignal||'', ownershipSignal:property.ownershipSignal||'', url:property.url,
        score:property.score, history:`Added from pool-property register. Evidence checked ${property.evidenceDate || 'date unavailable'}.`
      };
      leads.unshift(existing);
      localStorage.setItem('acePoolLeads', JSON.stringify(leads));
    }
    location.href = 'dashboard.html?lead=' + encodeURIComponent(existing.id);
  }
  window.addTerritoryLead = id => { const item = payload.leads.find(lead => String(lead.id) === String(id)); if (item) addLead(item); };

  function popup(property) {
    return `<div class="lead-popup"><div class="popup-top"><b>${esc(property.prospect)}</b><span class="map-priority p-${property.priority}">${property.priority}</span></div>
      <span>${esc(property.area)} · ${esc(property.driveMinutes)} min · ${esc(property.poolType)} pool</span>
      <p><strong>Why now:</strong> ${esc(property.whyNow)}</p><p><strong>Likely need:</strong> ${esc(property.pain)}</p>
      <p><strong>Conversation:</strong> ${esc(property.angle)}</p>
      <button class="btn btn-primary" onclick="addTerritoryLead('${esc(property.id)}')">Add to pipeline</button> <a href="${esc(property.url)}" target="_blank" rel="noopener">Evidence</a></div>`;
  }

  function matches(property) {
    const priority=$('mapPriority').value, max=+$('mapDrive').value, search=$('mapSearch').value.trim().toLowerCase();
    if (property.poolConfidence !== 'Confirmed' || !property.inTerritory || !property.latitude || property.driveMinutes > max) return false;
    if (priority && property.priority !== priority) return false;
    if (search && ![property.prospect,property.area,property.postcode,property.poolType,property.pain,property.signal].join(' ').toLowerCase().includes(search)) return false;
    return true;
  }

  function render() {
    markers.clearLayers();
    const leads = payload.leads.filter(matches).sort((a,b)=>b.score-a.score || a.driveMinutes-b.driveMinutes), areas={};
    for (const property of leads) {
      areas[property.area]=(areas[property.area]||0)+1;
      const icon=L.divIcon({className:'lead-dot-wrap',html:`<span class="lead-dot" style="background:${colors[property.priority]}">${property.priority}</span>`,iconSize:[32,32],iconAnchor:[16,16]});
      const marker=L.marker([property.latitude,property.longitude],{icon}); marker.bindPopup(popup(property),{maxWidth:360}); markers.addLayer(marker);
    }
    const registered=payload.leads.filter(item=>item.poolConfidence==='Confirmed'&&item.inTerritory);
    $('registerCount').textContent=registered.length; $('hotCount').textContent=registered.filter(item=>item.actNow).length;
    $('areaCount').textContent=Object.keys(areas).length;
    $('mapStatus').textContent=`${leads.length} matching properties shown. ${registered.length} confirmed pool properties are retained in the permanent register.`;
    $('hotspots').innerHTML=Object.entries(areas).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([area,count])=>`<button class="hotspot hotspot-button" data-area="${esc(area)}"><b>${esc(area)}</b><span>${count} propert${count===1?'y':'ies'}</span></button>`).join('')||'<p class="muted">No matching route clusters.</p>';
    $('mapLeadList').innerHTML=leads.slice(0,40).map(property=>`<article><span class="map-priority p-${property.priority}">${property.priority}</span><div><b>${esc(property.prospect)}</b><small>${esc(property.area)} · ${esc(property.driveMinutes)} min · ${esc(property.poolType)} pool</small><p><strong>Why now:</strong> ${esc(property.whyNow)}</p><p class="lead-reason"><strong>Conversation:</strong> ${esc(property.angle)}</p><button class="btn btn-primary" data-add="${esc(property.id)}">Add to pipeline</button> <a class="evidence-link" href="${esc(property.url)}" target="_blank" rel="noopener">Evidence</a></div></article>`).join('')||'<p class="muted">No properties match these filters.</p>';
    document.querySelectorAll('[data-add]').forEach(button=>button.onclick=()=>window.addTerritoryLead(button.dataset.add));
    document.querySelectorAll('[data-area]').forEach(button=>button.onclick=()=>{$('mapSearch').value=button.dataset.area;render();});
  }

  async function init() {
    try {
      const response=await fetch('data/leads.json'); if(!response.ok) throw new Error('Lead data unavailable'); payload=await response.json();
      map=L.map('leadMap',{scrollWheelZoom:true}).setView([payload.centre.latitude,payload.centre.longitude],9);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
      L.circleMarker([payload.centre.latitude,payload.centre.longitude],{radius:9,color:'#082536',weight:4,fillColor:'#c7f36b',fillOpacity:1}).addTo(map).bindPopup('<strong>Comberton</strong><br>Ace Pools territory centre');
      markers=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:42}); map.addLayer(markers);
      ['mapPriority','mapDrive'].forEach(id=>$(id).onchange=render); $('mapSearch').oninput=render; render();
    } catch(error) { $('mapStatus').textContent='Lead data could not be loaded. Run the daily refresh workflow.'; }
  }
  init();
})();
import('./cloud-sync.js');
