import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
async function load(){
  $('enquiryList').innerHTML='<article class="card"><p>Loading assessment enquiries…</p></article>';
  try{
    const config=await fetch('data/public-config.json',{cache:'no-store'}).then(response=>response.json()),client=createClient(config.supabaseUrl,config.supabaseAnonKey),{data,error}=await client.from('ace_public_enquiries').select('*').eq('imported',false).order('created_at',{ascending:false});
    if(error)throw error;
    $('enquiryList').innerHTML=data.length?data.map(row=>`<article class="card"><div class="eyebrow">NEW FREE ASSESSMENT</div><h2>${esc(row.payload.name||'New enquiry')}</h2><p>${esc(row.payload.postcode||'')}</p><p><strong>Priority:</strong> ${esc(row.payload.priority||'Medium')}</p><p>${esc(row.payload.whyNow||row.payload.notes||'')}</p><button class="btn btn-primary" data-import="${esc(row.id)}">Add to pipeline</button></article>`).join(''):'<article class="card"><h2>No new assessment enquiries.</h2></article>';
    document.querySelectorAll('[data-import]').forEach(button=>button.onclick=async()=>{const row=data.find(item=>String(item.id)===button.dataset.import),leads=JSON.parse(localStorage.getItem('acePoolLeads')||'[]');if(!leads.some(lead=>String(lead.id)===String(row.lead_id)))leads.unshift({...row.payload,id:row.lead_id,status:'New lead',nextAction:'Call and book Pool Review',nextDate:new Date().toISOString().slice(0,10)});localStorage.setItem('acePoolLeads',JSON.stringify(leads));await client.from('ace_public_enquiries').update({imported:true}).eq('id',row.id);load();});
  }catch(error){$('enquiryList').innerHTML=`<article class="card"><h2>Enquiries could not be loaded.</h2><p>${esc(error.message)}</p></article>`;}
}
$('refreshEnquiries').onclick=load;load();
