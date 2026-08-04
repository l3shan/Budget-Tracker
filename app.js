/* ============ CONFIG ============ */
const DEFAULT_EXPENSE_CATEGORIES = ["Food","Transport","Rent & Housing","Data & Airtime","Textbooks & Supplies","Entertainment","Health","Other"];
const DEFAULT_INCOME_CATEGORIES = ["Allowance","Part-time Job","Scholarship","Gift","Other Income"];
const CATEGORY_COLORS = {
  "Food":"#D4A537","Transport":"#4E7C59","Rent & Housing":"#8E6BAE","Data & Airtime":"#4B87B0",
  "Textbooks & Supplies":"#B7472A","Entertainment":"#D97757","Health":"#6BAE9E","Other":"#8A8A8A",
  "Allowance":"#4E7C59","Part-time Job":"#3F6B8C","Scholarship":"#D4A537","Gift":"#B85C9E","Other Income":"#7E8A72"
};
// Palette used for custom categories that don't have a fixed color above — picked deterministically per name.
const CUSTOM_COLOR_PALETTE = ["#C9762B","#5D8A66","#7A6BAE","#3F8FA8","#B0527A","#8A9A3F","#4E6B8C","#A8622E"];

let currentUser = null;   // {username, name, currency}
let transactions = [];    // {id,type,description,amount,category,date,recurringId?}
let budgets = {};         // {category: {amount, description}}
let savingsGoals = [];
let recurringItems = [];  // {id,description,amount,type,category,dayOfMonth,active,lastGeneratedMonth}
let customCategories = { income: [], expense: [] };
let selectedTxType = "income";
let editingTxId = null;
let txSortField = 'date';
let txSortDir = 'desc';

function getExpenseCategories(){ return [...DEFAULT_EXPENSE_CATEGORIES, ...customCategories.expense]; }
function getIncomeCategories(){ return [...DEFAULT_INCOME_CATEGORIES, ...customCategories.income]; }
function getCategoryColor(name){
  if(CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let hash = 0;
  for(let i=0;i<name.length;i++){ hash = (hash*31 + name.charCodeAt(i)) >>> 0; }
  return CUSTOM_COLOR_PALETTE[hash % CUSTOM_COLOR_PALETTE.length];
}

/* ============ STORAGE HELPERS ============ */
// Fallback in-memory store, used only if window.storage isn't available in this environment
// (data won't survive a refresh in that case, but the app still works for the session).
const _memStore = {};
const hasRealStorage = (typeof window.storage !== 'undefined' && window.storage && typeof window.storage.get === 'function');

async function storeGet(key){
  if(!hasRealStorage){ return _memStore.hasOwnProperty(key) ? _memStore[key] : null; }
  try{ const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
  catch(e){ return null; }
}
async function storeSet(key, value){
  if(!hasRealStorage){ _memStore[key] = value; return true; }
  try{ await window.storage.set(key, JSON.stringify(value)); return true; }
  catch(e){ console.error("storage set failed", e); return false; }
}
async function storeDelete(key){
  if(!hasRealStorage){ delete _memStore[key]; return true; }
  try{ await window.storage.delete(key); return true; }
  catch(e){ return false; } // key may not exist — fine either way
}

/* ============ BOOT ============ */
window.addEventListener('DOMContentLoaded', boot);

async function boot(){
  buildCategoryChips();
  populateCategorySelects();
  await new Promise(r=>setTimeout(r, 550)); // brief, honest loading beat
  const session = await storeGet('session');
  document.getElementById('loadingScreen').style.opacity = '0';
  document.getElementById('loadingScreen').style.transition = 'opacity .3s ease';
  setTimeout(()=> document.getElementById('loadingScreen').style.display='none', 300);

  if(session && session.username){
    await loadUserSession(session.username);
  } else {
    document.getElementById('authScreen').style.display = 'flex';
  }
}

/* ============ AUTH ============ */
function switchAuthTab(tab){
  document.getElementById('tabLogin').classList.toggle('active', tab==='login');
  document.getElementById('tabRegister').classList.toggle('active', tab==='register');
  document.getElementById('loginForm').style.display = tab==='login' ? 'block':'none';
  document.getElementById('registerForm').style.display = tab==='register' ? 'block':'none';
}

async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function validatePasswordStrength(pw){
  if(pw.length < 6) return {ok:false, message:'Password must be at least 6 characters.'};
  if(!/[A-Z]/.test(pw)) return {ok:false, message:'Password needs at least one capital letter.'};
  if(!/[^A-Za-z0-9]/.test(pw)) return {ok:false, message:'Password needs at least one symbol (e.g. ! @ # $).'};
  return {ok:true};
}

function togglePasswordVisibility(inputId, btn){
  const input = document.getElementById(inputId);
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? 'Show' : 'Hide';
}

function updatePasswordHint(){
  const pw = document.getElementById('regPassword').value;
  const hint = document.getElementById('regPasswordHint');
  if(!pw){
    hint.textContent = 'At least 6 characters, one capital letter, and one symbol (e.g. ! @ # $).';
    hint.classList.remove('invalid');
    return;
  }
  const check = validatePasswordStrength(pw);
  hint.textContent = check.ok ? '✓ Looks good.' : check.message;
  hint.classList.toggle('invalid', !check.ok);
}

async function handleRegister(e){
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUsername').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const currency = document.getElementById('regCurrency').value;
  const errEl = document.getElementById('registerError');
  errEl.textContent = '';

  if(!/^[a-z0-9_]{3,20}$/.test(username)){
    errEl.textContent = 'Username: 3-20 characters, letters/numbers/underscore only.';
    return false;
  }
  const pwCheck = validatePasswordStrength(password);
  if(!pwCheck.ok){
    errEl.textContent = pwCheck.message;
    return false;
  }
  const existing = await storeGet('user:'+username);
  if(existing){
    errEl.textContent = 'That username is already taken.';
    return false;
  }
  const passwordHash = await sha256(password);
  const userRecord = {username, name, currency, passwordHash, createdAt: Date.now()};
  await storeSet('user:'+username, userRecord);
  await storeSet('transactions:'+username, []);
  await storeSet('budgets:'+username, {});
  await storeSet('goals:'+username, []);
  await storeSet('recurring:'+username, []);
  await storeSet('customCategories:'+username, {income:[], expense:[]});
  await storeSet('session', {username});
  showToast('Account created — welcome to BudgetBuddy, '+name.split(' ')[0]+'!', 'success');
  enterApp(userRecord, { tx:[], bud:{}, goals:[], recurring:[], custom:{income:[],expense:[]} });
  return false;
}

async function handleLogin(e){
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  const user = await storeGet('user:'+username);
  if(!user){ errEl.textContent = 'No account with that username.'; return false; }
  const hash = await sha256(password);
  if(hash !== user.passwordHash){ errEl.textContent = 'Incorrect password.'; return false; }

  await storeSet('session', {username});
  const data = await fetchAllUserData(username);
  enterApp(user, data);
  return false;
}

// Used when restoring a session on page load — needs to fetch everything from storage.
async function loadUserSession(username){
  const user = await storeGet('user:'+username);
  if(!user){ document.getElementById('authScreen').style.display='flex'; return; }
  const data = await fetchAllUserData(username);
  enterApp(user, data);
}

async function fetchAllUserData(username){
  const tx = (await storeGet('transactions:'+username)) || [];
  const bud = (await storeGet('budgets:'+username)) || {};
  const goals = (await storeGet('goals:'+username)) || [];
  const recurring = (await storeGet('recurring:'+username)) || [];
  const custom = (await storeGet('customCategories:'+username)) || {income:[], expense:[]};
  return { tx, bud, goals, recurring, custom };
}

// Switches the UI into the dashboard for an already-known user + data (no extra storage round trip).
function enterApp(user, data){
  currentUser = user;
  transactions = data.tx || [];
  budgets = data.bud || {};
  savingsGoals = data.goals || [];
  recurringItems = data.recurring || [];
  customCategories = data.custom || {income:[], expense:[]};

  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('app').classList.add('active');
  document.getElementById('greeting').textContent = 'Welcome back, ' + user.name.split(' ')[0];
  document.getElementById('sideUserName').textContent = user.name;
  document.getElementById('sideUserSub').textContent = '@'+user.username;
  document.getElementById('sideAvatar').textContent = user.name.charAt(0).toUpperCase();

  document.getElementById('txDate').valueAsDate = new Date();
  populateCategorySelects();
  processRecurringTransactions().then(()=>{
    populateReportMonths();
    renderAll();
  });
}

function logout(){
  storeDelete('session');
  currentUser = null;
  document.getElementById('app').classList.remove('active');
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('loginForm').reset && document.getElementById('loginForm').reset();
}

/* ============ NAV ============ */
function switchView(view){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.view===view));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  if(view==='transactions'){ renderTransactionsView(); renderRecurringList(); }
  if(view==='budgets') renderBudgetsView();
  if(view==='reports'){ renderReportPreview(); renderSpendingHistory(); }
  if(view==='profile') renderProfileView();
}

