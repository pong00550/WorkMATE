import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, onSnapshot,
  writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const KEY_TASKS='pwm_tasks_v1';
const KEY_EXP='pwm_expenses_v1';
const KEY_MIGRATED='pwm_cloud_migrated_uid';

let taskFilter='open';
let expenseFilter='all';
let deferredPrompt=null;
let currentUser=null;
let unsubTasks=null;
let unsubExpenses=null;

function load(key,fallback=[]){
  try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}
}
function save(key,data){localStorage.setItem(key,JSON.stringify(data))}

let tasks=load(KEY_TASKS,[]);
let expenses=load(KEY_EXP,[]);

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});

await setPersistence(auth,browserLocalPersistence);

function money(n){
  return new Intl.NumberFormat('th-TH',{
    style:'currency',currency:'THB',maximumFractionDigits:0
  }).format(Number(n||0));
}
function localDate(d=new Date()){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function monthKey(d=localDate()){return d.slice(0,7)}
function esc(s=''){
  return String(s).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}
function priorityLabel(p){
  return ({urgent:'🔴 ด่วนมาก',high:'🟠 สำคัญ',normal:'🟡 ปกติ',low:'⚪ ไม่รีบ'})[p]||p;
}
function isOverdue(t){
  return t.status!=='done'&&t.due&&String(t.due).slice(0,10)<localDate();
}
function monthExpenses(){
  const m=monthKey();
  return expenses.filter(e=>e.date?.startsWith(m));
}
function pendingExpenses(){
  return monthExpenses().filter(e=>e.status!=='reimbursed');
}
function taskPath(){return collection(db,'users',currentUser.uid,'tasks')}
function expensePath(){return collection(db,'users',currentUser.uid,'expenses')}

function setSyncState(state,text=''){
  const dot=document.getElementById('syncDot');
  const head=document.getElementById('headerSync');
  const label=document.getElementById('syncStatus');

  dot?.classList.remove('online','syncing','error');
  head?.classList.remove('syncing','error');

  if(state==='online'){
    dot?.classList.add('online');
    if(head) head.textContent='☁️';
    if(label) label.textContent=text||'ซิงก์แล้ว';
  }
  if(state==='syncing'){
    dot?.classList.add('syncing');
    head?.classList.add('syncing');
    if(head) head.textContent='☁️';
    if(label) label.textContent=text||'กำลังซิงก์...';
  }
  if(state==='error'){
    dot?.classList.add('error');
    head?.classList.add('error');
    if(head) head.textContent='⚠️';
    if(label) label.textContent=text||'ซิงก์ไม่สำเร็จ';
  }
}

function isIOSLike(){
  const ua=navigator.userAgent||'';
  return /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
}

async function login(){
  const btn=document.getElementById('googleSignInBtn');
  btn.disabled=true;

  try{
    // Popup ใช้ได้ดีบน desktop; redirect เสถียรกว่าบน iPhone/PWA
    if(isIOSLike() || window.matchMedia('(display-mode: standalone)').matches){
      await signInWithRedirect(auth,provider);
    }else{
      await signInWithPopup(auth,provider);
    }
  }catch(err){
    console.error('Login error',err);
    btn.disabled=false;
    alert('เข้าสู่ระบบไม่สำเร็จ: '+(err.code||'')+' '+(err.message||err));
  }
}

try{
  await getRedirectResult(auth);
}catch(err){
  console.error('Redirect login error',err);
  alert('เข้าสู่ระบบไม่สำเร็จ: '+(err.code||'')+' '+(err.message||err));
}

async function migrateLocalDataOnce(){
  if(!currentUser) return;
  if(localStorage.getItem(KEY_MIGRATED)===currentUser.uid) return;

  const localTasks=load(KEY_TASKS,[]);
  const localExpenses=load(KEY_EXP,[]);

  if(!localTasks.length&&!localExpenses.length){
    localStorage.setItem(KEY_MIGRATED,currentUser.uid);
    return;
  }

  setSyncState('syncing','กำลังย้ายข้อมูลในเครื่องขึ้น Cloud...');
  const batch=writeBatch(db);

  for(const t of localTasks){
    if(!t.id) continue;
    batch.set(
      doc(db,'users',currentUser.uid,'tasks',t.id),
      {...t,updatedAt:serverTimestamp()},
      {merge:true}
    );
  }

  for(const e of localExpenses){
    if(!e.id) continue;
    batch.set(
      doc(db,'users',currentUser.uid,'expenses',e.id),
      {...e,updatedAt:serverTimestamp()},
      {merge:true}
    );
  }

  try{
    await batch.commit();
    localStorage.setItem(KEY_MIGRATED,currentUser.uid);
  }catch(err){
    console.error(err);
    setSyncState('error','ย้ายข้อมูลเก่าไม่สำเร็จ');
  }
}

function subscribeCloud(){
  if(unsubTasks) unsubTasks();
  if(unsubExpenses) unsubExpenses();

  setSyncState('syncing');

  unsubTasks=onSnapshot(taskPath(),snap=>{
    tasks=snap.docs.map(d=>({id:d.id,...d.data()}));
    save(KEY_TASKS,tasks);
    render();
    setSyncState('online');
  },err=>{
    console.error(err);
    setSyncState('error','อ่าน Tasks ไม่สำเร็จ');
  });

  unsubExpenses=onSnapshot(expensePath(),snap=>{
    expenses=snap.docs.map(d=>({id:d.id,...d.data()}));
    save(KEY_EXP,expenses);
    render();
    setSyncState('online');
  },err=>{
    console.error(err);
    setSyncState('error','อ่าน Expenses ไม่สำเร็จ');
  });
}

async function upsertTask(t){
  if(!currentUser) throw new Error('Not signed in');
  setSyncState('syncing');
  await setDoc(
    doc(db,'users',currentUser.uid,'tasks',t.id),
    {...t,updatedAt:serverTimestamp()},
    {merge:true}
  );
}

async function upsertExpense(e){
  if(!currentUser) throw new Error('Not signed in');
  setSyncState('syncing');
  await setDoc(
    doc(db,'users',currentUser.uid,'expenses',e.id),
    {...e,updatedAt:serverTimestamp()},
    {merge:true}
  );
}

function taskCard(t){
  return `<article class="task-card">
    <div class="task-title">${esc(t.title)}</div>
    ${t.details?`<div style="color:#667085;margin-top:4px">${esc(t.details)}</div>`:''}
    <div class="task-meta">
      <span class="pill">${priorityLabel(t.priority)}</span>
      <span class="pill">${esc(t.category||'')}</span>
      ${t.due?`<span class="pill">📅 ${String(t.due).replace('T',' ')}</span>`:''}
      ${isOverdue(t)?'<span class="pill" style="color:#b42318;background:#fee4e2">เลยกำหนด</span>':''}
    </div>
    ${t.status!=='done'?`<div class="card-actions">
      <button class="soft-btn" onclick="window.PWM.setTaskStatus('${t.id}','doing')">กำลังทำ</button>
      <button class="done-btn" onclick="window.PWM.setTaskStatus('${t.id}','done')">✓ เสร็จแล้ว</button>
    </div>`:''}
  </article>`;
}

function expenseCard(e){
  const status=({
    not_submitted:'🔴 ยังไม่เบิก',
    submitted:'🟡 ส่งเบิกแล้ว',
    reimbursed:'🟢 เบิกสำเร็จ'
  })[e.status]||e.status;

  return `<article class="expense-card">
    <div class="expense-title">${esc(e.item)}</div>
    <div class="amount">${money(e.amount)}</div>
    <div class="expense-meta">
      <span class="pill">${esc(e.category||'')}</span>
      <span class="pill">${esc(e.payment||'')}</span>
      <span class="pill">${status}</span>
      <span class="pill">📅 ${e.date||''}</span>
    </div>
  </article>`;
}

function render(){
  document.getElementById('todayLabel').textContent=
    new Intl.DateTimeFormat('th-TH',{
      weekday:'long',day:'numeric',month:'long'
    }).format(new Date());

  const open=tasks.filter(t=>t.status!=='done');

  document.getElementById('homeTaskCount').textContent=open.length;
  document.getElementById('homeOverdueCount').textContent=open.filter(isOverdue).length;
  document.getElementById('homeExpenseMonth').textContent=
    money(monthExpenses().reduce((a,e)=>a+Number(e.amount||0),0));
  document.getElementById('homePendingExpense').textContent=
    money(pendingExpenses().reduce((a,e)=>a+Number(e.amount||0),0));

  const rank={urgent:1,high:2,normal:3,low:4};
  const pri=[...open]
    .sort((a,b)=>(rank[a.priority]||9)-(rank[b.priority]||9))
    .slice(0,3);

  document.getElementById('priorityTasks').innerHTML=
    pri.length?pri.map(taskCard).join(''):'<div class="empty">ไม่มีงานค้าง 🎉</div>';

  document.getElementById('recentExpenses').innerHTML=
    expenses.length
      ?[...expenses]
        .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))
        .slice(0,3).map(expenseCard).join('')
      :'<div class="empty">ยังไม่มีค่าใช้จ่าย</div>';

  const tl=tasks.filter(t=>
    taskFilter==='done'
      ?t.status==='done'
      :taskFilter==='today'
        ?t.status!=='done'&&t.due?.slice(0,10)===localDate()
        :t.status!=='done'
  );

  document.getElementById('taskList').innerHTML=
    tl.length?tl.map(taskCard).join(''):'<div class="empty">ไม่มีรายการ</div>';

  const mexp=monthExpenses();

  document.getElementById('expenseMonthTotal').textContent=
    money(mexp.reduce((a,e)=>a+Number(e.amount||0),0));

  document.getElementById('expensePendingTotal').textContent=
    `รอเบิก ${money(pendingExpenses().reduce((a,e)=>a+Number(e.amount||0),0))}`;

  const el=mexp.filter(e=>
    expenseFilter==='pending'
      ?e.status!=='reimbursed'
      :expenseFilter==='credit'
        ?String(e.payment||'').includes('บัตรเครดิต')
        :true
  );

  document.getElementById('expenseList').innerHTML=
    el.length?el.map(expenseCard).join(''):'<div class="empty">ไม่มีรายการ</div>';
}

