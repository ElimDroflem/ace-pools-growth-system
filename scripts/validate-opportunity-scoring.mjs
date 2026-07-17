import assert from 'node:assert/strict';
import {assessOpportunity,isQualifiedProperty} from '../assets/opportunity-score.js';

const base={poolConfidence:'Confirmed',inTerritory:true,contactability:'Available',triggerType:'Known pool home',propertyClass:'Private home',poolType:'Outdoor',driveMinutes:15,evidenceAgeDays:3};

assert.equal(isQualifiedProperty({...base,poolConfidence:'Candidate'}),false,'Candidate pools must not enter Best Leads');
assert.equal(isQualifiedProperty({...base,inTerritory:false}),false,'Out-of-territory properties must not enter Best Leads');
assert.equal(isQualifiedProperty({...base,contactability:'Needs research'}),false,'A usable contact route is required');

const activeSale=assessOpportunity({...base,triggerType:'Active sale',whyNow:'Buyer will inherit the pool',signal:'Current sale',ownershipSignal:''});
assert.equal(activeSale.flags.ownershipChange,false,'Buyer wording alone must not imply a completed ownership transition');
assert.equal(activeSale.competition,'Relationship may change');

const sold=assessOpportunity({...base,triggerType:'Active sale',whyNow:'Sold subject to contract',ownershipSignal:'Sold Stc'});
assert.equal(sold.flags.ownershipChange,true,'Sold STC is an ownership-transition window');
assert.equal(sold.competition,'Likely lower');

const renovatedHouse=assessOpportunity({...base,triggerType:'Active sale',signal:'Renovated Georgian country house with pool'});
assert.equal(renovatedHouse.flags.refresh,false,'A renovated house alone must not create a pool-refresh claim');

const ageingPool=assessOpportunity({...base,triggerType:'Age / condition',signal:'Older pool plant needs a baseline'});
assert.equal(ageingPool.flags.refresh,true,'Age and condition evidence must create a refresh opportunity');

const providerGap=assessOpportunity({...base,whyNow:'Known pool with no current care provider visible'});
assert.equal(providerGap.competition,'Low indicated','Low competition requires an explicit provider-gap signal');

const source=process.argv[2]||'https://raw.githubusercontent.com/ElimDroflem/ace-pools-growth-system/main/data/leads.json';
const payload=await fetch(source,{cache:'no-store'}).then(response=>{assert.equal(response.ok,true,`Could not load ${source}`);return response.json();});
const ranked=payload.leads.filter(isQualifiedProperty).map(lead=>({lead,insight:assessOpportunity(lead)})).sort((a,b)=>b.insight.score-a.insight.score||a.lead.driveMinutes-b.lead.driveMinutes);

assert.ok(ranked.length>0,'The live feed must contain qualified leads');
assert.ok(ranked.every(item=>item.insight.score>=0&&item.insight.score<=100),'Every score must stay within 0–100');
assert.ok(ranked.every((item,index)=>!index||ranked[index-1].insight.score>=item.insight.score),'The list must be sorted by score');
assert.ok(ranked.every(item=>item.lead.poolConfidence==='Confirmed'),'Only confirmed pool properties may be ranked');
assert.ok(ranked.every(item=>item.lead.inTerritory===true),'Only properties inside the service area may be ranked');
assert.ok(ranked.every(item=>['Available','Verified'].includes(item.lead.contactability)),'Every ranked property needs a usable contact route');
assert.ok(ranked.every(item=>item.insight.competition!=='Likely lower'||item.insight.flags.ownershipChange),'Likely-lower competition requires a real ownership transition');

console.log(`Validated ${ranked.length} qualified leads. Top opportunity: ${ranked[0].lead.prospect} (${ranked[0].insight.score}/100).`);