/* ============ CATEGORY UI HELPERS ============ */
function buildCategoryChips(){
  renderChipsFor(selectedTxType);
}
function renderChipsFor(type){
  const wrap = document.getElementById('txCategoryChips');
  wrap.innerHTML = '';
  const cats = type==='income' ? getIncomeCategories() : getExpenseCategories();
  cats.forEach((c,i)=>{
    const chip = document.createElement('div');
    chip.className = 'chip' + (i===0 ? ' selected':'');
    chip.textContent = c;
    chip.dataset.cat = c;
    chip.onclick = ()=>{
      wrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('selected'));
      chip.classList.add('selected');
    };
    wrap.appendChild(chip);
  });
}
function setTxType(type){
  selectedTxType = type;
  document.querySelectorAll('.type-toggle button').forEach(b=>b.classList.toggle('active', b.dataset.type===type));
  renderChipsFor(type);
}
function populateCategorySelects(){
  const budgetSel = document.getElementById('budgetCategory');
  budgetSel.innerHTML = getExpenseCategories().map(c=>`<option value="${c}">${c}</option>`).join('');
  const filterSel = document.getElementById('txFilterCategory');
  filterSel.innerHTML = '<option value="all">All categories</option>' +
    [...getIncomeCategories(), ...getExpenseCategories()].map(c=>`<option value="${c}">${c}</option>`).join('');
}

/* ============ TRANSACTIONS CRUD ============ */
function openTransactionModal(tx){
  editingTxId = tx ? tx.id : null;
  document.getElementById('txModalTitle').textContent = tx ? 'Edit transaction' : 'Add transaction';
  const type = tx ? tx.type : 'income';
  setTxType(type);
  document.getElementById('txDescription').value = tx ? tx.description : '';
  document.getElementById('txAmount').value = tx ? tx.amount : '';
  document.getElementById('txDate').value = tx ? tx.date : new Date().toISOString().slice(0,10);
  if(tx){
    setTimeout(()=>{
      document.querySelectorAll('#txCategoryChips .chip').forEach(c=>{
        c.classList.toggle('selected', c.dataset.cat === tx.category);
      });
    },0);
  }
  document.getElementById('transactionModalOverlay').classList.add('active');
}
function closeModal(id){ document.getElementById(id).classList.remove('active'); }

async function saveTransaction(e){
  e.preventDefault();
  const selectedChip = document.querySelector('#txCategoryChips .chip.selected');
  const tx = {
    id: editingTxId || 'tx_' + Date.now() + Math.random().toString(36).slice(2,7),
    type: selectedTxType,
    description: document.getElementById('txDescription').value.trim(),
    amount: parseFloat(document.getElementById('txAmount').value),
    date: document.getElementById('txDate').value,
    category: selectedChip ? selectedChip.dataset.cat : (selectedTxType==='income'?getIncomeCategories()[0]:getExpenseCategories()[0])
  };
  if(editingTxId){
    transactions = transactions.map(t=> t.id===editingTxId ? tx : t);
    showToast('Transaction updated.', 'success');
  } else {
    transactions.push(tx);
    showToast('Transaction added.', 'success');
  }
  await storeSet('transactions:'+currentUser.username, transactions);
  closeModal('transactionModalOverlay');
  document.getElementById('transactionForm').reset();
  editingTxId = null;
  renderAll();
  checkBudgetAlerts(tx.category);
  return false;
}

function editTransaction(id){
  const tx = transactions.find(t=>t.id===id);
  if(tx) openTransactionModal(tx);
}
async function deleteTransaction(id){
  const idx = transactions.findIndex(t=>t.id===id);
  if(idx===-1) return;
  const removed = transactions[idx];
  transactions.splice(idx,1);
  await storeSet('transactions:'+currentUser.username, transactions);
  renderAll();
  showToast('Transaction deleted.', 'warn', async ()=>{
    transactions.splice(idx,0,removed);
    await storeSet('transactions:'+currentUser.username, transactions);
    renderAll();
    showToast('Transaction restored.', 'success');
  });
}

/* ============ BUDGETS ============ */
function openBudgetModal(){
  document.getElementById('budgetForm').reset();
  setBudgetPeriod('monthly');
  document.getElementById('budgetModalOverlay').classList.add('active');
}
function setBudgetPeriod(period){
  document.getElementById('budgetPeriod').value = period;
  document.querySelectorAll('#budgetModalOverlay .type-toggle button').forEach(b=>b.classList.toggle('active', b.dataset.period===period));
  document.getElementById('budgetAmountLabel').textContent = period==='weekly' ? 'Weekly limit' : 'Monthly limit';
}
async function saveBudget(e){
  e.preventDefault();
  const cat = document.getElementById('budgetCategory').value;
  const amt = parseFloat(document.getElementById('budgetAmount').value);
  const desc = document.getElementById('budgetDescription').value.trim();
  const period = document.getElementById('budgetPeriod').value === 'weekly' ? 'weekly' : 'monthly';
  budgets[cat] = { amount: amt, description: desc, period };
  await storeSet('budgets:'+currentUser.username, budgets);
  closeModal('budgetModalOverlay');
  document.getElementById('budgetForm').reset();
  showToast('Budget set for '+cat+'.', 'success');
  renderBudgetsView();
  checkBudgetAlerts(cat);
  return false;
}

