const text = value => String(value || '').toLowerCase();
const has = (value, pattern) => pattern.test(text(value));

function poolLabel(lead) {
  if (lead.poolType === 'Indoor') return 'indoor pool';
  if (lead.poolType === 'Outdoor') return 'outdoor pool';
  if (lead.poolType === 'Both') return 'indoor and outdoor pools';
  return 'swimming pool';
}

function poolPhrase(lead) {
  if (lead.poolType === 'Indoor') return 'an indoor pool';
  if (lead.poolType === 'Outdoor') return 'an outdoor pool';
  if (lead.poolType === 'Both') return 'indoor and outdoor pools';
  return 'a swimming pool';
}

function ownershipStatus(lead) {
  const source = `${lead.ownershipSignal || ''} ${lead.signal || ''}`;
  if (has(source, /sale agreed/)) return 'Sale agreed';
  if (has(source, /under offer/)) return 'Under offer';
  if (has(source, /sold (?:stc|subject to contract)/)) return 'Sold STC';
  return lead.triggerType === 'Ownership change' ? 'Ownership changing' : '';
}

export function assessOpportunity(lead) {
  const signal = text(lead.signal);
  const status = ownershipStatus(lead);
  const ownershipChange = Boolean(status);
  const managed = ['Managed short-let', 'Residential development'].includes(lead.propertyClass) || lead.triggerType === 'Managed use';
  const priceReduced = lead.triggerType === 'Price reduction' || has(signal, /\breduced\b|price reduction/);
  const activeSale = ownershipChange || priceReduced || lead.triggerType === 'Active sale' || has(signal, /(?:fresh|new|current|active|chain-free|no-chain|no onward chain).{0,18}(?:sale|listing)/);
  const explicitPoolCondition = has(signal, /(?:pool|plant|filter|boiler|heater|cover).{0,55}(?:weathered|restoration|repair|replacement|recommission|decommission|not working|updating required)|(?:weathered|restore|restoration|repair|replace|recommission|decommission).{0,55}(?:pool|plant|filter|boiler|heater|cover)/);
  const specialist = ['Indoor', 'Both'].includes(lead.poolType);
  const needsVerification = lead.status === 'Verify';
  const directContact = lead.contactability === 'Verified';
  const pool = poolLabel(lead);
  const poolWithArticle = poolPhrase(lead);

  let reasonText;
  let painText;
  let offer;
  let opener;
  let opportunityType;

  if (needsVerification) {
    opportunityType = 'Research first';
    reasonText = `This property has a confirmed ${pool}, but the current trigger needs checking.`;
    painText = 'No immediate customer problem is proven yet.';
    offer = 'Verify before contact';
    opener = 'Confirm the current owner, sales status and pool-care arrangement before making an offer.';
  } else if (managed) {
    opportunityType = 'Managed pool';
    reasonText = lead.propertyClass === 'Managed short-let'
      ? `Paying guests regularly use this ${pool}.`
      : `Residents share this managed ${pool}.`;
    painText = lead.propertyClass === 'Managed short-let'
      ? 'A breakdown or water-quality problem could disrupt bookings and damage reviews.'
      : 'The management company needs the shared pool to stay safe, reliable and properly documented.';
    offer = 'Documented PoolCare plan';
    opener = 'I help managed properties keep pools safe, documented and available. Who currently looks after the pool?';
  } else if (ownershipChange && explicitPoolCondition) {
    opportunityType = 'New owner + pool work';
    reasonText = `${status}: a buyer is taking over a home where the pool is described as needing work.`;
    painText = 'The buyer may inherit an unusable pool and need a clear repair plan before spending elsewhere.';
    offer = 'Pool Handover & Repair Plan';
    opener = 'I help buyers make inherited pools safe and usable. Could I send the buyer a short handover and repair offer?';
  } else if (ownershipChange) {
    opportunityType = 'New owner';
    reasonText = `${status}: a buyer is taking over a home with ${poolWithArticle}.`;
    painText = "The buyer may not know the pool's condition, running costs or maintenance history.";
    offer = 'New Owner Pool Handover';
    opener = 'I help buyers understand and take over pools safely. Could I send you a short handover offer for the buyer?';
  } else if (explicitPoolCondition) {
    opportunityType = 'Pool needs work';
    reasonText = `The property information describes the ${pool} or its equipment as needing work.`;
    painText = 'Delaying the work could increase repair costs or leave the pool unusable.';
    offer = 'Pool Condition & Repair Review';
    opener = 'I separate urgent pool repairs from optional improvements. Would the owner find a simple condition review useful?';
  } else if (activeSale) {
    opportunityType = 'Sale handover';
    reasonText = priceReduced
      ? `The home is still for sale after a price reduction and includes ${poolWithArticle}.`
      : `The home is currently for sale with ${poolWithArticle}.`;
    painText = specialist
      ? 'The seller or buyer may need help understanding specialist plant, maintenance and running costs.'
      : 'The seller or buyer may need a simple pool condition and maintenance handover.';
    offer = 'Seller / Buyer Pool Review';
    opener = 'I provide simple pool handovers for sellers and buyers. Would that be useful for this property?';
  } else {
    opportunityType = 'Research first';
    reasonText = `This property is known to have ${poolWithArticle}, but there is no fresh buying trigger.`;
    painText = 'No immediate pain is proven. Check the owner and current maintenance arrangement first.';
    offer = 'Research before contact';
    opener = 'Confirm the owner and current pool-care arrangement before making an offer.';
  }

  const intent = needsVerification ? 0 : ownershipChange ? 30 : managed ? 26 : explicitPoolCondition ? 24 : activeSale ? 20 : 4;
  const need = explicitPoolCondition ? 24 : managed ? 22 : ownershipChange ? 16 : specialist ? 12 : 8;
  const contact = directContact ? 14 : lead.contactability === 'Available' ? 6 : 0;
  const distance = lead.driveMinutes <= 10 ? 10 : lead.driveMinutes <= 20 ? 8 : lead.driveMinutes <= 30 ? 6 : lead.driveMinutes <= 45 ? 3 : 0;
  const evidenceAge = Number(lead.evidenceAgeDays);
  const freshness = Number.isFinite(evidenceAge) ? evidenceAge <= 30 ? 10 : evidenceAge <= 90 ? 6 : evidenceAge <= 180 ? 3 : 0 : 0;
  const multiSignal = ownershipChange && explicitPoolCondition ? 6 : managed && specialist ? 4 : 0;
  const score = Math.max(0, Math.min(100, intent + need + contact + distance + freshness + multiSignal));
  const ready = !needsVerification && score >= 55 && (ownershipChange || managed || explicitPoolCondition || activeSale);
  const tier = score >= 75 ? 'Start today' : ready ? 'Good prospect' : 'Research first';
  const tierKey = score >= 75 ? 'hot' : ready ? 'strong' : 'research';

  const tags = [];
  if (ownershipChange) tags.push('New owner');
  if (managed) tags.push('Managed pool');
  if (explicitPoolCondition) tags.push('Pool work mentioned');
  if (activeSale && !ownershipChange) tags.push('For sale');
  if (!ready) tags.push('Research first');

  return {
    score,
    tier,
    tierKey,
    ready,
    opportunityType,
    reasonText,
    painText,
    offer,
    opener,
    routeType: directContact ? 'Direct contact' : 'Agent or address route',
    tags,
    flags: { ownershipChange, managed, explicitPoolCondition, activeSale, priceReduced, specialist, needsVerification },
    breakdown: { intent, need, contact, distance, freshness, multiSignal }
  };
}

export function isQualifiedProperty(lead) {
  return lead.poolConfidence === 'Confirmed' && lead.inTerritory === true && ['Verified', 'Available'].includes(lead.contactability);
}
