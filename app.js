const $ = (id) => document.getElementById(id);

const STORAGE_KEY_APP = 'pff-app-v2';
let deferredPrompt = null;

const store = {
  customers: [],
  page: 1,
  pageSize: 10
};

// CKU/FCI 犬种分类数据（按FCI标准分组）
const CKU_BREEDS = [
  { group: '第1组：牧羊犬和牧牛犬', breeds: ['边境牧羊犬', '德国牧羊犬', '比利时牧羊犬', '澳洲牧羊犬', '柯基犬', '喜乐蒂牧羊犬', '古代英国牧羊犬', '边境牧羊犬', '澳大利亚牧牛犬', '弗兰德牧牛犬', '其他牧羊/牧牛犬'] },
  { group: '第2组：平犬和雪纳瑞类', breeds: ['雪纳瑞（迷你）', '雪纳瑞（标准）', '雪纳瑞（巨型）', '斗牛梗', '波士顿梗', '法国斗牛犬', '英国斗牛犬', '其他平犬'] },
  { group: '第2组：獒犬类和瑞士山地犬', breeds: ['金毛寻回犬', '拉布拉多寻回犬', '罗威纳犬', '圣伯纳犬', '大丹犬', '拳师犬', '杜宾犬', '马士提夫獒犬', '其他獒犬'] },
  { group: '第3组：梗犬类', breeds: ['约克夏梗', '杰克罗素梗', '西高地白梗', '苏格兰梗', '凯利蓝梗', '牛头梗', '贝林顿梗', '其他梗犬'] },
  { group: '第4组：腊肠犬类', breeds: ['短毛腊肠犬', '长毛腊肠犬', '刚毛腊肠犬'] },
  { group: '第5组：原始犬种和雪橇犬', breeds: ['哈士奇', '阿拉斯加雪橇犬', '萨摩耶犬', '松狮犬', '柴犬', '秋田犬', '其他原始/雪橇犬'] },
  { group: '第6组：嗅觉猎犬类', breeds: ['比格犬', '巴吉度猎犬', '寻血猎犬', '其他嗅觉猎犬'] },
  { group: '第7组：指示犬类', breeds: ['德国短毛指示犬', '英国指示犬', '威玛猎犬', '其他指示犬'] },
  { group: '第8组：寻回犬、激飞犬和水猎犬', breeds: ['金毛寻回犬', '拉布拉多寻回犬', '可卡犬', '英国激飞猎犬', '其他寻回/激飞犬'] },
  { group: '第9组：伴侣犬和玩具犬', breeds: ['贵宾犬（玩具）', '贵宾犬（迷你）', '贵宾犬（标准）', '比熊犬', '马尔济斯', '博美犬', '吉娃娃', '北京犬', '西施犬', '巴哥犬', '其他伴侣/玩具犬'] },
  { group: '第10组：视觉猎犬类', breeds: ['灵缇犬', '惠比特犬', '阿富汗猎犬', '萨路基猎犬', '其他视觉猎犬'] },
  { group: '其他/混血犬', breeds: ['混血犬', '其他未分类犬种'] }
];

function saveApp() {
  localStorage.setItem(STORAGE_KEY_APP, JSON.stringify({ customers: store.customers }));
}

function loadApp() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APP);
    if (raw) {
      const data = JSON.parse(raw);
      store.customers = Array.isArray(data.customers) ? data.customers : [];
    }
  } catch {}
}

function genId() { return 'id_' + Math.random().toString(36).slice(2, 9); }

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  const el = document.getElementById(`view-${view}`);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
}

function estimateRestingEnergyRequirementKg(weightKg) {
  const w = Math.max(0, Number(weightKg) || 0);
  if (w === 0) return 0;
  return 70 * Math.pow(w, 0.75);
}

