/* ULTRA Sprint Planner · collegamento a Supabase (login + database + tempo reale).
   Espone window.claude.use("db"|"user") con la stessa interfaccia usata dall'app. */
(function(){
"use strict";
const C=window.ULTRA_CFG||{};window.__HOSTED=true;
const STAFF=["admin","coach","therapist"];
if(!C.url||!C.anon){document.addEventListener("DOMContentLoaded",()=>{document.body.insertAdjacentHTML("beforeend",'<div id="gate"><div class="gbox"><img class="glogo" src="ultra-logo.png" alt="ULTRA"><h1>Sprint Planner</h1><p>App installata correttamente. Manca ancora il collegamento al database: lo completa l\'amministratore.</p></div></div>')});window.claude={use:()=>new Promise(()=>{})};return}
const sb=window.supabase.createClient(C.url,C.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.__sb=sb;
let session=null,profile=null,readyRes;const ready=new Promise(r=>readyRes=r);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function gate(html){if(!document.body){document.addEventListener("DOMContentLoaded",()=>gate(html),{once:true});return}let g=document.getElementById("gate");if(!g){g=document.createElement("div");g.id="gate";document.body.appendChild(g)}g.innerHTML=`<div class="gbox"><img class="glogo" src="ultra-logo.png" alt="ULTRA"><h1>Sprint Planner</h1>${html}</div>`}
function gateOff(){document.getElementById("gate")?.remove()}
const INAPP=/FBAN|FBAV|Instagram|Line\/|GSA\/|; wv\)|WhatsApp|MicroMessenger|Snapchat|TikTok|LinkedInApp|Claude/i.test(navigator.userAgent||"");
const IOS=/iPhone|iPad|iPod/i.test(navigator.userAgent||"");
const URLERR=(()=>{try{const q=new URLSearchParams(location.search),h=new URLSearchParams((location.hash||"").replace(/^#/,""));const e=h.get("error_description")||q.get("error_description")||h.get("error")||q.get("error");if(e){history.replaceState(null,"",location.origin+"/")}return e?decodeURIComponent(String(e).replace(/\+/g," ")):""}catch(_){return ""}})();
function inAppNote(){return INAPP?`<div class="gmsg" style="text-align:left"><b>Apri l'app nel browser.</b> Stai usando il browser interno di un'altra app e Google lì blocca l'accesso. ${IOS?"Apri <b>Safari</b>":"Apri <b>Chrome</b>"} e scrivi: <b>${esc(location.host)}</b><br><button class="gbtn2" id="g_copy" style="margin-top:8px">Copia il link</button></div>`:""}
function loginView(msg){msg=msg||URLERR&&("Accesso non riuscito: "+URLERR);gate(`${inAppNote()}<p>Entra con il tuo account per vedere il programma e segnare gli allenamenti.</p>
  <button class="gbtn" id="g_google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Accedi con Google</button>
  ${C.email?`<div class="gor">oppure con un codice via email</div><input id="g_email" type="email" placeholder="la tua email" autocomplete="email"><button class="gbtn2" id="g_send">Mandami il codice</button><div id="g_code" hidden><input id="g_otp" inputmode="numeric" placeholder="codice ricevuto"><button class="gbtn2" id="g_verify">Entra</button></div>`:""}
  ${msg?`<p class="gmsg">${esc(msg)}</p>`:""}<p class="gsmall">L'app non vede e non salva password. Usa sempre lo stesso account.</p>`);
  const cp=document.getElementById("g_copy");if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+"/");cp.textContent="Link copiato ✓"}catch(_){cp.textContent=location.origin+"/"}};
  document.getElementById("g_google").onclick=()=>sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/"}});
  const s=document.getElementById("g_send");if(s)s.onclick=async()=>{const em=document.getElementById("g_email").value.trim();if(!em)return;const {error}=await sb.auth.signInWithOtp({email:em,options:{emailRedirectTo:location.origin+"/"}});if(error){loginView("Invio non riuscito: "+error.message);return}document.getElementById("g_code").hidden=false};
  const v=document.getElementById("g_verify");if(v)v.onclick=async()=>{const em=document.getElementById("g_email").value.trim(),tk=document.getElementById("g_otp").value.trim();const {error}=await sb.auth.verifyOtp({email:em,token:tk,type:"email"});if(error)loginView("Codice non valido o scaduto")}}
function pendingView(){gate(`<p>Ciao <b>${esc(profile?.name||profile?.email||"")}</b>, il tuo account (${esc(profile?.email||"")}) è registrato.</p><p>Un allenatore deve ancora <b>approvarti</b> nella pagina Accessi. Riapri l'app più tardi.</p><button class="gbtn2" id="g_re">Ricarica</button> <button class="gbtn2" id="g_out">Esci</button>`);
  document.getElementById("g_re").onclick=()=>location.reload();document.getElementById("g_out").onclick=async()=>{await sb.auth.signOut();location.reload()}}
async function loadProfile(){const key="ultra.prof."+session.user.id;for(let k=0;k<5;k++){let res=null;try{res=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle()}catch(e){res={error:e}}
  if(res&&res.data){profile=res.data;try{localStorage.setItem(key,JSON.stringify(profile))}catch(_){}return}
  if(res&&res.error&&isNet(res.error)){try{const c=JSON.parse(localStorage.getItem(key)||"null");if(c){profile=c;setOff(true);return}}catch(_){}}
  await new Promise(r=>setTimeout(r,600))}}
async function start(s){session=s;if(!session){loginView();return}await loadProfile();if(!profile||profile.role==="pending"){pendingView();return}gateOff();readyRes()}
sb.auth.onAuthStateChange((ev,s)=>{if(ev==="SIGNED_OUT"){location.reload();return}if(ev==="SIGNED_IN"&&!session)start(s)});
const domReady=new Promise(r=>document.readyState==="loading"?document.addEventListener("DOMContentLoaded",r,{once:true}):r());
sb.auth.getSession().then(async({data})=>{await domReady;start(data.session)});
/* ---- database: collezioni e documenti sopra la tabella "docs" ---- */
const cache={},subs=[];let rt=false;
/* ---- funzionamento senza rete: copia locale dei dati + coda dei salvataggi ---- */
function isNet(e){const m=String(e?.message||e||"");return !navigator.onLine||/fetch|network|load failed|timed? ?out|ECONN|offline/i.test(m)}
const LSK=()=>"ultra.cache."+(session?.user?.id||"x"),LSQ=()=>"ultra.queue."+(session?.user?.id||"x");
let OFF=false,QN=0,saveT=null;
function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function persist(){clearTimeout(saveT);saveT=setTimeout(()=>{const o={};for(const [c,m] of Object.entries(cache)){o[c]={};for(const [id,d] of m)o[c][id]=d}lsSet(LSK(),{t:Date.now(),c:o})},800)}
function fromLocal(col){const L=lsGet(LSK());const m=L?.c?.[col];if(!m)return false;const mm=cache[col]||new Map();for(const [id,d] of Object.entries(m))if(!mm.has(id))mm.set(id,d);mm.__full=true;cache[col]=mm;return true}
function dm(a,b){const o={...(a||{})};for(const [k,v] of Object.entries(b||{}))o[k]=(v&&typeof v==="object"&&!Array.isArray(v)&&o[k]&&typeof o[k]==="object"&&!Array.isArray(o[k]))?dm(o[k],v):v;return o}
function qGet(){return lsGet(LSQ())||[]}
function qPush(op){const q=qGet();q.push(op);lsSet(LSQ(),q);QN=q.length;badge()}
function setOff(v){if(OFF===v)return;OFF=v;badge()}
function badge(){let b=document.getElementById("offb");if(!document.body)return;if(!OFF&&!QN){b?.remove();return}if(!b){b=document.createElement("div");b.id="offb";b.setAttribute("role","status");b.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:60;background:#111;color:#fff;border-radius:999px;padding:7px 14px;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:92vw;text-align:center";document.body.appendChild(b)}
  b.textContent=OFF?(QN?`📴 Senza rete · ${QN} ${QN>1?"modifiche salvate":"modifica salvata"} sul telefono`:"📴 Senza rete · vedi l'ultima copia salvata"):`🔄 Sincronizzo ${QN} ${QN>1?"modifiche":"modifica"}…`}
let flushing=false;
async function flush(){if(flushing)return;const q=qGet();QN=q.length;if(!q.length){setOff(!navigator.onLine);badge();return}if(!navigator.onLine){setOff(true);return}flushing=true;badge();
  try{while(true){const q2=qGet();if(!q2.length)break;const op=q2[0];let error=null;
      try{if(op.k==="set")({error}=await sb.from("docs").upsert({col:op.col,id:op.id,data:op.d}));else if(op.k==="update")({error}=await sb.rpc("merge_doc",{p_col:op.col,p_id:op.id,p_patch:op.d}));else ({error}=await sb.from("docs").delete().eq("col",op.col).eq("id",op.id))}catch(e){error=e}
      if(error&&isNet(error)){setOff(true);break}
      if(error)console.warn("Modifica scartata",op,error);q2.shift();lsSet(LSQ(),q2);QN=q2.length}
    if(!qGet().length){setOff(false);for(const c of Object.keys(cache)){if(cache[c].__full){cache[c].__full=false;try{await loadCol(c);for(const s of subs.slice())if(s.col===c)try{s.fire()}catch(e){}}catch(e){}}}}}
  finally{flushing=false;QN=qGet().length;badge()}}
window.addEventListener("online",()=>flush());window.addEventListener("offline",()=>setOff(true));setInterval(()=>{if(qGet().length)flush()},30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&qGet().length)flush()});
const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
const snap=(id,d)=>({id,exists:d!==undefined&&d!==null,data:()=>clone(d)??undefined,metadata:{}});
const emit=(col,id)=>{for(const s of subs.slice())if(s.col===col&&(!s.id||s.id===id))try{s.fire()}catch(e){console.error(e)}};
const errOf=e=>{const m=String(e?.message||e||"");const x=new Error(m);x.code=/row-level|permission|42501|not allowed/i.test(m+String(e?.code||""))?"invalid_argument":(/not_found|P0002/.test(m+String(e?.code||""))?"not_found":"unknown");return x};
function realtime(){if(rt)return;rt=true;sb.channel("docs-rt").on("postgres_changes",{event:"*",schema:"public",table:"docs"},p=>{const r=(p.new&&p.new.col)?p.new:p.old;if(!r||!cache[r.col])return;if(p.eventType==="DELETE")cache[r.col].delete(r.id);else cache[r.col].set(r.id,p.new.data);emit(r.col,r.id)}).subscribe()}
async function loadCol(col){if(cache[col]&&cache[col].__full)return;const m=cache[col]||new Map();let from=0;
  try{for(;;){let res;try{res=await sb.from("docs").select("id,data").eq("col",col).range(from,from+999)}catch(e){res={error:e}}const {data,error}=res;if(error)throw error;for(const r of data)m.set(r.id,r.data);if(data.length<1000)break;from+=1000}}
  catch(e){if(isNet(e)&&fromLocal(col)){setOff(true);applyQueue(col);return}throw errOf(e)}
  m.__full=true;cache[col]=m;applyQueue(col);persist()}
function applyQueue(col){for(const op of qGet()){if(op.col!==col)continue;const m=cache[col]||(cache[col]=new Map());if(op.k==="set")m.set(op.id,op.d);else if(op.k==="update")m.set(op.id,dm(m.get(op.id),op.d));else m.delete(op.id)}}
const sp=p=>{const i=p.indexOf("/");return [p.slice(0,i),p.slice(i+1)]};
const db={collection(col){return{onSnapshot(cb,err){const s={col,fire:()=>{const docs=[...cache[col].entries()].map(([id,d])=>snap(id,d));cb({docs,size:docs.length,empty:!docs.length})}};loadCol(col).then(()=>{subs.push(s);s.fire();realtime()}).catch(e=>err&&err(errOf(e)));return()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}}}},
  doc(path){const [col,id]=sp(path);return{
    onSnapshot(cb,err){const s={col,id,fire:()=>cb(snap(id,cache[col]?.get(id)))};(async()=>{if(!cache[col])cache[col]=new Map();if(!cache[col].has(id)){let res;try{res=await sb.from("docs").select("data").eq("col",col).eq("id",id).maybeSingle()}catch(e){res={error:e}}const {data,error}=res;
      if(error){const L=lsGet(LSK());const d=L?.c?.[col]?.[id];if(isNet(error)&&d!==undefined){cache[col].set(id,d);setOff(true);applyQueue(col)}else if(!isNet(error)){err&&err(errOf(error));return}else setOff(true)}
      else{if(data)cache[col].set(id,data.data);applyQueue(col);persist()}}subs.push(s);s.fire();realtime()})();return()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}},
    async get(){const {data,error}=await sb.from("docs").select("data").eq("col",col).eq("id",id).maybeSingle();if(error)throw errOf(error);return snap(id,data?.data)},
    async set(d){let error=null;if(!qGet().length&&navigator.onLine){try{({error}=await sb.from("docs").upsert({col,id,data:d}))}catch(e){error=e}}else error={message:"offline queue"};
      if(error&&!isNet(error)&&!/offline queue/.test(error.message))throw errOf(error);if(error){qPush({k:"set",col,id,d:clone(d)});setOff(!navigator.onLine||OFF);flush()}
      (cache[col]=cache[col]||new Map()).set(id,clone(d));persist();emit(col,id)},
    async update(patch){let res={error:{message:"offline queue"}};if(!qGet().length&&navigator.onLine){try{res=await sb.rpc("merge_doc",{p_col:col,p_id:id,p_patch:patch})}catch(e){res={error:e}}}const {data,error}=res;
      if(error&&!isNet(error)&&!/offline queue/.test(error.message))throw errOf(error);const m=(cache[col]=cache[col]||new Map());
      if(error){qPush({k:"update",col,id,d:clone(patch)});m.set(id,dm(m.get(id),patch));setOff(!navigator.onLine||OFF);flush()}else m.set(id,data);persist();emit(col,id)},
    async delete(){let error={message:"offline queue"};if(!qGet().length&&navigator.onLine){try{({error}=await sb.from("docs").delete().eq("col",col).eq("id",id))}catch(e){error=e}}
      if(error&&!isNet(error)&&!/offline queue/.test(error.message))throw errOf(error);if(error){qPush({k:"delete",col,id});setOff(!navigator.onLine||OFF);flush()}cache[col]?.delete(id);persist();emit(col,id)}}}};
const user={isOwner:async()=>profile?.role==="admin",canEdit:async()=>STAFF.includes(profile?.role),can:async()=>null,id:async()=>session?.user?.id||null,
  me:async()=>({id:session?.user?.id||null,name:profile?.name||session?.user?.user_metadata?.full_name||"",email:profile?.email||session?.user?.email||null,avatarUrl:session?.user?.user_metadata?.avatar_url||"",color:"#C8102E",isOwner:profile?.role==="admin",canEdit:STAFF.includes(profile?.role)}),
  role:()=>profile?.role,profiles:async()=>({})};
window.claude={use:async n=>{await ready;return n==="db"?db:(n==="user"?user:null)}};
ready.then(()=>{QN=qGet().length;if(QN)flush();badge()});
if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();