/* ============ SAVINGS GOALS ============ */
function openGoalModal(){
  document.getElementById('goalModalOverlay').classList.add('active');
}
async function saveGoal(e){
  e.preventDefault();
  const name = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  savingsGoals.push({ id:'goal_'+Date.now()+Math.random().toString(36).slice(2,6), name, target, saved:0 });
  await storeSet('goals:'+currentUser.username, savingsGoals);
  closeModal('goalModalOverlay');
  document.getElementById('goalForm').reset();
  showToast('Goal "'+name+'" created.', 'success');
  renderGoals();
  return false;
}
async function addFundsToGoal(id){
  const goal = savingsGoals.find(g=>g.id===id);
  if(!goal) return;
  const val = prompt('Add how much to "'+goal.name+'"?');
  if(val===null) return;
  const num = parseFloat(val);
  if(isNaN(num) || num<=0) return;
  const wasComplete = goal.saved >= goal.target;
  goal.saved += num;
  await storeSet('goals:'+currentUser.username, savingsGoals);
  renderGoals();
  if(!wasComplete && goal.saved >= goal.target){
    showToast(`🎉 Goal reached — "${goal.name}" is fully funded!`, 'success');
  } else {
    showToast(fmt(num)+' added to "'+goal.name+'".', 'success');
  }
}
async function deleteGoal(id){
  const idx = savingsGoals.findIndex(g=>g.id===id);
  if(idx===-1) return;
  const removed = savingsGoals[idx];
  savingsGoals.splice(idx,1);
  await storeSet('goals:'+currentUser.username, savingsGoals);
  renderGoals();
  showToast('Goal "'+removed.name+'" removed.', 'warn', async ()=>{
    savingsGoals.splice(idx,0,removed);
    await storeSet('goals:'+currentUser.username, savingsGoals);
    renderGoals();
    showToast('Goal restored.', 'success');
  });
}
function renderGoals(){
  const list = document.getElementById('goalsList');
  const empty = document.getElementById('goalsEmpty');
  if(!savingsGoals.length){ list.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display = 'none';
  list.innerHTML = savingsGoals.map(g=>{
    const pct = Math.min(Math.round((g.saved/g.target)*100), 999);
    const complete = g.saved >= g.target;
    return `
    <div class="goal-card">
      <div class="goal-head">
        <div class="goal-name">${complete?'🎉 ':''}${escapeHtml(g.name)}</div>
        <div class="goal-pct" style="${complete?'color:var(--gold);':''}">${pct}%</div>
      </div>
      <div class="goal-track"><div class="goal-fill ${complete?'complete':''}" style="width:${Math.min(pct,100)}%;"></div></div>
      <div class="goal-amounts mono">${fmtShort(g.saved)} of ${fmtShort(g.target)}</div>
      <div class="goal-actions" style="margin-top:10px;">
        <button class="btn btn-ghost btn-sm" onclick='addFundsToGoal("${g.id}")'>+ Add funds</button>
        <div class="icon-btn danger" onclick='deleteGoal("${g.id}")' title="Delete goal">✕</div>
      </div>
    </div>`;
  }).join('');
}

function currentMonthKey(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function nextMonthKey(mk){
  let [y,m] = mk.split('-').map(Number);
  m++; if(m>12){ m=1; y++; }
  return y+'-'+String(m).padStart(2,'0');
}

/* ============ RECURRING TRANSACTIONS ============ */
// Runs on every login/session-restore. Catches up any months a recurring item hasn't
// generated a transaction for yet (e.g. the student hasn't opened the app in a while).
async function processRecurringTransactions(){
  if(!recurringItems.length) return;
  const nowKey = currentMonthKey();
  let changed = false;
  for(const item of recurringItems){
    if(!item.active) continue;
    let cursor = item.lastGeneratedMonth ? nextMonthKey(item.lastGeneratedMonth) : (item.startMonth || nowKey);
    let iterations = 0;
    while(cursor <= nowKey && iterations < 24){
      const exists = transactions.some(t=>t.recurringId===item.id && t.date.slice(0,7)===cursor);
      if(!exists){
        const [y,m] = cursor.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const day = Math.min(item.dayOfMonth, daysInMonth);
        const dateStr = `${cursor}-${String(day).padStart(2,'0')}`;
        transactions.push({
          id: 'tx_'+Date.now()+Math.random().toString(36).slice(2,7)+iterations,
          type: item.type, description: item.description, amount: item.amount,
          category: item.category, date: dateStr, recurringId: item.id
        });
        changed = true;
      }
      item.lastGeneratedMonth = cursor;
      cursor = nextMonthKey(cursor);
      iterations++;
    }
  }
  if(changed){
    await storeSet('transactions:'+currentUser.username, transactions);
    await storeSet('recurring:'+currentUser.username, recurringItems);
    showToast('Recurring transactions logged for this month.', 'success');
  }
}

function openRecurringModal(){
  document.getElementById('recurringForm').reset();
  document.getElementById('recurringId').value = '';
  document.getElementById('recurringModalTitle').textContent = 'Add recurring transaction';
  setRecurringType('expense');
  document.getElementById('recurringModalOverlay').classList.add('active');
}
function setRecurringType(type){
  document.querySelectorAll('#recurringTypeToggle button').forEach(b=>b.classList.toggle('active', b.dataset.type===type));
  document.getElementById('recurringType').value = type;
  const sel = document.getElementById('recurringCategory');
  const cats = type==='income' ? getIncomeCategories() : getExpenseCategories();
  sel.innerHTML = cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}
async function saveRecurring(e){
  e.preventDefault();
  const id = document.getElementById('recurringId').value;
  const type = document.getElementById('recurringType').value;
  const description = document.getElementById('recurringDescription').value.trim();
  const amount = parseFloat(document.getElementById('recurringAmount').value);
  const category = document.getElementById('recurringCategory').value;
  const dayOfMonth = Math.min(31, Math.max(1, parseInt(document.getElementById('recurringDay').value, 10)));

  if(id){
    const item = recurringItems.find(r=>r.id===id);
    if(item){ Object.assign(item, {type, description, amount, category, dayOfMonth}); }
  } else {
    recurringItems.push({
      id: 'rec_'+Date.now()+Math.random().toString(36).slice(2,6),
      type, description, amount, category, dayOfMonth, active: true,
      startMonth: currentMonthKey(), lastGeneratedMonth: null
    });
  }
  await storeSet('recurring:'+currentUser.username, recurringItems);
  closeModal('recurringModalOverlay');
  showToast('Recurring transaction saved.', 'success');
  await processRecurringTransactions();
  renderRecurringList();
  renderAll();
}
function editRecurring(id){
  const item = recurringItems.find(r=>r.id===id);
  if(!item) return;
  document.getElementById('recurringId').value = item.id;
  document.getElementById('recurringModalTitle').textContent = 'Edit recurring transaction';
  setRecurringType(item.type);
  document.getElementById('recurringDescription').value = item.description;
  document.getElementById('recurringAmount').value = item.amount;
  document.getElementById('recurringDay').value = item.dayOfMonth;
  setTimeout(()=>{ document.getElementById('recurringCategory').value = item.category; }, 0);
  document.getElementById('recurringModalOverlay').classList.add('active');
}
async function toggleRecurringActive(id){
  const item = recurringItems.find(r=>r.id===id);
  if(!item) return;
  item.active = !item.active;
  await storeSet('recurring:'+currentUser.username, recurringItems);
  if(item.active) await processRecurringTransactions();
  renderRecurringList();
  renderAll();
}
async function deleteRecurring(id){
  const idx = recurringItems.findIndex(r=>r.id===id);
  if(idx===-1) return;
  const removed = recurringItems[idx];
  recurringItems.splice(idx,1);
  await storeSet('recurring:'+currentUser.username, recurringItems);
  renderRecurringList();
  showToast('Recurring transaction removed.', 'warn', async ()=>{
    recurringItems.splice(idx,0,removed);
    await storeSet('recurring:'+currentUser.username, recurringItems);
    renderRecurringList();
    showToast('Recurring transaction restored.', 'success');
  });
}
function renderRecurringList(){
  const wrap = document.getElementById('recurringList');
  if(!wrap) return;
  if(!recurringItems.length){
    wrap.innerHTML = `<div style="color:var(--ink-soft);font-size:13px;padding:6px 2px;">No recurring transactions set up yet — add rent, subscriptions, or your monthly allowance so you don't have to log them by hand.</div>`;
    return;
  }
  wrap.innerHTML = recurringItems.map(item=>`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 4px;border-bottom:1px solid var(--border);">
      <div style="min-width:0;">
        <div style="font-weight:600;font-size:13.5px;${item.active?'':'opacity:.5;'}">${escapeHtml(item.description)}</div>
        <div style="font-size:12px;color:var(--ink-soft);">${item.category} · Monthly on day ${item.dayOfMonth}${item.active?'':' · Paused'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <div class="mono ${item.type==='income'?'amt-income':'amt-expense'}" style="font-size:13px;">${item.type==='income'?'+':'−'} ${fmtShort(item.amount)}</div>
        <button class="btn btn-ghost btn-sm" onclick='toggleRecurringActive("${item.id}")'>${item.active?'Pause':'Resume'}</button>
        <div class="icon-btn" onclick='editRecurring("${item.id}")' title="Edit">✎</div>
        <div class="icon-btn danger" onclick='deleteRecurring("${item.id}")' title="Delete">✕</div>
      </div>
    </div>`).join('');
}

function spentInCategoryThisMonth(cat){
  const mk = currentMonthKey();
  return transactions
    .filter(t=>t.type==='expense' && t.category===cat && t.date.slice(0,7)===mk)
    .reduce((s,t)=>s+t.amount,0);
}
function getWeekRange(){
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day===0 ? -6 : 1-day);
  const monday = new Date(now); monday.setDate(now.getDate()+diffToMonday); monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6); sunday.setHours(23,59,59,999);
  return {start:monday, end:sunday};
}
function spentInCategoryThisWeek(cat){
  const {start,end} = getWeekRange();
  return transactions
    .filter(t=>{
      if(t.type!=='expense' || t.category!==cat) return false;
      const d = new Date(t.date+'T12:00:00');
      return d >= start && d <= end;
    })
    .reduce((s,t)=>s+t.amount,0);
}
// Spending against a budget's own period (monthly or weekly), used for progress/alerts.
function spentForBudget(cat){
  return getBudgetPeriod(cat)==='weekly' ? spentInCategoryThisWeek(cat) : spentInCategoryThisMonth(cat);
}