function activityMultiplier(activity) {
  switch (activity) {
    case 'sedentary': return 1.2;
    case 'light_walk': return 1.3;
    case 'mixed_1_3': return 1.5;
    case 'high_1_3': return 1.8;
    case 'high_3_plus': return 2.2;
    case 'working_dog': return 2.8;
    default: return 1.4;
  }
}

function activityKcalFactor(activity) {
  switch (activity) {
    case 'sedentary': return 80;
    case 'light_walk': return 90;
    case 'mixed_1_3': return 100;
    case 'high_1_3': return 110;
    case 'high_3_plus': return 130;
    case 'working_dog': return 180;
    default: return 100;
  }
}

function calcAgeYears(birthdayStr) {
  if (!birthdayStr) return null;
  const b = new Date(birthdayStr);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  return (now - b) / (365.25 * 24 * 3600 * 1000);
}

function calcAgeMonths(birthdayStr) {
  if (!birthdayStr) return null;
  const b = new Date(birthdayStr);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  return months;
}

function monthFactorFromMonths(m) {
  if (m == null) return null;
  if (m <= 2) return 1.8;
  if (m === 3) return 1.6;
  if (m === 4) return 1.5;
  if (m === 5) return 1.4;
  if (m === 6) return 1.3;
  if (m === 7) return 1.2;
  if (m === 8) return 1.1;
  return 1.0;
}

function lactFactorFromStage(stage) {
  switch (stage) {
    case 'week1': return 0.75;
    case 'week2': return 0.95;
    case 'week3': return 1.1;
    case 'week4': return 1.2;
    default: return 1.0;
  }
}

function autoSetLifeStageFromBirthday() {
  const lifeSel = $('c-lifeStage');
  const years = calcAgeYears($('c-birthday').value);
  if (years == null) return;
  const curr = lifeSel.value;
  if (curr === 'pregnancy' || curr === 'lactation') return;
  if (years < 1) lifeSel.value = 'puppy';
  else if (years > 10) lifeSel.value = 'senior';
  else lifeSel.value = 'adult';
  updatePuppyMonthFields();
}

function updatePuppyMonthFields() {
  const isPuppy = $('c-lifeStage').value === 'puppy';
  const wrapAge = $('wrap-monthAge');
  const wrapFactor = $('wrap-monthFactor');
  if (wrapAge) wrapAge.style.display = isPuppy ? '' : 'none';
  if (wrapFactor) wrapFactor.style.display = isPuppy ? '' : 'none';
  if (!isPuppy) return;
  const months = calcAgeMonths($('c-birthday').value);
  const factor = monthFactorFromMonths(months);
  if ($('c-monthAge')) $('c-monthAge').value = months != null ? months : '';
  if ($('c-monthFactor')) $('c-monthFactor').value = factor != null ? factor : '';
}

function updateLactationFields() {
  const isLact = $('c-lifeStage').value === 'lactation';
  const w1 = $('wrap-lactStage');
  const w2 = $('wrap-lactFactor');
  const w3 = $('wrap-litterCount');
  if (w1) w1.style.display = isLact ? '' : 'none';
  if (w2) w2.style.display = isLact ? '' : 'none';
  if (w3) w3.style.display = isLact ? '' : 'none';
  if (!isLact) return;
  const stage = $('c-lactStage').value;
  $('c-lactFactor').value = lactFactorFromStage(stage);
}

function setEstHint(text) {
  const el = $('estKcalHint');
  if (el) el.textContent = text || '';
}