async function setTaskStatus(id,status){
  const t=tasks.find(x=>x.id===id);
  if(!t) return;

  t.status=status;
  save(KEY_TASKS,tasks);
  render();

  try{
    await upsertTask(t);
  }catch(err){
    console.error(err);
    alert('เปลี่ยนสถานะในเครื่องแล้ว แต่ Cloud Sync ไม่สำเร็จ');
  }
}

function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));

  const target=document.getElementById(page+'Page');
  if(target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(b=>
    b.classList.toggle('active',b.dataset.page===page)
  );

  document.getElementById('pageTitle').textContent=({
    home:'วันนี้',
    tasks:'งานของฉัน',
    expenses:'ค่าใช้จ่าย',
    more:'ตั้งค่า'
  })[page]||'Pong WorkMate';

  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-page]').forEach(b=>
  b.addEventListener('click',()=>showPage(b.dataset.page))
);

document.querySelectorAll('[data-go]').forEach(b=>
  b.addEventListener('click',()=>showPage(b.dataset.go))
);

document.querySelectorAll('[data-task-filter]').forEach(b=>
  b.addEventListener('click',()=>{
    taskFilter=b.dataset.taskFilter;
    document.querySelectorAll('[data-task-filter]')
      .forEach(x=>x.classList.toggle('active',x===b));
    render();
  })
);

