(() => {
  const original=localStorage.setItem.bind(localStorage);let config=null,pending=null;
  async function submit(lead){if(!lead||!config?.supabaseUrl||!config?.supabaseAnonKey)return;await fetch(`${config.supabaseUrl}/rest/v1/ace_public_enquiries`,{method:'POST',headers:{apikey:config.supabaseAnonKey,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({lead_id:String(lead.id),payload:lead})}).catch(()=>{});if(pending?.id===lead.id)pending=null;}
  fetch('data/public-config.json',{cache:'no-store'}).then(response=>response.json()).then(value=>{config=value;if(pending)submit(pending)}).catch(()=>{});
  localStorage.setItem=(key,value)=>{original(key,value);if(key!=='acePoolLeads')return;try{const lead=JSON.parse(value)[0];if(!['QR Pool Check','Free Assessment Report'].includes(lead?.source))return;pending=lead;submit(lead);}catch{}};
})();