function computeAndFillEstKcal() {
  const estEl = $('c-estKcal');
  if (!estEl) return;
  const w = Number($('c-weightKg').value) || 0;
  if (w <= 0) { estEl.value = ''; setEstHint(''); return; }
  const life = $('c-lifeStage').value;
  const kcalFactor = Number($('c-kcalFactor').value) || activityKcalFactor($('c-activity').value);
  if (life === 'puppy') {
    let monthFactor = Number($('c-monthFactor').value);
    if (!monthFactor) {
      const months = calcAgeMonths($('c-birthday').value);
      monthFactor = monthFactorFromMonths(months) || 1;
    }
    const val = Math.round(Math.pow(w, 0.75) * kcalFactor * monthFactor);
    estEl.value = val;
    setEstHint(`幼犬：${w}^0.75 × 热量系数${kcalFactor} × 月龄系数${monthFactor}`);
  } else if (life === 'adult') {
    const val = Math.round(Math.pow(w, 0.75) * kcalFactor);
    estEl.value = val;
    setEstHint(`成犬：${w}^0.75 × 热量系数${kcalFactor}`);
  } else if (life === 'pregnancy') {
    const val = Math.round(Math.pow(w, 0.75) * kcalFactor + w * 26);
    estEl.value = val;
    setEstHint(`妊娠期：${w}^0.75 × 热量系数${kcalFactor} + ${w} × 26`);
  } else if (life === 'lactation') {
    const stageFactor = Number($('c-lactFactor').value) || lactFactorFromStage($('c-lactStage').value);
    const litter = Math.max(0, Number($('c-litterCount').value) || 0);
    const N = Math.min(litter, 4);
    const M = litter > 4 ? (litter - 4) : 0;
    const val = Math.round(Math.pow(w, 0.75) * kcalFactor + w * (24 * N + 12 * M) * stageFactor);
    estEl.value = val;
    setEstHint(`哺乳期：${w}^0.75 × 热量系数${kcalFactor} + ${w} × (24×${N} + 12×${M}) × 阶段因子${stageFactor}`);
  } else {
    const rer = estimateRestingEnergyRequirementKg(w);
    const mult = activityMultiplier($('c-activity').value);
    const val = Math.round(rer * mult);
    estEl.value = val;
    setEstHint(`其他：RER(70×${w}^0.75) × 活动乘数${mult}`);
  }
}