document.querySelectorAll('[data-expense-filter]').forEach(b=>
  b.addEventListener('click',()=>{
    expenseFilter=b.dataset.expenseFilter;
    document.querySelectorAll('[data-expense-filter]')
      .forEach(x=>x.classList.toggle('active',x===b));
    render();
  })
);

const quick=document.getElementById('quickSheet');
const taskModal=document.getElementById('taskModal');
const expenseModal=document.getElementById('expenseModal');

document.getElementById('fab').onclick=()=>quick.classList.add('show');
document.querySelector('[data-close-sheet]').onclick=()=>quick.classList.remove('show');

document.querySelectorAll('[data-add]').forEach(b=>{
  b.onclick=()=>{
    quick.classList.remove('show');
    (b.dataset.add==='task'?taskModal:expenseModal).classList.add('show');
  };
});

document.querySelectorAll('[data-close-modal]').forEach(b=>{
  b.onclick=()=>b.closest('.sheet-backdrop').classList.remove('show');
});

[quick,taskModal,expenseModal].forEach(x=>{
  x.addEventListener('click',e=>{
    if(e.target===x) x.classList.remove('show');
  });
});

document.getElementById('taskForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=new FormData(e.target);

  const t={
    id:crypto.randomUUID(),
    title:f.get('title'),
    details:f.get('details'),
    priority:f.get('priority'),
    category:f.get('category'),
    due:f.get('due'),
    status:'open',
    createdAtLocal:new Date().toISOString()
  };

  tasks.unshift(t);
  save(KEY_TASKS,tasks);
  render();

  e.target.reset();
  taskModal.classList.remove('show');

  try{
    await upsertTask(t);
  }catch{
    alert('บันทึกในเครื่องแล้ว แต่ Cloud Sync ยังไม่สำเร็จ');
  }
});

document.getElementById('expenseForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=new FormData(e.target);

  const exp={
    id:crypto.randomUUID(),
    amount:Number(f.get('amount')),
    item:f.get('item'),
    category:f.get('category'),
    payment:f.get('payment'),
    status:f.get('status'),
    date:f.get('date'),
    note:f.get('note'),
    createdAtLocal:new Date().toISOString()
  };

  expenses.unshift(exp);
  save(KEY_EXP,expenses);
  render();

  e.target.reset();
  e.target.elements.date.value=localDate();
  expenseModal.classList.remove('show');

  try{
    await upsertExpense(exp);
  }catch{
    alert('บันทึกในเครื่องแล้ว แต่ Cloud Sync ยังไม่สำเร็จ');
  }
});

document.querySelector('#expenseForm [name=date]').value=localDate();

document.getElementById('googleSignInBtn').addEventListener('click',login);
document.getElementById('signOutBtn').addEventListener('click',()=>signOut(auth));

onAuthStateChanged(auth,async user=>{
  currentUser=user;

  if(!user){
    if(unsubTasks) unsubTasks();
    if(unsubExpenses) unsubExpenses();

    document.getElementById('authGate').classList.remove('hidden');
    document.getElementById('googleSignInBtn').disabled=false;
    return;
  }

  document.getElementById('authGate').classList.add('hidden');
  document.getElementById('accountName').textContent=user.displayName||'Pong WorkMate';
  document.getElementById('accountEmail').textContent=user.email||'';
  document.getElementById('accountAvatar').textContent=
    (user.displayName||user.email||'P').trim().charAt(0).toUpperCase();

  await migrateLocalDataOnce();
  subscribeCloud();
});

window.PWM={setTaskStatus};

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredPrompt=e;
  document.getElementById('installBtn').hidden=false;
});

document.getElementById('installBtn').onclick=async()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  document.getElementById('installBtn').hidden=true;
};

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  });
}

render();
