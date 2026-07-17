import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessOpportunity,isQualifiedProperty} from '../assets/opportunity-score.js';

const base={poolConfidence:'Confirmed',inTerritory:true,contactability:'Available',triggerType:'Known pool home',propertyClass:'Private home',poolType:'Outdoor',driveMinutes:15,evidenceAgeDays:3,status:'Active'};

assert.equal(isQualifiedProperty({...base,poolConfidence:'Candidate'}),false,'Candidate pools must not enter Best Leads');
assert.equal(isQualifiedProperty({...base,inTerritory:false}),false,'Out-of-territory properties must not enter Best Leads');
assert.equal(isQualifiedProperty({...base,contactability:'Needs research'}),false,'A usable contact route is required');

const buyerWording=assessOpportunity({...base,triggerType:'Active sale',whyNow:'Buyer will inherit the pool',signal:'Current sale',ownershipSignal:''});
assert.equal(buyerWording.flags.ownershipChange,false,'Buyer wording alone must not imply an ownership transition');

const sold=assessOpportunity({...base,triggerType:'Active sale',signal:'Outdoor pool confirmed',ownershipSignal:'Sold STC'});
assert.equal(sold.flags.ownershipChange,true,'Sold STC is an ownership-transition window');
assert.equal(sold.opportunityType,'New owner');
assert.match(sold.reasonText,/Sold STC: a buyer is taking over/);

const renovatedHouse=assessOpportunity({...base,triggerType:'Active sale',signal:'Renovated Georgian country house with outdoor pool'});
assert.equal(renovatedHouse.flags.explicitPoolCondition,false,'A renovated house alone must not create a pool-work claim');

const damagedPool=assessOpportunity({...base,triggerType:'Age / condition',signal:'The swimming pool requires restoration before use'});
assert.equal(damagedPool.flags.explicitPoolCondition,true,'Explicit pool-condition evidence must create a repair opportunity');
assert.equal(damagedPool.opportunityType,'Pool needs work');

const unsupportedProviderGap=assessOpportunity({...base,whyNow:'Known pool with no current care provider visible'});
assert.equal(unsupportedProviderGap.ready,false,'Unverified provider-gap wording must not promote a known pool');
assert.equal(unsupportedProviderGap.opportunityType,'Research first');

const managed=assessOpportunity({...base,propertyClass:'Managed short-let',triggerType:'Managed use'});
assert.equal(managed.ready,true,'A managed guest pool is a genuine recurring-service trigger');
assert.match(managed.painText,/bookings|reviews/);

const verify=assessOpportunity({...base,status:'Verify',triggerType:'Ownership change',ownershipSignal:'Under offer'});
assert.equal(verify.ready,false,'A stale or unverified trigger cannot be outreach-ready');
assert.equal(verify.opportunityType,'Research first');

const source=process.argv[2]||'https://raw.githubusercontent.com/ElimDroflem/ace-pools-growth-system/main/data/leads.json';
let payload;
if (/^https?:\/\//.test(source)) {
  payload=await fetch(source,{cache:'no-store'}).then(response=>{assert.equal(response.ok,true,`Could not load ${source}`);return response.json();});
} else {
  payload=JSON.parse(await readFile(source,'utf8'));
}

const ranked=payload.leads.filter(isQualifiedProperty).map(lead=>({lead,insight:assessOpportunity(lead)})).sort((a,b)=>b.insight.score-a.insight.score||a.lead.driveMinutes-b.lead.driveMinutes);

assert.ok(ranked.length>0,'The feed must contain qualified properties');
assert.ok(ranked.every(item=>item.insight.score>=0&&item.insight.score<=100),'Every score must stay within 0–100');
assert.ok(ranked.every((item,index)=>!index||ranked[index-1].insight.score>=item.insight.score),'The list must be sorted by score');
assert.ok(ranked.every(item=>item.lead.poolConfidence==='Confirmed'),'Only confirmed pool properties may be ranked');
assert.ok(ranked.every(item=>item.lead.inTerritory===true),'Only properties inside the service area may be ranked');
assert.ok(ranked.every(item=>['Available','Verified'].includes(item.lead.contactability)),'Every ranked property needs a usable route');
assert.ok(ranked.every(item=>item.insight.reasonText&&item.insight.painText&&item.insight.offer&&item.insight.opener),'Every lead needs a reason, likely pain, offer and opener');
assert.ok(ranked.every(item=>!item.insight.ready||item.insight.flags.ownershipChange||item.insight.flags.managed||item.insight.flags.explicitPoolCondition||item.insight.flags.activeSale),'Ready leads require an observable trigger');
assert.ok(ranked.every(item=>!item.insight.reasonText.toLowerCase().includes('no current provider')),'Generated reasons must not invent a provider gap');

const ready=ranked.filter(item=>item.insight.ready);
console.log(`Validated ${ranked.length} qualified properties: ${ready.length} ready to approach. Top opportunity: ${ranked[0].lead.prospect} (${ranked[0].insight.score}/100).`);