// 填充品种下拉框
function populateBreedSelect() {
  const select = $('c-breed');
  if (!select) return;
  select.innerHTML = '<option value="">请选择品种</option>';
  CKU_BREEDS.forEach(group => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.group;
    group.breeds.forEach(breed => {
      const option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  });
}

function zh(val, map) { return map[val] || val || '-'; }

const sexMap = { male: '公', female: '母', unknown: '未知' };
const neuterMap = { yes: '是', no: '否', unknown: '未知' };
const lifeMap = { puppy: '幼犬', adult: '成犬', senior: '老年犬', pregnancy: '妊娠期', lactation: '哺乳期' };
const actMap = { sedentary: '基本不出门，家里也基本不活动', light_walk: '每天出门半小时内，散步为主', mixed_1_3: '每天出门1-3小时，跑动散步各一半', high_1_3: '每天出门1-3小时，高强度运动', high_3_plus: '每天出门3小时以上，高强度运动', working_dog: '特种工作犬，极强的运动量' };
const lactMap = { week1: '第一周', week2: '第二周', week3: '第三周', week4: '第四周' };

function formatDetails(c) {
  const parts = [];
  const years = calcAgeYears(c.birthday);
  const showAge = c.lifeStage === 'adult' || c.lifeStage === 'pregnancy' || c.lifeStage === 'lactation';
  const showPuppy = c.lifeStage === 'puppy';
  const showLact = c.lifeStage === 'lactation';

  parts.push(`宠物昵称：${c.petName || '-'}`);
  parts.push(`品种：${c.breed || '-'}`);
  parts.push(`微信号：${c.wechat || '-'}`);
  parts.push(`收货信息：${c.address || '-'}`);
  if (showAge && years != null) parts.push(`年龄：${years.toFixed(1)} 岁`);
  parts.push(`生日：${c.birthday || '-'}`);
  parts.push(`体重：${c.weightKg || '-'} kg`);
  parts.push(`性别：${zh(c.sex, sexMap)}`);
  parts.push(`是否绝育：${zh(c.neutered, neuterMap)}`);
  parts.push(`生命阶段：${zh(c.lifeStage, lifeMap)}`);
  parts.push(`活动水平：${zh(c.activity, actMap)}`);
  if (showPuppy) {
    if (c.monthAge != null) parts.push(`月龄：${c.monthAge}`);
    if (c.monthFactor != null) parts.push(`月龄系数：${c.monthFactor}`);
  }
  if (showLact) {
    parts.push(`哺乳阶段：${zh(c.lactStage, lactMap)}`);
    if (c.lactFactor != null) parts.push(`哺乳阶段因子：${c.lactFactor}`);
    parts.push(`产仔数：${c.litterCount != null ? c.litterCount : '-'}`);
  }
  if (c.kcalFactor != null) parts.push(`热量系数：${c.kcalFactor}`);
  if (c.estKcal != null) parts.push(`每日能量估算：${c.estKcal} kcal/日`);
  if (c.bcs != null) parts.push(`体况评分：${c.bcs}`);
  if (c.mealsPerDay != null) parts.push(`每日吃几顿饭：${c.mealsPerDay}`);
  if (c.allergies) parts.push(`过敏/不耐受：${c.allergies}`);
  if (c.avoid) parts.push(`挑食/尽量不吃：${c.avoid}`);
  if (c.fav) parts.push(`非常喜欢：${c.fav}`);
  if (c.med) parts.push(`症状史/疾病史：${c.med}`);
  if (c.notes) parts.push(`备注：${c.notes}`);
  return `<div class="item-details">${parts.map(t => `<div>${t}</div>`).join('')}</div>`;
}

function paginatedCustomers() {
  const q = ($('customer-search').value || '').trim().toLowerCase();
  const filtered = store.customers.filter(c => {
    const text = `${c.wechat || ''} ${c.petName || ''} ${c.address || ''}`.toLowerCase();
    return !q || text.includes(q);
  });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / store.pageSize));
  if (store.page > totalPages) store.page = totalPages;
  const start = (store.page - 1) * store.pageSize;
  const pageItems = filtered.slice(start, start + store.pageSize);
  return { pageItems, total, totalPages };
}

function renderCustomersList() {
  const list = $('customers-list');
  const { pageItems, total, totalPages } = paginatedCustomers();
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="muted">暂无记录</div>';
  } else {
    list.innerHTML = pageItems.map((c, i) => {
      const idx = (store.page - 1) * store.pageSize + i + 1;
      return `
        <div class="list-item" data-id="${c.id}">
          <div class="list-item-row">
            <div>${idx}</div>
            <div>${c.petName || '-'}</div>
            <div>${c.breed || '-'}</div>
            <div>${c.wechat || '-'}</div>
            <div>${c.address || '-'}</div>
          </div>
          <div class="item-actions">
            <button class="btn small" data-detail="${c.id}">详细信息</button>
            <button class="btn small" data-edit="${c.id}">编辑</button>
            <button class="btn small" data-del="${c.id}">删除</button>
          </div>
        </div>`;
    }).join('');
  }
  list.querySelectorAll('[data-detail]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.detail;
    const wrap = list.querySelector(`.list-item[data-id="${id}"]`);
    const existing = wrap.querySelector('.item-details');
    if (existing) { existing.remove(); return; }
    const c = store.customers.find(x => x.id === id);
    if (!c) return;
    wrap.insertAdjacentHTML('beforeend', formatDetails(c));
  }));
  list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
    openCustomerForm(btn.dataset.edit);
    const formCard = $('customer-form-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  list.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => deleteCustomer(btn.dataset.del)));

  const totalEl = $('customers-total'); if (totalEl) totalEl.textContent = `共 ${total} 条`;
  const infoEl = $('customers-pageinfo'); if (infoEl) infoEl.textContent = `第 ${store.page}/${totalPages} 页`;
  const prevBtn = $('customers-prev'); if (prevBtn) {
    prevBtn.disabled = store.page <= 1;
    prevBtn.onclick = () => { if (store.page > 1) { store.page -= 1; renderCustomersList(); } };
  }
  const nextBtn = $('customers-next'); if (nextBtn) {
    nextBtn.disabled = store.page >= totalPages;
    nextBtn.onclick = () => { if (store.page < totalPages) { store.page += 1; renderCustomersList(); } };
  }
}

