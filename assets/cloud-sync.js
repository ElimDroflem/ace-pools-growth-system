const url=localStorage.getItem('aceSyncUrl'),key=localStorage.getItem('aceSyncKey'),watched=new Set(['acePoolLeads','acePoolReviews','aceSettings']);
if(url&&key&&localStorage.getItem('aceSyncEnabled')==='1')startCloudSync();
async function startCloudSync(){
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const client=createClient(url,key),original=localStorage.setItem.bind(localStorage),timer={id:null};
    async function push(){const {data}=await client.auth.getSession();if(!data.session)return;const payload={};watched.forEach(name=>payload[name]=JSON.parse(localStorage.getItem(name)||'null'));await client.from('ace_sales_state').upsert({user_id:data.session.user.id,payload,updated_at:new Date().toISOString()});}
    localStorage.setItem=(name,value)=>{original(name,value);if(watched.has(name)){clearTimeout(timer.id);timer.id=setTimeout(push,700)}};
    setTimeout(push,900);
  }catch(error){console.warn('Cloud sync unavailable',error)}
}