// Budgets may be a plain number (old data) or {amount, description, period} (current). These normalize all three.
function getBudgetAmount(cat){
  const b = budgets[cat];
  if(b == null) return 0;
  return typeof b === 'number' ? b : (b.amount || 0);
}
function getBudgetDesc(cat){
  const b = budgets[cat];
  if(b == null || typeof b === 'number') return '';
  return b.description || '';
}
function getBudgetPeriod(cat){
  const b = budgets[cat];
  if(b == null || typeof b === 'number') return 'monthly';
  return b.period === 'weekly' ? 'weekly' : 'monthly';
}

function checkBudgetAlerts(category){
  if(!budgets[category]) return;
  const period = getBudgetPeriod(category);
  const spent = spentForBudget(category);
  const limit = getBudgetAmount(category);
  const pct = spent/limit;
  if(pct >= 1){
    showToast(`⚠ You've gone over budget on ${category} (${fmt(spent)} of ${fmt(limit)}).`, 'danger');
  } else if(pct >= 0.8){
    showToast(`Heads up — ${category} is at ${Math.round(pct*100)}% of its ${period} budget.`, 'warn');
  }
}

/* ============ RENDER ============ */
function fmt(n){
  const cur = currentUser ? currentUser.currency : 'KSh';
  return cur + ' ' + Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtShort(n){
  const cur = currentUser ? currentUser.currency : 'KSh';
  return cur + ' ' + Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
}

function renderAll(){
  renderDashboard();
  renderTransactionsView();
  renderRecurringList();
  renderBudgetsView();
  populateReportMonths();
  renderReportPreview();
  renderSpendingHistory();
}

function renderDashboard(){
  const mk = currentMonthKey();
  const monthTx = transactions.filter(t=>t.date.slice(0,7)===mk);
  const income = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance = income - expense;

  document.getElementById('statIncome').textContent = fmt(income);
  document.getElementById('statExpense').textContent = fmt(expense);
  document.getElementById('statBalance').textContent = fmt(balance);
  const balDelta = document.getElementById('statBalanceDelta');
  balDelta.textContent = balance >= 0 ? 'Healthy 👍' : 'Spending more than you earn';
  balDelta.className = 'stat-delta ' + (balance>=0?'up':'down');

  const byCat = {};
  monthTx.filter(t=>t.type==='expense').forEach(t=> byCat[t.category] = (byCat[t.category]||0)+t.amount);
  const topCat = Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('statTopCat').textContent = topCat ? topCat[0] : '—';
  document.getElementById('statTopCatAmt').textContent = topCat ? fmt(topCat[1]) + ' this month' : 'No expenses yet';

  // alert banners
  const alertWrap = document.getElementById('alertBanners');
  alertWrap.innerHTML = '';
  Object.keys(budgets).forEach(cat=>{
    const spent = spentForBudget(cat);
    const limit = getBudgetAmount(cat);
    const period = getBudgetPeriod(cat);
    const pct = spent/limit;
    if(pct >= 1){
      alertWrap.innerHTML += `<div class="progress-alert-banner danger">⚠ Over budget on <strong>${cat}</strong> — ${fmt(spent)} spent of ${fmt(limit)} ${period} limit.</div>`;
    } else if(pct >= 0.8){
      alertWrap.innerHTML += `<div class="progress-alert-banner">⏳ <strong>${cat}</strong> is at ${Math.round(pct*100)}% of its ${period} budget.</div>`;
    }
  });

  renderRecentTable();
  const totalIncomeAllTime = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const byCatAllTime = {};
  transactions.filter(t=>t.type==='expense').forEach(t=> byCatAllTime[t.category] = (byCatAllTime[t.category]||0)+t.amount);
  renderCategoryChart(byCatAllTime, totalIncomeAllTime);
  renderGoals();
}

function renderRecentTable(){
  const body = document.getElementById('recentTxBody');
  const recent = [...transactions].sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,6);
  body.innerHTML = recent.length ? recent.map(t=>`
    <tr>
      <td class="mono">${t.date}</td>
      <td>${escapeHtml(t.description)}</td>
      <td><span class="cat-pill" style="background:${hexToSoft(getCategoryColor(t.category))};color:${getCategoryColor(t.category)}">${t.category}</span></td>
      <td style="text-align:right;" class="mono ${t.type==='income'?'amt-income':'amt-expense'}">${t.type==='income'?'+':'−'} ${fmt(t.amount)}</td>
    </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:30px;">No transactions yet.</td></tr>`;
}

function setTxSort(field){
  if(txSortField === field){
    txSortDir = txSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    txSortField = field;
    txSortDir = field==='date' ? 'desc' : 'desc';
  }
  renderTransactionsView();
}

function renderTransactionsView(){
  const body = document.getElementById('allTxBody');
  const filterCat = document.getElementById('txFilterCategory').value;
  const filterType = document.getElementById('txFilterType').value;
  const search = (document.getElementById('txSearch').value || '').trim().toLowerCase();

  let list = [...transactions];
  if(filterCat && filterCat!=='all') list = list.filter(t=>t.category===filterCat);
  if(filterType && filterType!=='all') list = list.filter(t=>t.type===filterType);
  if(search){
    list = list.filter(t=>
      t.description.toLowerCase().includes(search) ||
      t.category.toLowerCase().includes(search)
    );
  }

  list.sort((a,b)=>{
    let diff;
    if(txSortField === 'amount'){ diff = a.amount - b.amount; }
    else { diff = new Date(a.date) - new Date(b.date); }
    return txSortDir === 'asc' ? diff : -diff;
  });

  // Update sort-arrow indicators on the clickable headers
  ['date','amount'].forEach(f=>{
    const arrowEl = document.getElementById('sortArrow-'+f);
    if(arrowEl) arrowEl.textContent = (txSortField===f) ? (txSortDir==='asc' ? '▲' : '▼') : '';
  });

  const noResultsFromSearch = transactions.length && !list.length;
  document.getElementById('txEmptyState').style.display = (!transactions.length) ? 'block':'none';
  body.innerHTML = list.length ? list.map(t=>`
    <tr>
      <td class="mono">${t.date}</td>
      <td>${escapeHtml(t.description)}${t.recurringId ? ' <span title="Recurring" style="font-size:11px;color:var(--ink-soft);">↻</span>' : ''}</td>
      <td><span class="cat-pill" style="background:${hexToSoft(getCategoryColor(t.category))};color:${getCategoryColor(t.category)}">${t.category}</span></td>
      <td style="text-align:right;" class="mono ${t.type==='income'?'amt-income':'amt-expense'}">${t.type==='income'?'+':'−'} ${fmt(t.amount)}</td>
      <td>
        <div class="row-actions">
          <div class="icon-btn" onclick='editTransaction("${t.id}")' title="Edit">✎</div>
          <div class="icon-btn danger" onclick='deleteTransaction("${t.id}")' title="Delete">✕</div>
        </div>
      </td>
    </tr>`).join('') : (noResultsFromSearch ? `<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:30px;">No transactions match your search/filters.</td></tr>` : '');
}

function renderBudgetsView(){
  const grid = document.getElementById('jarsGrid');
  const cats = Object.keys(budgets);
  document.getElementById('budgetEmptyState').style.display = cats.length ? 'none':'block';
  grid.innerHTML = cats.map(cat=>{
    const period = getBudgetPeriod(cat);
    const spent = spentForBudget(cat);
    const limit = getBudgetAmount(cat);
    const desc = getBudgetDesc(cat);
    const pct = Math.min(spent/limit, 1.15);
    const pctDisplay = Math.round((spent/limit)*100);
    const level = pctDisplay>=100 ? 'over' : pctDisplay>=80 ? 'warn' : 'ok';
    const fillColor = level==='over' ? 'var(--rust)' : level==='warn' ? 'var(--gold)' : 'var(--sage)';
    const fillHeight = Math.max(4, pct*70);
    return `
    <div class="jar-card">
      <div class="jar-svg-wrap">
        <svg viewBox="0 0 76 96" width="98" height="124">
          <path d="M14 26 Q14 16 24 16 L52 16 Q62 16 62 26 L62 82 Q62 92 52 92 L24 92 Q14 92 14 82 Z" fill="#F0F4EC" stroke="var(--border)" stroke-width="2"/>
          <rect x="26" y="8" width="24" height="10" rx="3" fill="var(--border)"/>
          <clipPath id="clip-${cat.replace(/[^a-zA-Z0-9]/g,'')}">
            <path d="M14 26 Q14 16 24 16 L52 16 Q62 16 62 26 L62 82 Q62 92 52 92 L24 92 Q14 92 14 82 Z"/>
          </clipPath>
          <g clip-path="url(#clip-${cat.replace(/[^a-zA-Z0-9]/g,'')})">
            <rect x="10" y="${92-fillHeight}" width="56" height="${fillHeight+10}" fill="${fillColor}" opacity="0.75">
              <animate attributeName="y" from="92" to="${92-fillHeight}" dur="0.9s" fill="freeze" calcMode="spline" keySplines="0.2 0.9 0.3 1"/>
            </rect>
            <path d="M10 ${92-fillHeight} q7 -4 14 0 t14 0 t14 0 t14 0 v20 h-56 z" fill="${fillColor}" opacity="0.9">
               <animate attributeName="d"
                 values="M10 92 q7 -4 14 0 t14 0 t14 0 t14 0 v20 h-56 z;
                         M10 ${92-fillHeight} q7 -4 14 0 t14 0 t14 0 t14 0 v20 h-56 z"
                 dur="0.9s" fill="freeze" calcMode="spline" keySplines="0.2 0.9 0.3 1"/>
            </path>
          </g>
        </svg>
      </div>
      <div class="jar-cat">${cat}</div>
      ${desc ? `<div style="font-size:11px;color:var(--ink-soft);margin-bottom:2px;max-width:120px;">${escapeHtml(desc)}</div>` : ''}
      <div class="jar-amounts"><span class="mono">${fmtShort(spent)}</span> of <span class="mono">${fmtShort(limit)}</span></div>
      <div style="font-size:10.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.03em;margin-top:1px;">${period==='weekly'?'this week':'this month'}</div>
      <div class="jar-pct ${level}">${pctDisplay}%</div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <div class="icon-btn icon-btn-lg" onclick='quickEditBudget("${cat}")' title="Edit limit">✎</div>
        <div class="icon-btn icon-btn-lg danger" onclick='removeBudget("${cat}")' title="Remove">✕</div>
      </div>
    </div>`;
  }).join('');
}

async function quickEditBudget(cat){
  const period = getBudgetPeriod(cat);
  const val = prompt(`New ${period} limit for ${cat}:`, getBudgetAmount(cat));
  if(val===null) return;
  const num = parseFloat(val);
  if(isNaN(num) || num<0) return;
  budgets[cat] = { amount: num, description: getBudgetDesc(cat), period };
  await storeSet('budgets:'+currentUser.username, budgets);
  showToast('Budget updated for '+cat+'.', 'success');
  renderBudgetsView();
}
async function removeBudget(cat){
  const prev = budgets[cat];
  delete budgets[cat];
  await storeSet('budgets:'+currentUser.username, budgets);
  renderBudgetsView();
  showToast('Budget removed for '+cat+'.', 'warn', async ()=>{
    budgets[cat] = prev;
    await storeSet('budgets:'+currentUser.username, budgets);
    renderBudgetsView();
    showToast('Budget restored for '+cat+'.', 'success');
  });
}

/* ============ CHARTS (CSS conic-gradient pie — pure percentages, no arc trigonometry to get wrong) ============ */
function renderCategoryChart(byCat, income){
  const wrap = document.getElementById('categoryChartWrap');
  const subtitle = document.getElementById('categoryChartSubtitle');
  try{
    income = income || 0;
    const totalExpense = Object.values(byCat).reduce((s,v)=>s+v,0);

    let labels = Object.keys(byCat);
    let data = Object.values(byCat);
    let colors = labels.map(l=>getCategoryColor(l));

    // If there's income to allocate, add a "Remaining / Saved" slice for whatever wasn't spent.
    const remaining = income - totalExpense;
    if(income > 0 && remaining > 0){
      labels = [...labels, 'Remaining (Unspent)'];
      data = [...data, remaining];
      colors = [...colors, '#B7D3BE'];
    }

    if(!data.length){
      wrap.innerHTML = `<div style="text-align:center;color:var(--ink-soft);padding:40px 10px;font-size:13.5px;">No data yet — add income and expenses to see this chart.</div>`;
      subtitle.textContent = income>0 ? `No expenses logged yet — all of ${fmt(income)} in total income is still unspent.` : 'Log some income and expenses to see how your money is used.';
      return;
    }
    if(income > 0){
      const usedPct = Math.round((totalExpense/income)*100);
      subtitle.textContent = remaining >= 0
        ? `You've used ${usedPct}% of your total income — ${fmt(remaining)} left over.`
        : `You've spent ${usedPct}% of your total income — ${fmt(Math.abs(remaining))} over.`;
    } else {
      subtitle.textContent = 'No income logged yet — showing expenses only.';
    }
    const denom = income > 0 ? income : totalExpense;
    const total = data.reduce((s,v)=>s+v,0);

    // Build the pie with a CSS conic-gradient — just cumulative percentage stops, no arc trigonometry
    // to get wrong. Each slice gets its own solid color band around the circle.
    let cumulative = 0;
    const stops = data.map((val,i)=>{
      const startPct = (cumulative/total)*100;
      cumulative += val;
      const endPct = (cumulative/total)*100;
      return `${colors[i]} ${startPct.toFixed(4)}% ${endPct.toFixed(4)}%`;
    });
    const gradient = data.length === 1 ? colors[0] : `conic-gradient(${stops.join(', ')})`;

    const legendHtml = labels.map((l,i)=>{
      const pct = denom>0 ? Math.round((data[i]/denom)*100) : 0;
      return `<div class="pie-legend-item"><span class="pie-legend-dot" style="background:${colors[i]};"></span><span>${escapeHtml(l)} · ${pct}%</span></div>`;
    }).join('');

    wrap.innerHTML = `
      <div style="width:190px;height:190px;border-radius:50%;background:${gradient};box-shadow:inset 0 0 0 3px #fff, 0 2px 10px rgba(27,58,52,0.12);animation:fadeUp .4s ease;"></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:center;margin-top:16px;">${legendHtml}</div>
    `;
  } catch(err){
    console.error('Pie chart render failed:', err);
    wrap.innerHTML = `<div style="text-align:center;color:var(--rust);padding:30px 10px;font-size:12.5px;">Chart couldn't render (${escapeHtml(err.message||'unknown error')}). Try refreshing the page.</div>`;
  }
}

/* ============ REPORTS ============ */
function populateReportMonths(){
  const sel = document.getElementById('reportMonth');
  const set = new Set(transactions.map(t=>t.date.slice(0,7)));
  set.add(currentMonthKey());
  const months = [...set].sort().reverse();
  sel.innerHTML = months.map(mk=>{
    const [y,m] = mk.split('-');
    const label = new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long', year:'numeric'});
    return `<option value="${mk}">${label}</option>`;
  }).join('');
}

// Simple CSS-bar based history — deliberately no chart library or trigonometry, just percentage widths.
function renderSpendingHistory(){
  const wrap = document.getElementById('spendingHistory');
  if(!wrap) return;
  const months = [];
  const now = new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  }
  const data = months.map(mk=>{
    const income = transactions.filter(t=>t.type==='income' && t.date.slice(0,7)===mk).reduce((s,t)=>s+t.amount,0);
    const expense = transactions.filter(t=>t.type==='expense' && t.date.slice(0,7)===mk).reduce((s,t)=>s+t.amount,0);
    return {mk, income, expense};
  });
  const maxVal = Math.max(1, ...data.map(d=>Math.max(d.income, d.expense)));

  wrap.innerHTML = data.map(d=>{
    const [y,m] = d.mk.split('-');
    const label = new Date(y, m-1, 1).toLocaleDateString(undefined,{month:'short'});
    const incomePct = (d.income/maxVal)*100;
    const expensePct = (d.expense/maxVal)*100;
    return `
    <div class="history-row">
      <div class="history-month">${label}</div>
      <div class="history-bars">
        <div class="history-bar-line">
          <div class="history-bar-track"><div class="history-bar-fill income" style="width:${incomePct}%;"></div></div>
          <div class="history-amt mono">${fmtShort(d.income)}</div>
        </div>
        <div class="history-bar-line">
          <div class="history-bar-track"><div class="history-bar-fill expense" style="width:${expensePct}%;"></div></div>
          <div class="history-amt mono">${fmtShort(d.expense)}</div>
        </div>
      </div>
    </div>`;
  }).join('') + `
    <div style="display:flex;gap:16px;margin-top:12px;font-size:11.5px;color:var(--ink-soft);">
      <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--sage);margin-right:5px;"></span>Income</span>
      <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--rust);margin-right:5px;"></span>Expenses</span>
    </div>`;
}

