import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const $=id=>document.getElementById(id),keys=['acePoolLeads','acePoolReviews','aceSettings'];
const config=await fetch('data/public-config.json',{cache:'no-store'}).then(r=>r.json());
localStorage.setItem('aceSyncUrl',config.supabaseUrl);localStorage.setItem('aceSyncKey',config.supabaseAnonKey);
$('syncEmail').value=localStorage.getItem('aceSyncEmail')||'';
const client=createClient(config.supabaseUrl,config.supabaseAnonKey);let user=null;
async function connect(){const {data}=await client.auth.getSession();user=data.session?.user||null;$('syncStatus').textContent=user?`Connected as ${user.email}. Automatic sync is active.`:'Enter Alex’s email to receive a secure sign-in link.';}
$('syncForm').onsubmit=async e=>{e.preventDefault();const email=$('syncEmail').value.trim();localStorage.setItem('aceSyncEmail',email);const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});$('syncStatus').textContent=error?error.message:'Secure login link sent. Open it on this device.';};
async function push(){await connect();if(!user){$('syncStatus').textContent='Sign in from the email link first.';return}const payload={};keys.forEach(k=>payload[k]=JSON.parse(localStorage.getItem(k)||'null'));const {error}=await client.from('ace_sales_state').upsert({user_id:user.id,payload,updated_at:new Date().toISOString()});$('syncStatus').textContent=error?error.message:'This device has been uploaded.';}
async function pull(){await connect();if(!user){$('syncStatus').textContent='Sign in from the email link first.';return}const {data,error}=await client.from('ace_sales_state').select('payload').eq('user_id',user.id).single();if(error){$('syncStatus').textContent=error.message;return}keys.forEach(k=>{if(data.payload?.[k]!=null)localStorage.setItem(k,JSON.stringify(data.payload[k]))});$('syncStatus').textContent='Latest cloud data restored. Reopen Today or Pipeline.';}
$('pushNow').onclick=push;$('pullNow').onclick=pull;await connect();
