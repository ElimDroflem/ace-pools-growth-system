const contains=(text,pattern)=>pattern.test(text);

export function assessOpportunity(lead){
  const text=[lead.whyNow,lead.signal,lead.pain,lead.angle,lead.action,lead.reasoning].filter(Boolean).join(' ').toLowerCase();
  const ownershipSignal=String(lead.ownershipSignal||'').toLowerCase();
  const ownershipChange=lead.triggerType==='Ownership change'||contains(`${text} ${ownershipSignal}`,/sold (?:stc|subject to contract)|sale agreed|under offer|post-completion|sstc ownership change/);
  const activeSale=ownershipChange||['Active sale','Price reduction','Age / condition'].includes(lead.triggerType)&&contains(`${text} ${ownershipSignal}`,/active sale|fresh listing|current sale|chain-free|no-chain|no onward chain|price reduc|selling agent|vendor|buyer introduction|sale pack/);
  const noProvider=contains(text,/no current (?:care )?provider|no provider (?:is )?visible|no current care|without (?:a )?regular (?:pool )?(?:service|maintenance)|maintenance responsibility gap/);
  const refresh=lead.triggerType==='Age / condition'||contains(text,/ageing (?:pool|plant|equipment)|older (?:pool|plant|equipment)|pool (?:area )?(?:requiring|needs?) (?:restoration|renovation|refurbishment)|restore the pool|pool restoration|pool renovation|pool refurbishment|modernis(?:e|ing) (?:the )?(?:pool|plant|equipment)|upgrade priorit|wear before failure|what may fail|recommission|decommission|plant condition/);
  const managed=lead.triggerType==='Managed use'||['Managed short-let','Residential development'].includes(lead.propertyClass);
  const planning=lead.triggerType==='Planning'||contains(text,/planning application|planning proposal|architect|specification/);
  const specialist=['Indoor','Both'].includes(lead.poolType);

  const provider=noProvider?25:ownershipChange?20:activeSale?12:managed?10:6;
  const timing=ownershipChange?20:lead.triggerType==='Active sale'?15:lead.triggerType==='Price reduction'?13:managed?14:planning?12:refresh?10:5;
  const need=managed?22:refresh?22:specialist?16:lead.poolType==='Outdoor'?12:8;
  const contact=lead.contactability==='Verified'?10:lead.contactability==='Available'?8:2;
  const distance=lead.driveMinutes<=10?10:lead.driveMinutes<=20?8:lead.driveMinutes<=30?6:lead.driveMinutes<=45?3:0;
  const age=Number(lead.evidenceAgeDays),freshness=Number.isFinite(age)?age<=30?10:age<=90?7:age<=180?4:2:3;
  const multiSignal=(noProvider&&refresh)||(ownershipChange&&refresh)||managed&&specialist?3:0;
  const score=Math.min(100,provider+timing+need+contact+distance+freshness+multiSignal);

  let type='Maintenance prospect',offer='Complimentary Pool Review',needText='Confirm the current care arrangement, safety baseline and equipment condition.';
  if(managed){type='Managed maintenance';offer='Documented PoolCare plan';needText='Documented water checks, preventative maintenance and dependable response.';}
  else if(ownershipChange&&refresh){type='New-owner takeover + refresh';offer='Pool Handover & Modernisation Review';needText='Give the incoming owner a safe operating baseline and separate urgent work from upgrades.';}
  else if(ownershipChange){type='New-owner takeover';offer='New Owner Pool Handover + PoolCare';needText='Take responsibility from day one with a condition baseline and ongoing maintenance.';}
  else if(noProvider){type='Maintenance gap';offer='Complimentary Pool Review + PoolCare';needText='Establish regular professional care before small issues become expensive.';}
  else if(refresh){type='Refresh / upgrade';offer='Pool Condition & Efficiency Review';needText='Identify ageing plant, reliability risks and sensible efficiency improvements.';}
  else if(activeSale){type='Sale handover';offer='Seller / Buyer Pool Review';needText='Make the pool easier to understand, budget for and take over.';}
  else if(planning){type='Project and aftercare';offer='Technical Review + Aftercare Plan';needText='Support the project early and establish the future maintenance relationship.';}

  let competition='Unknown',competitionKey='unknown',competitionReason='No reliable evidence about the current provider.';
  if(noProvider){competition='Low indicated';competitionKey='low';competitionReason='The evidence indicates no current care provider or a maintenance gap.';}
  else if(ownershipChange){competition='Likely lower';competitionKey='likely-low';competitionReason='A change of ownership often reopens the maintenance decision.';}
  else if(activeSale){competition='Relationship may change';competitionKey='changing';competitionReason='The seller and incoming owner may have different service arrangements.';}

  const reasons=[];
  if(noProvider)reasons.push('No current provider is visible');
  if(ownershipChange)reasons.push('Ownership is changing');
  else if(lead.triggerType==='Active sale')reasons.push('The property is actively for sale');
  else if(lead.triggerType==='Price reduction')reasons.push('A price reduction creates urgency');
  if(refresh)reasons.push('The pool shows a refresh or equipment need');
  if(managed)reasons.push('The pool is operationally important');
  if(specialist)reasons.push('Specialist indoor or multi-pool plant');
  if(lead.driveMinutes<=20)reasons.push(`${lead.driveMinutes} minutes from Comberton`);
  if(!reasons.length)reasons.push('Confirmed local pool property with an available contact route');

  const tags=[];
  if(ownershipChange)tags.push('New-owner window');
  if(noProvider)tags.push('Low competition signal');
  if(refresh)tags.push('Refresh opportunity');
  if(managed)tags.push('Recurring contract');
  if(activeSale&&!ownershipChange)tags.push('Active sale');
  if(specialist)tags.push('Specialist plant');
  if(!tags.length)tags.push('Maintenance prospect');

  const tier=score>=80?'Speak today':score>=65?'Strong opportunity':score>=50?'Worth researching':'Hold';
  const tierKey=score>=80?'hot':score>=65?'strong':score>=50?'research':'hold';
  return{score,tier,tierKey,type,offer,needText,competition,competitionKey,competitionReason,reasons:reasons.slice(0,3),tags,flags:{ownershipChange,activeSale,noProvider,refresh,managed,planning,specialist},breakdown:{provider,timing,need,contact,distance,freshness,multiSignal}};
}

export function isQualifiedProperty(lead){
  return lead.poolConfidence==='Confirmed'&&lead.inTerritory===true&&['Verified','Available'].includes(lead.contactability);
}
