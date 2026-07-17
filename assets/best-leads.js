import { assessOpportunity, isQualifiedProperty } from './opportunity-score.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

let payload;
const savedLeads = () => JSON.parse(localStorage.getItem('acePoolLeads') || '[]');
const poolName = lead => lead.poolType === 'Unknown' ? 'Swimming' : lead.poolType;

function existingLead(property) {
  return savedLeads().find(lead =>
    lead.sourceId === property.id ||
    (property.propertyId && lead.propertyId === property.propertyId) ||
    lead.url === property.url
  );
}

function startOutreach(property) {
  const leads = savedLeads();
  let lead = existingLead(property);

  if (!lead) {
    const insight = assessOpportunity(property);
    const nextAction = insight.ready
      ? `Contact via ${property.route} and offer the ${insight.offer}.`
      : 'Verify the current owner, sales status and pool-care arrangement before outreach.';

    lead = {
      id: `best-${property.id}`,
      sourceId: property.id,
      propertyId: property.propertyId || '',
      created: new Date().toISOString(),
      name: property.prospect,
      postcode: [property.area, property.postcode].filter(Boolean).join(' · '),
      area: property.area,
      latitude: property.latitude,
      longitude: property.longitude,
      driveMinutes: property.driveMinutes,
      phone: '',
      email: '',
      contactName: '',
      contactRoute: property.route,
      contactConfidence: property.contactability,
      source: 'Lead Finder',
      status: 'New lead',
      priority: insight.tierKey === 'hot' ? 'High' : insight.tierKey === 'strong' ? 'Medium' : 'Low',
      nextAction,
      nextDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      notes: `Observed signal: ${property.signal}`,
      whyNow: insight.reasonText,
      pain: insight.painText,
      offer: insight.offer,
      angle: insight.opener,
      poolType: property.poolType,
      propertyClass: property.propertyClass,
      triggerType: property.triggerType,
      ownershipSignal: property.ownershipSignal || '',
      url: property.url,
      score: insight.score,
      history: `Added from Lead Finder at ${insight.score}/100. Original evidence dated ${property.evidenceDate || 'unknown'}.`
    };
    leads.unshift(lead);
    localStorage.setItem('acePoolLeads', JSON.stringify(leads));
  }

  location.href = `dashboard.html?lead=${encodeURIComponent(lead.id)}`;
}

function matchesView(item, view) {
  if (view === 'ready') return item.insight.ready;
  if (view === 'ownership') return item.insight.flags.ownershipChange;
  if (view === 'condition') return item.insight.flags.explicitPoolCondition;
  if (view === 'managed') return item.insight.flags.managed;
  if (view === 'research') return !item.insight.ready;
  return true;
}

function rankedRows() {
  const view = $('leadView').value;
  const includeWorked = $('includeWorked').checked;

  return payload.leads
    .filter(isQualifiedProperty)
    .map(lead => ({ lead, insight: assessOpportunity(lead), worked: existingLead(lead) }))
    .filter(item => matchesView(item, view) && (includeWorked || !item.worked))
    .sort((a, b) => b.insight.score - a.insight.score || a.lead.driveMinutes - b.lead.driveMinutes);
}

function tagMarkup(insight) {
  return insight.tags.slice(0, 3).map(tag => `<span>${esc(tag)}</span>`).join('');
}

function actionMarkup(item, top = false) {
  const label = item.worked ? 'Open follow-up' : 'Start outreach';
  return `<div class="lead-actions ${top ? 'top-actions' : ''}">
    <button class="btn btn-primary" data-start="${esc(item.lead.id)}">${label}</button>
    <a class="btn evidence-button" href="${esc(item.lead.url)}" target="_blank" rel="noopener">Check evidence</a>
  </div>`;
}