function reportDataForMonth(mk){
  const list = transactions.filter(t=>t.date.slice(0,7)===mk);
  const income = list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const byCat = {};
  list.filter(t=>t.type==='expense').forEach(t=> byCat[t.category]=(byCat[t.category]||0)+t.amount);
  return {list, income, expense, balance: income-expense, byCat};
}

function renderReportPreview(){
  const sel = document.getElementById('reportMonth');
  if(!sel.value) return;
  const mk = sel.value;
  const {income, expense, balance, byCat} = reportDataForMonth(mk);
  const [y,m] = mk.split('-');
  const label = new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long', year:'numeric'});
  let html = `<h4>${label}</h4>
    <div class="report-line"><span>Total income</span><span class="mono">${fmt(income)}</span></div>
    <div class="report-line"><span>Total expenses</span><span class="mono">${fmt(expense)}</span></div>
    <div class="report-line"><span>Balance</span><span class="mono">${fmt(balance)}</span></div>
    <div style="margin-top:12px;font-weight:600;">By category</div>`;
  Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([c,a])=>{
    html += `<div class="report-line"><span>${c}</span><span class="mono">${fmt(a)}</span></div>`;
  });
  if(!Object.keys(byCat).length) html += `<div style="color:var(--ink-soft);margin-top:8px;">No expenses recorded this month.</div>`;
  document.getElementById('reportPreview').innerHTML = html;
}

