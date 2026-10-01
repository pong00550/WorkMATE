
const KEY_TASKS='pwm_tasks_v1';
const KEY_EXP='pwm_expenses_v1';
let taskFilter='open', expenseFilter='all', deferredPrompt=null;

const seedTasks=[
  {id:crypto.randomUUID(),title:'เอาของตัวอย่างที่พี่แพรวของอยู่หน้า shop1',details:'',priority:'normal',category:'📞 Follow-up',due:new Date().toISOString().slice(0,16),status:'doing'}
];

function load(key, fallback=[]){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
function save(key,data){localStorage.setItem(key,JSON.stringify(data))}
let tasks=load(KEY_TASKS,seedTasks); let expenses=load(KEY_EXP,[]);
if(!localStorage.getItem(KEY_TASKS)) save(KEY_TASKS,tasks);

function money(n){return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n||0))}
function localDate(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function monthKey(d=localDate()){return d.slice(0,7)}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function priorityLabel(p){return({urgent:'🔴 ด่วนมาก',high:'🟠 สำคัญ',normal:'🟡 ปกติ',low:'⚪ ไม่รีบ'})[p]||p}
function isOverdue(t){return t.status!=='done'&&t.due&&t.due.slice(0,10)<localDate()}
function monthExpenses(){const m=monthKey();return expenses.filter(e=>e.date?.startsWith(m))}
function pendingExpenses(){return monthExpenses().filter(e=>e.status!=='reimbursed')}

function taskCard(t){
  return `<article class="task-card">
    <div class="task-title">${esc(t.title)}</div>
    ${t.details?`<div style="color:#667085;margin-top:4px">${esc(t.details)}</div>`:''}
    <div class="task-meta">
      <span class="pill">${priorityLabel(t.priority)}</span>
      <span class="pill">${esc(t.category)}</span>
      ${t.due?`<span class="pill">📅 ${t.due.replace('T',' ')}</span>`:''}
      ${isOverdue(t)?'<span class="pill" style="color:#b42318;background:#fee4e2">เลยกำหนด</span>':''}
    </div>
    ${t.status!=='done'?`<div class="card-actions">
      <button class="soft-btn" onclick="setTaskStatus('${t.id}','doing')">กำลังทำ</button>
      <button class="done-btn" onclick="setTaskStatus('${t.id}','done')">✓ เสร็จแล้ว</button>
    </div>`:''}
  </article>`
}
function expenseCard(e){
  const status=({not_submitted:'🔴 ยังไม่เบิก',submitted:'🟡 ส่งเบิกแล้ว',reimbursed:'🟢 เบิกสำเร็จ'})[e.status]||e.status;
  return `<article class="expense-card">
    <div class="expense-title">${esc(e.item)}</div>
    <div class="amount">${money(e.amount)}</div>
    <div class="expense-meta">
      <span class="pill">${esc(e.category)}</span><span class="pill">${esc(e.payment)}</span><span class="pill">${status}</span><span class="pill">📅 ${e.date}</span>
    </div>
  </article>`
}

function render(){
  document.getElementById('todayLabel').textContent=new Intl.DateTimeFormat('th-TH',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  const open=tasks.filter(t=>t.status!=='done');
  document.getElementById('homeTaskCount').textContent=open.length;
  document.getElementById('homeOverdueCount').textContent=open.filter(isOverdue).length;
  document.getElementById('homeExpenseMonth').textContent=money(monthExpenses().reduce((a,e)=>a+Number(e.amount||0),0));
  document.getElementById('homePendingExpense').textContent=money(pendingExpenses().reduce((a,e)=>a+Number(e.amount||0),0));

  const pri=[...open].sort((a,b)=>({urgent:1,high:2,normal:3,low:4}[a.priority]-({urgent:1,high:2,normal:3,low:4}[b.priority]))).slice(0,3);
  document.getElementById('priorityTasks').innerHTML=pri.length?pri.map(taskCard).join(''):'<div class="empty">ไม่มีงานค้าง 🎉</div>';
  document.getElementById('recentExpenses').innerHTML=expenses.length?[...expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(expenseCard).join(''):'<div class="empty">ยังไม่มีค่าใช้จ่าย</div>';

  let tl=tasks.filter(t=>taskFilter==='done'?t.status==='done':taskFilter==='today'?t.status!=='done'&&t.due?.slice(0,10)===localDate():t.status!=='done');
  document.getElementById('taskList').innerHTML=tl.length?tl.map(taskCard).join(''):'<div class="empty">ไม่มีรายการ</div>';

  const mexp=monthExpenses();
  document.getElementById('expenseMonthTotal').textContent=money(mexp.reduce((a,e)=>a+Number(e.amount||0),0));
  document.getElementById('expensePendingTotal').textContent=`รอเบิก ${money(pendingExpenses().reduce((a,e)=>a+Number(e.amount||0),0))}`;
  let el=mexp.filter(e=>expenseFilter==='pending'?e.status!=='reimbursed':expenseFilter==='credit'?e.payment.includes('บัตรเครดิต'):true);
  document.getElementById('expenseList').innerHTML=el.length?el.map(expenseCard).join(''):'<div class="empty">ไม่มีรายการ</div>';
}
function setTaskStatus(id,status){const t=tasks.find(x=>x.id===id);if(t){t.status=status;save(KEY_TASKS,tasks);render()}}

function showPage(page){
  if(page==='more'){alert('More จะเพิ่มในเวอร์ชันถัดไป');return}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(page+'Page').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.getElementById('pageTitle').textContent=({home:'วันนี้',tasks:'งานของฉัน',expenses:'ค่าใช้จ่าย'})[page]||'Pong WorkMate';
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.go)));

document.querySelectorAll('[data-task-filter]').forEach(b=>b.addEventListener('click',()=>{
  taskFilter=b.dataset.taskFilter; document.querySelectorAll('[data-task-filter]').forEach(x=>x.classList.toggle('active',x===b));render();
}));
document.querySelectorAll('[data-expense-filter]').forEach(b=>b.addEventListener('click',()=>{
  expenseFilter=b.dataset.expenseFilter; document.querySelectorAll('[data-expense-filter]').forEach(x=>x.classList.toggle('active',x===b));render();
}));

const quick=document.getElementById('quickSheet'),taskModal=document.getElementById('taskModal'),expenseModal=document.getElementById('expenseModal');
document.getElementById('fab').onclick=()=>quick.classList.add('show');
document.querySelector('[data-close-sheet]').onclick=()=>quick.classList.remove('show');
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
  quick.classList.remove('show'); (b.dataset.add==='task'?taskModal:expenseModal).classList.add('show');
});
document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>b.closest('.sheet-backdrop').classList.remove('show'));
[quick,taskModal,expenseModal].forEach(x=>x.addEventListener('click',e=>{if(e.target===x)x.classList.remove('show')}));

document.getElementById('taskForm').addEventListener('submit',e=>{
  e.preventDefault(); const f=new FormData(e.target);
  tasks.unshift({id:crypto.randomUUID(),title:f.get('title'),details:f.get('details'),priority:f.get('priority'),category:f.get('category'),due:f.get('due'),status:'open'});
  save(KEY_TASKS,tasks);e.target.reset();taskModal.classList.remove('show');render();
});
document.getElementById('expenseForm').addEventListener('submit',e=>{
  e.preventDefault(); const f=new FormData(e.target);
  expenses.unshift({id:crypto.randomUUID(),amount:Number(f.get('amount')),item:f.get('item'),category:f.get('category'),payment:f.get('payment'),status:f.get('status'),date:f.get('date'),note:f.get('note')});
  save(KEY_EXP,expenses);e.target.reset();e.target.elements.date.value=localDate();expenseModal.classList.remove('show');render();
});
document.querySelector('#expenseForm [name=date]').value=localDate();

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').hidden=false});
document.getElementById('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById('installBtn').hidden=true}};
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
render();