function renderTop(item) {
  if (!item) {
    $('topLead').innerHTML = '';
    return;
  }

  $('topLead').innerHTML = `<article class="top-lead">
    <div class="top-identity">
      <div class="top-rank">#1</div>
      <div class="priority-line"><span class="priority-pill">${esc(item.insight.tier)}</span><span>${item.insight.score}/100</span></div>
      <h2>${esc(item.lead.prospect)}</h2>
      <p>${esc(item.lead.area)} · ${esc(item.lead.driveMinutes)} min · ${esc(poolName(item.lead))} pool</p>
      <div class="lead-tags">${tagMarkup(item.insight)}</div>
    </div>
    <div class="reason-panel">
      <div><small>WHY NOW</small><p>${esc(item.insight.reasonText)}</p></div>
      <div><small>PROBLEM THEY MAY HAVE</small><p>${esc(item.insight.painText)}</p></div>
    </div>
    <aside class="outreach-panel">
      <small>LEAD WITH</small>
      <h3>${esc(item.insight.offer)}</h3>
      <p class="say-this"><b>Say this:</b> “${esc(item.insight.opener)}”</p>
      <p class="contact-route"><b>Route:</b> ${esc(item.lead.route)}</p>
      ${actionMarkup(item, true)}
    </aside>
  </article>`;
}

function leadCard(item, index) {
  return `<article class="lead-card${item.worked ? ' already-worked' : ''}" data-tier="${item.insight.tierKey}">
    <div class="rank-number">#${index + 2}</div>
    <div class="lead-identity">
      <div class="priority-line"><span class="priority-pill">${esc(item.insight.tier)}</span><span class="lead-score">${item.insight.score}/100</span></div>
      <h3>${esc(item.lead.prospect)}</h3>
      <p>${esc(item.lead.area)} · ${esc(item.lead.driveMinutes)} min · ${esc(poolName(item.lead))} pool</p>
      <div class="lead-tags">${tagMarkup(item.insight)}</div>
    </div>
    <div class="reason-panel compact">
      <div><small>WHY NOW</small><p>${esc(item.insight.reasonText)}</p></div>
      <div><small>PROBLEM THEY MAY HAVE</small><p>${esc(item.insight.painText)}</p></div>
    </div>
    <div class="offer-panel">
      <small>OFFER</small>
      <strong>${esc(item.insight.offer)}</strong>
      <p><b>Route:</b> ${esc(item.lead.route)}</p>
    </div>
    ${actionMarkup(item)}
  </article>`;
}

function render() {
  const all = payload.leads.filter(isQualifiedProperty).map(lead => ({ lead, insight: assessOpportunity(lead) }));
  const rows = rankedRows();
  const viewLabel = $('leadView').selectedOptions[0].textContent;

  $('readyCount').textContent = all.filter(item => item.insight.ready).length;
  $('newOwnerCount').textContent = all.filter(item => item.insight.flags.ownershipChange && !item.insight.flags.needsVerification).length;
  $('researchCount').textContent = all.filter(item => !item.insight.ready).length;
  $('listTitle').textContent = viewLabel;
  $('leadStatus').textContent = `${rows.length} unworked ${rows.length === 1 ? 'prospect' : 'prospects'} shown in priority order.`;
  $('dataFreshness').textContent = `List rebuilt ${new Date(payload.generatedAt).toLocaleString('en-GB')}`;

  renderTop(rows[0]);
  const remaining = rows.slice(1);
  $('leadList').innerHTML = remaining.length
    ? remaining.map(leadCard).join('')
    : `<article class="empty-leads"><h2>No more prospects in this view.</h2><p>Choose another view or include leads already in Follow-ups.</p></article>`;

  document.querySelectorAll('[data-start]').forEach(button => {
    button.onclick = () => {
      const property = payload.leads.find(lead => String(lead.id) === String(button.dataset.start));
      if (property) startOutreach(property);
    };
  });
}

async function load() {
  const sources = [
    'data/leads.json',
    'https://raw.githubusercontent.com/ElimDroflem/ace-pools-growth-system/main/data/leads.json'
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) continue;
      payload = await response.json();
      render();
      return;
    } catch {}
  }
  $('leadStatus').textContent = 'Lead data could not be loaded.';
}

$('leadView').onchange = render;
$('includeWorked').onchange = render;
load();
import('./cloud-sync.js');