function exportCSV(){
  const mk = document.getElementById('reportMonth').value;
  const {list} = reportDataForMonth(mk);
  let csv = 'Date,Description,Category,Type,Amount\n';
  list.forEach(t=>{
    csv += `${t.date},"${(t.description||'').replace(/"/g,'""')}",${t.category},${t.type},${t.amount}\n`;
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `budgetbuddy-${mk}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported.', 'success');
}

function exportPrintReport(){
  const mk = document.getElementById('reportMonth').value;
  const {income, expense, balance, byCat, list} = reportDataForMonth(mk);
  const [y,m] = mk.split('-');
  const label = new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long', year:'numeric'});
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>BudgetBuddy Report — ${label}</title>
    <style>
      body{font-family:Georgia,serif;padding:40px;color:#1B3A34;max-width:700px;margin:auto;}
      h1{font-size:24px;} table{width:100%;border-collapse:collapse;margin-top:16px;}
      td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:13px;}
      .totals{margin-top:20px;font-size:14px;}
    </style></head><body>
    <h1>BudgetBuddy — Financial Summary</h1>
    <p><strong>${currentUser.name}</strong> · ${label}</p>
    <div class="totals">
      <p>Total income: <strong>${fmt(income)}</strong></p>
      <p>Total expenses: <strong>${fmt(expense)}</strong></p>
      <p>Balance: <strong>${fmt(balance)}</strong></p>
    </div>
    <h3>Spending by category</h3>
    <table><tr><th>Category</th><th>Amount</th></tr>
    ${Object.entries(byCat).map(([c,a])=>`<tr><td>${c}</td><td>${fmt(a)}</td></tr>`).join('')}
    </table>
    <h3>All transactions</h3>
    <table><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th></tr>
    ${list.map(t=>`<tr><td>${t.date}</td><td>${t.description}</td><td>${t.category}</td><td>${t.type}</td><td>${fmt(t.amount)}</td></tr>`).join('')}
    </table>
    </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(), 400);
}

/* ============ PROFILE / SETTINGS ============ */
const CURRENCY_OPTIONS = [
  ["KSh","KSh — Kenyan Shilling"], ["$","$ — US Dollar"], ["£","£ — British Pound"],
  ["€","€ — Euro"], ["₦","₦ — Nigerian Naira"], ["UGX","UGX — Ugandan Shilling"], ["TSh","TSh — Tanzanian Shilling"]
];

function renderProfileView(){
  document.getElementById('profileAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileUsername').textContent = '@'+currentUser.username;
  document.getElementById('profileSince').textContent = new Date(currentUser.createdAt).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  document.getElementById('profileCurrencyDisplay').textContent = currentUser.currency;
  document.getElementById('profileTxCount').textContent = transactions.length;
  document.getElementById('profileBudgetCount').textContent = Object.keys(budgets).length;

  const sel = document.getElementById('profileCurrencySelect');
  sel.innerHTML = CURRENCY_OPTIONS.map(([v,l])=>
    `<option value="${v}" ${v===currentUser.currency?'selected':''}>${l}</option>`).join('');

  renderCustomCategoryList();
}

async function updateCurrency(e){
  e.preventDefault();
  const btn = e.currentTarget;
  const val = document.getElementById('profileCurrencySelect').value;
  if(val === currentUser.currency){ showToast('That\'s already your currency.', 'warn'); return; }
  currentUser.currency = val;
  await storeSet('user:'+currentUser.username, currentUser);
  showToast('Currency updated to '+val+'.', 'success');
  renderProfileView();
  renderAll();
}

async function changePassword(e){
  e.preventDefault();
  const errEl = document.getElementById('pwError');
  errEl.textContent = '';
  const cur = document.getElementById('curPassword').value;
  const next = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  const curHash = await sha256(cur);
  if(curHash !== currentUser.passwordHash){
    errEl.textContent = 'Current password is incorrect.';
    return false;
  }
  if(next !== confirm){
    errEl.textContent = 'New passwords do not match.';
    return false;
  }
  const pwCheck = validatePasswordStrength(next);
  if(!pwCheck.ok){
    errEl.textContent = pwCheck.message;
    return false;
  }
  currentUser.passwordHash = await sha256(next);
  await storeSet('user:'+currentUser.username, currentUser);
  document.getElementById('changePasswordForm').reset();
  showToast('Password updated.', 'success');
  return false;
}

/* ============ CUSTOM CATEGORIES ============ */
let categoryFormType = 'expense';
function setCategoryFormType(type){
  categoryFormType = type;
  document.querySelectorAll('#categoryTypeToggle button').forEach(b=>b.classList.toggle('active', b.dataset.type===type));
}
async function addCustomCategory(e){
  e.preventDefault();
  const input = document.getElementById('newCategoryName');
  const name = input.value.trim();
  if(!name) return false;
  const list = categoryFormType === 'income' ? customCategories.income : customCategories.expense;
  const allExisting = [...getIncomeCategories(), ...getExpenseCategories()];
  if(allExisting.some(c=>c.toLowerCase()===name.toLowerCase())){
    showToast('That category already exists.', 'warn');
    return false;
  }
  list.push(name);
  await storeSet('customCategories:'+currentUser.username, customCategories);
  input.value = '';
  showToast('Category "'+name+'" added.', 'success');
  populateCategorySelects();
  renderChipsFor(selectedTxType);
  renderCustomCategoryList();
  return false;
}
async function deleteCustomCategory(type, name){
  const idx = customCategories[type].indexOf(name);
  if(idx===-1) return;
  customCategories[type].splice(idx,1);
  await storeSet('customCategories:'+currentUser.username, customCategories);
  populateCategorySelects();
  renderChipsFor(selectedTxType);
  renderCustomCategoryList();
  showToast('Category "'+name+'" removed.', 'warn', async ()=>{
    customCategories[type].splice(idx,0,name);
    await storeSet('customCategories:'+currentUser.username, customCategories);
    populateCategorySelects();
    renderChipsFor(selectedTxType);
    renderCustomCategoryList();
    showToast('Category restored.', 'success');
  });
}
function renderCustomCategoryList(){
  const wrap = document.getElementById('customCategoryList');
  if(!wrap) return;
  const all = [
    ...customCategories.income.map(c=>({name:c, type:'income'})),
    ...customCategories.expense.map(c=>({name:c, type:'expense'}))
  ];
  if(!all.length){
    wrap.innerHTML = `<div style="font-size:12.5px;color:var(--ink-soft);">No custom categories yet.</div>`;
    return;
  }
  wrap.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;">` + all.map(c=>`
    <span class="chip" style="display:inline-flex;align-items:center;gap:6px;cursor:default;">
      ${escapeHtml(c.name)} <span style="opacity:.6;font-size:11px;">${c.type==='income'?'income':'expense'}</span>
      <span onclick='deleteCustomCategory("${c.type}","${c.name.replace(/"/g,'&quot;')}")' style="cursor:pointer;font-weight:700;color:var(--rust);">✕</span>
    </span>`).join('') + `</div>`;
}

/* ============ FULL DATA BACKUP (EXPORT / IMPORT) ============ */
function exportAllData(){
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'BudgetBuddy',
    version: 1,
    profile: { name: currentUser.name, username: currentUser.username, currency: currentUser.currency },
    transactions, budgets, savingsGoals, recurringItems, customCategories
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `budgetbuddy-backup-${currentUser.username}-${currentMonthKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Full backup exported.', 'success');
}

function importAllData(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (evt)=>{
    try{
      const data = JSON.parse(evt.target.result);
      if(!data || typeof data !== 'object') throw new Error('Not a valid backup file.');
      const proceed = confirm('This will replace your current transactions, budgets, goals, recurring items, and custom categories with the contents of this backup. Continue?');
      if(!proceed){ e.target.value = ''; return; }

      transactions = Array.isArray(data.transactions) ? data.transactions : [];
      budgets = (data.budgets && typeof data.budgets === 'object') ? data.budgets : {};
      savingsGoals = Array.isArray(data.savingsGoals) ? data.savingsGoals : [];
      recurringItems = Array.isArray(data.recurringItems) ? data.recurringItems : [];
      customCategories = (data.customCategories && typeof data.customCategories === 'object')
        ? { income: data.customCategories.income||[], expense: data.customCategories.expense||[] }
        : { income: [], expense: [] };

      await storeSet('transactions:'+currentUser.username, transactions);
      await storeSet('budgets:'+currentUser.username, budgets);
      await storeSet('goals:'+currentUser.username, savingsGoals);
      await storeSet('recurring:'+currentUser.username, recurringItems);
      await storeSet('customCategories:'+currentUser.username, customCategories);

      populateCategorySelects();
      populateReportMonths();
      renderAll();
      renderProfileView();
      showToast('Backup imported successfully.', 'success');
    } catch(err){
      showToast('Could not import that file — is it a BudgetBuddy backup?', 'danger');
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

/* ============ DELETE ACCOUNT ============ */
function openDeleteAccountModal(){
  document.getElementById('deleteAccountForm').reset();
  document.getElementById('deleteAccountError').textContent = '';
  document.getElementById('deleteAccountModalOverlay').classList.add('active');
}
async function confirmDeleteAccount(e){
  e.preventDefault();
  const errEl = document.getElementById('deleteAccountError');
  const password = document.getElementById('deleteAccountPassword').value;
  const hash = await sha256(password);
  if(hash !== currentUser.passwordHash){
    errEl.textContent = 'Incorrect password.';
    return false;
  }
  const username = currentUser.username;
  await storeDelete('user:'+username);
  await storeDelete('transactions:'+username);
  await storeDelete('budgets:'+username);
  await storeDelete('goals:'+username);
  await storeDelete('recurring:'+username);
  await storeDelete('customCategories:'+username);
  await storeDelete('session');

  closeModal('deleteAccountModalOverlay');
  currentUser = null; transactions = []; budgets = {}; savingsGoals = []; recurringItems = []; customCategories = {income:[],expense:[]};
  document.getElementById('app').classList.remove('active');
  document.getElementById('authScreen').style.display = 'flex';
  switchAuthTab('register');
  showToast('Your account and data have been deleted.', 'warn');
  return false;
}

/* ============ TOASTS ============ */
function showToast(msg, type, undoFn){
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type||'');
  toast.innerHTML = `<span style="flex:1;">${msg}</span>` +
    (undoFn ? `<span class="toast-undo">Undo</span>` : '') +
    `<span class="toast-close">✕</span>`;
  if(undoFn){
    toast.querySelector('.toast-undo').onclick = ()=>{ undoFn(); removeToast(toast); };
  }
  toast.querySelector('.toast-close').onclick = ()=> removeToast(toast);
  container.appendChild(toast);
  setTimeout(()=> removeToast(toast), undoFn ? 6500 : 5000);
}
function removeToast(toast){
  if(!toast.parentNode) return;
  toast.classList.add('leaving');
  setTimeout(()=> toast.remove(), 280);
}

/* ============ MISC UTIL ============ */
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function hexToSoft(hex){
  if(!hex) return '#eee';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},0.14)`;
}
function rippleFx(e){
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const d = Math.max(btn.clientWidth, btn.clientHeight);
  circle.style.width = circle.style.height = d+'px';
  const rect = btn.getBoundingClientRect();
  circle.style.left = (e.clientX - rect.left - d/2)+'px';
  circle.style.top = (e.clientY - rect.top - d/2)+'px';
  circle.className = 'ripple';
  btn.appendChild(circle);
  setTimeout(()=>circle.remove(), 600);
}
