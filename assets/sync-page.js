import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const $=id=>document.getElementById(id),keys=['acePoolLeads','acePoolReviews','aceCustomers','aceServiceReports','aceSettings'];
const config=await fetch('data/public-config.json').then(response=>response.json());
localStorage.setItem('aceSyncUrl',config.supabaseUrl);localStorage.setItem('aceSyncKey',config.supabaseAnonKey);
$('syncEmail').value=localStorage.getItem('aceSyncEmail')||'';
const client=createClient(config.supabaseUrl,config.supabaseAnonKey);let user=null;
async function connect(){const {data}=await client.auth.getSession();user=data.session?.user||null;if(user)localStorage.setItem('aceSyncEnabled','1');else localStorage.removeItem('aceSyncEnabled');$('syncStatus').textContent=user?`Connected as ${user.email}. Automatic backup is active.`:'Enter an email only if you want cloud backup.';}
$('syncForm').onsubmit=async event=>{event.preventDefault();const email=$('syncEmail').value.trim();localStorage.setItem('aceSyncEmail',email);const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});$('syncStatus').textContent=error?error.message:'Secure sign-in link sent.';};
async function push(){await connect();if(!user){$('syncStatus').textContent='Sign in from the email link first.';return}const payload={};keys.forEach(name=>payload[name]=JSON.parse(localStorage.getItem(name)||'null'));const {error}=await client.from('ace_sales_state').upsert({user_id:user.id,payload,updated_at:new Date().toISOString()});$('syncStatus').textContent=error?error.message:'This device is backed up.';}
async function pull(){await connect();if(!user){$('syncStatus').textContent='Sign in from the email link first.';return}const {data,error}=await client.from('ace_sales_state').select('payload').eq('user_id',user.id).single();if(error){$('syncStatus').textContent=error.message;return}keys.forEach(name=>{if(data.payload?.[name]!=null)localStorage.setItem(name,JSON.stringify(data.payload[name]))});$('syncStatus').textContent='Cloud backup restored. Return to Pipeline.';}
$('pushNow').onclick=push;$('pullNow').onclick=pull;await connect();