function openCustomerForm(id) {
  const card = $('customer-form-card');
  const title = $('customer-form-title');
  if (!card) return;
  card.style.display = 'block';
  if (id) {
    const c = store.customers.find(x => x.id === id);
    if (!c) return;
    title.textContent = '编辑顾客';
    $('customer-id').value = c.id;
    $('c-wechat').value = c.wechat || '';
    $('c-address').value = c.address || '';
    $('c-petName').value = c.petName || '';
    $('c-breed').value = c.breed || '';
    $('c-birthday').value = c.birthday || '';
    $('c-weightKg').value = c.weightKg || '';
    $('c-sex').value = c.sex || 'unknown';
    $('c-neutered').value = c.neutered || 'unknown';
    $('c-lifeStage').value = c.lifeStage || 'adult';
    $('c-activity').value = c.activity || 'sedentary';
    $('c-kcalFactor').value = (c.kcalFactor != null ? c.kcalFactor : activityKcalFactor($('c-activity').value));
    $('c-bcs').value = c.bcs || '';
    $('c-mealsPerDay').value = c.mealsPerDay || '';
    $('c-allergies').value = c.allergies || '';
    $('c-avoid').value = c.avoid || '';
    $('c-fav').value = c.fav || '';
    $('c-med').value = c.med || '';
    $('c-notes').value = c.notes || '';
    if ($('c-monthAge')) $('c-monthAge').value = c.monthAge != null ? c.monthAge : '';
    if ($('c-monthFactor')) $('c-monthFactor').value = c.monthFactor != null ? c.monthFactor : '';
    $('c-lactStage').value = c.lactStage || 'week1';
    $('c-lactFactor').value = c.lactFactor != null ? c.lactFactor : lactFactorFromStage($('c-lactStage').value);
    $('c-litterCount').value = c.litterCount != null ? c.litterCount : '';
    updatePuppyMonthFields();
    updateLactationFields();
  } else {
    title.textContent = '新增顾客';
    $('customer-id').value = '';
    ['c-wechat','c-address','c-petName','c-breed','c-birthday','c-weightKg','c-bcs','c-mealsPerDay','c-allergies','c-avoid','c-fav','c-med','c-notes','c-monthAge','c-monthFactor','c-litterCount'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    $('c-sex').value = 'unknown';
    $('c-neutered').value = 'unknown';
    $('c-lifeStage').value = 'adult';
    $('c-activity').value = 'sedentary';
    $('c-kcalFactor').value = activityKcalFactor('sedentary');
    $('c-lactStage').value = 'week1';
    $('c-lactFactor').value = lactFactorFromStage('week1');
    updatePuppyMonthFields();
    updateLactationFields();
  }
  computeAndFillEstKcal();
}

window.__openCustomer = () => openCustomerForm();

function deleteCustomer(id) {
  if (!confirm('确认删除该顾客及其宠物信息？')) return;
  store.customers = store.customers.filter(c => c.id !== id);
  saveApp();
  renderCustomersList();
}

function setupCustomersModule() {
  populateBreedSelect();
  const newBtn = $('btn-new-customer');
  if (newBtn) newBtn.addEventListener('click', () => openCustomerForm());
  const cancelBtn = $('btn-cancel-customer');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { const card = $('customer-form-card'); if (card) card.style.display = 'none'; });
  const searchEl = $('customer-search');
  if (searchEl) searchEl.addEventListener('input', () => { store.page = 1; renderCustomersList(); });

  const bd = $('c-birthday'); if (bd) bd.addEventListener('change', () => { autoSetLifeStageFromBirthday(); updatePuppyMonthFields(); computeAndFillEstKcal(); });
  const lifeEl = $('c-lifeStage'); if (lifeEl) lifeEl.addEventListener('change', () => { updatePuppyMonthFields(); updateLactationFields(); computeAndFillEstKcal(); });

  const onActivityChange = () => {
    const act = $('c-activity').value;
    const factor = activityKcalFactor(act);
    const fEl = $('c-kcalFactor'); if (fEl) fEl.value = factor;
    computeAndFillEstKcal();
  };
  const wEl = $('c-weightKg'); if (wEl) wEl.addEventListener('change', computeAndFillEstKcal);
  const actEl = $('c-activity'); if (actEl) actEl.addEventListener('change', onActivityChange);
  const monthFields = ['c-monthAge','c-monthFactor'];
  monthFields.forEach(id => { const el = $(id); if (el) el.addEventListener('change', computeAndFillEstKcal); });

  const lactStageEl = $('c-lactStage'); if (lactStageEl) lactStageEl.addEventListener('change', () => { updateLactationFields(); computeAndFillEstKcal(); });
  const litterEl = $('c-litterCount'); if (litterEl) litterEl.addEventListener('change', computeAndFillEstKcal);

  const form = $('customer-form');
  if (form) {
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        computeAndFillEstKcal();
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('customer-id').value || genId();
      const weight = Number($('c-weightKg').value) || 0;
      if (!weight) { alert('请填写体重'); return; }
      computeAndFillEstKcal();
      const estKcal = Number($('c-estKcal').value) || 0;

      const record = {
        id,
        wechat: $('c-wechat').value.trim(),
        address: $('c-address').value.trim(),
        petName: $('c-petName').value.trim(),
        breed: $('c-breed').value.trim(),
        birthday: $('c-birthday').value,
        weightKg: weight,
        sex: $('c-sex').value,
        neutered: $('c-neutered').value,
        lifeStage: $('c-lifeStage').value,
        activity: $('c-activity').value,
        kcalFactor: Number($('c-kcalFactor').value) || activityKcalFactor($('c-activity').value),
        monthAge: Number($('c-monthAge').value) || null,
        monthFactor: Number($('c-monthFactor').value) || null,
        lactStage: $('c-lactStage').value,
        lactFactor: Number($('c-lactFactor').value) || lactFactorFromStage($('c-lactStage').value),
        litterCount: Number($('c-litterCount').value) || 0,
        estKcal,
        bcs: $('c-bcs').value ? Number($('c-bcs').value) : null,
        mealsPerDay: $('c-mealsPerDay').value ? Number($('c-mealsPerDay').value) : null,
        allergies: $('c-allergies').value.trim(),
        avoid: $('c-avoid').value.trim(),
        fav: $('c-fav').value.trim(),
        med: $('c-med').value.trim(),
        notes: $('c-notes').value.trim(),
        species: 'dog',
        createdAt: Date.now()
      };
      if (!record.petName) { alert('请填写必填项：宠物昵称'); return; }
      const existsIdx = store.customers.findIndex(x => x.id === id);
      if (existsIdx >= 0) store.customers.splice(existsIdx, 1, record); else store.customers.unshift(record);
      saveApp();
      const card = $('customer-form-card'); if (card) card.style.display = 'none';
      renderCustomersList();
    });
  }
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function setupPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const bi = $('btn-install'); if (bi) bi.style.display = 'inline-flex';
  });
  const bi = $('btn-install');
  if (bi) bi.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    bi.style.display = 'none';
  });
}

function init() {
  console.log('App init');
  loadApp();
  setupNav();
  setupPWA();
  setupCustomersModule();
  renderCustomersList();
  switchView('customers');
  const printBtn = $('btn-print'); if (printBtn) printBtn.addEventListener('click', () => window.print());
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}