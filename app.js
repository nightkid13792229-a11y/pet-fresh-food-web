const $ = (id) => document.getElementById(id);

const STORAGE_KEY_APP = 'pff-app-v2';
const STORAGE_KEY_BACKUPS = 'pff-backups-v1';
const MAX_BACKUPS = 10; // 最多保留10个备份
let deferredPrompt = null;

const store = {
  customers: [],
  ingredients: [],
  recipes: [],
  orders: [],
  page: 1,
  pageSize: 10,
  ingredientPage: 1,
  ingredientPageSize: 20,
  recipePage: 1,
  recipePageSize: 10,
  orderPage: 1,
  orderPageSize: 10
};

let currentQuoteCustomerId = null;
let currentQuoteSelectedRecipeIds = new Set();
let quoteRecipeFilter = { search: '', lifeStage: '' };
const QUOTE_DAYS_OPTIONS = [7, 15, 30];
const QUOTE_SHIPPING_OPTIONS = [
  { value: 'remote', label: '异地快递' },
  { value: 'local', label: '同城快递' },
  { value: 'none', label: '无需快递' }
];
let quoteOverrides = null;
let currentQuoteRenderState = null;

// 后端 API 状态管理
const API_BASE_STORAGE_KEY = 'pff-api-base-url';
const API_TOKEN_STORAGE_KEY = 'pff-api-token';
const API_USER_STORAGE_KEY = 'pff-api-user';

const detectedOrigin = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null')
  ? window.location.origin
  : null;

const defaultApiBaseUrl = (() => {
  try {
    const stored = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (stored) return stored;
  } catch (e) {}
  return detectedOrigin || 'http://8.137.166.134:3000';
})();

const backendState = {
  baseUrl: defaultApiBaseUrl,
  token: null,
  user: null
};

// 从 localStorage 恢复后端状态
function loadBackendAuth() {
  try {
    const token = localStorage.getItem(API_TOKEN_STORAGE_KEY);
    const userStr = localStorage.getItem(API_USER_STORAGE_KEY);
    if (token) {
      backendState.token = token;
      if (userStr) {
        try {
          backendState.user = JSON.parse(userStr);
        } catch (e) {
          backendState.user = null;
        }
      }
    }
  } catch (e) {
    console.warn('加载后端认证信息失败:', e);
  }
}

// 清除后端认证信息
function clearBackendAuth(skipRedirect = false) {
  backendState.token = null;
  backendState.user = null;
  try {
    localStorage.removeItem(API_TOKEN_STORAGE_KEY);
    localStorage.removeItem(API_USER_STORAGE_KEY);
  } catch (e) {
    console.warn('清除后端认证信息失败:', e);
  }
  updateAuthUI();
}

// 后端 API 请求函数
async function backendRequest(path, options = {}) {
  if (!backendState.baseUrl) {
    throw new Error('未配置后台接口地址');
  }
  const url = backendState.baseUrl.replace(/\/$/, '') + path;
  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    }
  };
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      fetchOptions.body = options.body;
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    } else {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }
  }
  if (!options.skipAuth && backendState.token) {
    fetchOptions.headers.Authorization = `Bearer ${backendState.token}`;
  }
  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    console.warn('后台请求失败:', error);
    throw new Error('无法连接后台服务，请检查网络或接口地址。');
  }
  let data = null;
  const contentType = response.headers ? response.headers.get('content-type') : '';
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (error) {
      console.warn('解析后台返回数据失败:', error);
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      if (text) {
        data = { message: text };
      }
    } catch (error) {
      data = null;
    }
  }
  if (response.status === 401) {
    clearBackendAuth(true);
    throw new Error('登录已过期，请重新登录。');
  }
  if (!response.ok) {
    const message = data && typeof data === 'object'
      ? data.message || data.error || `请求失败 (${response.status})`
      : `请求失败 (${response.status})`;
    throw new Error(message);
  }
  if (data && typeof data === 'object' && data.success === false) {
    throw new Error(data.message || '请求失败');
  }
  return data;
}

// 后端登录函数
async function backendLogin(email, password) {
  const payload = await backendRequest('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true
  });
  if (!payload || payload.success !== true || !payload.data) {
    throw new Error((payload && payload.message) || '登录失败，请检查账号或密码。');
  }
  const { token, user } = payload.data;
  backendState.token = token;
  backendState.user = user;
  try {
    localStorage.setItem(API_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(API_USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('保存后端认证信息失败:', e);
  }
  updateAuthUI();
  return { token, user };
}

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
  { group: '第8组：寻回犬、激飞犬和水猎犬', breeds: ['金毛寻回犬', '拉布拉多寻回犬', '可卡犬', '英国激飞犬', '其他寻回/激飞犬'] },
  { group: '第9组：伴侣犬和玩具犬', breeds: ['贵宾犬（玩具）', '贵宾犬（迷你）', '贵宾犬（标准）', '比熊犬', '马尔济斯', '博美犬', '吉娃娃', '北京犬', '西施犬', '巴哥犬', '其他伴侣/玩具犬'] },
  { group: '第10组：视觉猎犬类', breeds: ['灵缇犬', '惠比特犬', '阿富汗猎犬', '萨路基猎犬', '其他视觉猎犬'] },
  { group: '其他/混血犬', breeds: ['混血犬', '其他未分类犬种'] }
];

// 食材类别列表（可在运行时添加）
let INGREDIENT_CATEGORIES = [
  '种子', '鱼肉', '营养品', '香料', '水果', '蔬菜', 
  '谷物', '禽肉', '内脏', '菌菇', '坚果', '蛋类', 
  '畜肉', '贝类', '包装'
];

// 拼音首字母映射表（常用字）
// 使用Unicode范围判断拼音首字母（简化版）
const PINYIN_MAP = {
  // 类别常用字
  '种': 'Z', '子': 'Z', '鱼': 'Y', '肉': 'R', '营': 'Y', '养': 'Y', '品': 'P',
  '香': 'X', '料': 'L', '水': 'S', '果': 'G', '蔬': 'S', '菜': 'C',
  '谷': 'G', '物': 'W', '禽': 'Q', '内': 'N', '脏': 'Z', '菌': 'J', '菇': 'G',
  '坚': 'J', '蛋': 'D', '类': 'L', '畜': 'C', '贝': 'B', '包': 'B', '装': 'Z',
  // 项目常用字
  '亚': 'Y', '麻': 'M', '籽': 'Z', '奇': 'Q', '芹': 'Q', '南': 'N',
  '瓜': 'G', '葵': 'K', '花': 'H', '火': 'H', '白': 'B', '芝': 'Z', '鳕': 'X',
  '三': 'S', '文': 'W', '沙': 'S', '丁': 'D', '青': 'Q', '比': 'B',
  '目': 'M', '椰': 'Y', '奶': 'N', '油': 'Y', '酪': 'L', '鸡': 'J',
  '胸': 'X', '腿': 'T', '心': 'X', '肝': 'G', '肾': 'S', '牛': 'N',
  '羊': 'Y', '猪': 'Z', '鸭': 'Y', '鹅': 'E', '兔': 'T', '虾': 'X',
  '蟹': 'X', '扇': 'S', '贝': 'B', '生': 'S', '菜': 'C', '菠': 'B',
  '萝': 'L', '胡': 'H', '萝': 'L', '卜': 'B', '番': 'F', '茄': 'Q',
  '黄': 'H', '豆': 'D', '绿': 'L', '西': 'X', '蓝': 'L', '莓': 'M',
  '草': 'C', '苹': 'P', '香': 'X', '蕉': 'J', '橙': 'C', '柚': 'Y',
  '米': 'M', '面': 'M', '粉': 'F', '玉': 'Y', '小': 'X', '麦': 'M',
  '燕': 'Y', '麦': 'M', '片': 'P', '糙': 'C', '藜': 'L', '麦': 'M'
};

// 获取单个字符的拼音首字母
function getCharPinyinInitial(char) {
  if (!char || char.length === 0) return '';
  // 如果是英文字母或数字，直接返回大写
  if (/[A-Za-z0-9]/.test(char)) {
    return char.toUpperCase();
  }
  // 查找映射表
  if (PINYIN_MAP[char]) {
    return PINYIN_MAP[char];
  }
  // 如果没有映射，使用Unicode范围粗略判断（基于Unicode范围）
  const code = char.charCodeAt(0);
  // 汉字Unicode范围：0x4E00-0x9FFF
  if (code >= 0x4E00 && code <= 0x9FFF) {
    // 使用一个简化的拼音首字母映射（基于Unicode范围分段）
    // 这是一个粗略的近似，不准确但可用
    const ranges = [
      { start: 0x4E00, end: 0x4EFF, letter: 'Y' },
      { start: 0x4F00, end: 0x4FFF, letter: 'D' },
      { start: 0x5000, end: 0x50FF, letter: 'C' },
      { start: 0x5100, end: 0x51FF, letter: 'B' },
      { start: 0x5200, end: 0x52FF, letter: 'G' },
      { start: 0x5300, end: 0x53FF, letter: 'H' },
      { start: 0x5400, end: 0x54FF, letter: 'K' },
      { start: 0x5500, end: 0x55FF, letter: 'L' },
      { start: 0x5600, end: 0x56FF, letter: 'M' },
      { start: 0x5700, end: 0x57FF, letter: 'N' },
      { start: 0x5800, end: 0x58FF, letter: 'P' },
      { start: 0x5900, end: 0x59FF, letter: 'Q' },
      { start: 0x5A00, end: 0x5AFF, letter: 'R' },
      { start: 0x5B00, end: 0x5BFF, letter: 'S' },
      { start: 0x5C00, end: 0x5CFF, letter: 'T' },
      { start: 0x5D00, end: 0x5DFF, letter: 'W' },
      { start: 0x5E00, end: 0x5EFF, letter: 'X' },
      { start: 0x5F00, end: 0x5FFF, letter: 'Y' },
      { start: 0x6000, end: 0x60FF, letter: 'Z' }
    ];
    for (const range of ranges) {
      if (code >= range.start && code <= range.end) {
        return range.letter;
      }
    }
  }
  // 如果都不匹配，返回默认值
  return 'X';
}

// 获取文本所有字的拼音首字母（新规则）
function getPinyinInitials(text) {
  if (!text || text.length === 0) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    // 只跳过空格和常见标点符号，保留中文字符、英文字母和数字
    // \s 匹配空格，\p{P} 匹配标点符号（需要Unicode支持）
    // 如果浏览器不支持 \p{P}，则只跳过空格
    if (/[\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/.test(char)) continue;
    result += getCharPinyinInitial(char);
  }
  return result;
}

// 自动生成编号（新规则：类别每个字的拼音首字母 + 项目每个字的拼音首字母 + 两位数）
function generateIngredientCode(category, name, excludeId = null) {
  if (!category || !name) return '';
  
  const catInitials = getPinyinInitials(category);
  const nameInitials = getPinyinInitials(name);
  
  if (!catInitials || !nameInitials) return '';
  
  // 基础前缀：类别每个字的拼音首字母 + 项目每个字的拼音首字母
  const basePrefix = catInitials + nameInitials;
  
  // 找到相同类别+项目的所有原料，计算下一个编号
  const sameCategoryName = store.ingredients
    .filter(ing => {
      if (excludeId && ing.id === excludeId) return false;
      return ing.category === category && ing.name === name;
    });
  
  // 找到相同类别+项目的最大编号（只考虑没有字母后缀的编号）
  let maxNum = 0;
  sameCategoryName.forEach(ing => {
    if (ing.code && ing.code.startsWith(basePrefix)) {
      // 匹配格式：ZZYMZ01 或 ZZYMZ01a
      const match = ing.code.match(new RegExp(`^${basePrefix}(\\d{2})([a-z]?)$`));
      if (match && match[2] === '') {
        // 只计算没有字母后缀的编号
        const num = parseInt(match[1], 10);
        maxNum = Math.max(maxNum, num);
      }
    }
  });
  
  // 计算下一个编号
  let nextNum = maxNum + 1;
  let code = basePrefix + String(nextNum).padStart(2, '0');
  
  // 检查是否有重复（包括所有原料，不仅仅是相同类别+项目的）
  let suffixIndex = 0;
  const suffixLetters = 'abcdefghijklmnopqrstuvwxyz';
  while (store.ingredients.some(ing => {
    if (excludeId && ing.id === excludeId) return false;
    return ing.code === code;
  })) {
    code = basePrefix + String(nextNum).padStart(2, '0') + suffixLetters[suffixIndex];
    suffixIndex++;
    if (suffixIndex >= suffixLetters.length) {
      // 如果26个字母都用完了，增加编号
      nextNum++;
      suffixIndex = 0;
      code = basePrefix + String(nextNum).padStart(2, '0');
    }
  }
  
  return code;
}

// 创建备份
function createBackup(data) {
  try {
    const backups = getBackups();
    const backup = {
      id: 'backup_' + Date.now(),
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
      data: data,
      customersCount: data.customers ? data.customers.length : 0,
      ingredientsCount: data.ingredients ? data.ingredients.length : 0,
      recipesCount: data.recipes ? data.recipes.length : 0,
      ordersCount: data.orders ? data.orders.length : 0
    };
    
    backups.unshift(backup); // 最新的在前面
    
    // 只保留最近的MAX_BACKUPS个备份
    if (backups.length > MAX_BACKUPS) {
      backups.splice(MAX_BACKUPS);
    }
    
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(backups));
    console.log('✓ 自动备份已创建:', backup.id, backup.date);
    return true;
  } catch (error) {
    console.warn('创建备份失败（不影响主数据保存）:', error);
    return false;
  }
}

// 获取备份列表
function getBackups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BACKUPS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('读取备份列表失败:', error);
  }
  return [];
}

// 删除备份
function deleteBackup(backupId) {
  try {
    const backups = getBackups();
    const filtered = backups.filter(b => b.id !== backupId);
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(filtered));
    console.log('备份已删除:', backupId);
    return true;
  } catch (error) {
    console.error('删除备份失败:', error);
    return false;
  }
}

// 恢复备份
function restoreBackup(backupId) {
  try {
    const backups = getBackups();
    const backup = backups.find(b => b.id === backupId);
    if (!backup || !backup.data) {
      alert('备份数据无效');
      return false;
    }
    
    if (confirm(`确定要恢复到 ${backup.date} 的备份吗？当前数据将被替换。`)) {
      store.customers = Array.isArray(backup.data.customers) ? backup.data.customers : [];
      store.ingredients = Array.isArray(backup.data.ingredients) ? backup.data.ingredients : [];
      store.recipes = Array.isArray(backup.data.recipes) ? backup.data.recipes : [];
      
              // 保存恢复的数据
      if (saveAppWithoutBackup()) {
        alert('恢复成功！');
        renderCustomersList();
        renderIngredientsList();
        renderRecipesList();
        renderBackupsList(); // 刷新备份列表
        return true;
      } else {
        alert('恢复失败，数据保存出错');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('恢复备份失败:', error);
    alert('恢复失败：' + error.message);
    return false;
  }
}

// 保存数据（不创建备份，用于恢复时避免循环备份）
function saveAppWithoutBackup() {
  try {
    const dataToSave = { 
      customers: store.customers,
      ingredients: store.ingredients,
      recipes: store.recipes,
      orders: store.orders
    };
    const jsonStr = JSON.stringify(dataToSave);
    
    localStorage.setItem(STORAGE_KEY_APP, jsonStr);
    
    const verify = localStorage.getItem(STORAGE_KEY_APP);
    if (verify === jsonStr) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('保存数据失败:', error);
    return false;
  }
}

function saveApp() {
  try {
    const dataToSave = { 
      customers: store.customers,
      ingredients: store.ingredients,
      recipes: store.recipes,
      orders: store.orders
    };
    const jsonStr = JSON.stringify(dataToSave);
    
    // 检查存储空间
    if (jsonStr.length > 5 * 1024 * 1024) { // 5MB
      console.warn('数据较大:', (jsonStr.length / 1024).toFixed(2), 'KB');
    }
    
    // 保存当前数据前，先备份
    const currentData = localStorage.getItem(STORAGE_KEY_APP);
    if (currentData && currentData !== jsonStr) {
      try {
        const currentParsed = JSON.parse(currentData);
        createBackup(currentParsed);
      } catch (e) {
        // 如果当前数据无法解析，跳过备份
      }
    }
    
    localStorage.setItem(STORAGE_KEY_APP, jsonStr);
    
    // 验证保存是否成功
    const verify = localStorage.getItem(STORAGE_KEY_APP);
    if (verify === jsonStr) {
      console.log('✓ 保存数据成功 - 顾客:', store.customers.length, '原料:', store.ingredients.length, '食谱:', store.recipes.length);
      console.log('✓ 存储键:', STORAGE_KEY_APP, '数据大小:', (jsonStr.length / 1024).toFixed(2), 'KB');
      return true;
    } else {
      console.error('✗ 保存验证失败：数据不一致');
      return false;
    }
  } catch (error) {
    console.error('✗ 保存数据失败:', error);
    
    // 检查是否是存储空间不足
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      alert('存储空间不足！请清除浏览器缓存或导出数据后删除一些记录。');
    } else {
      alert('保存数据失败：' + error.message);
    }
    return false;
  }
}

function loadApp() {
  try {
    // 列出所有localStorage键用于调试
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('pff-') || key.includes('customer') || key.includes('app'))) {
        allKeys.push(key);
        console.log('发现相关key:', key, '长度:', localStorage.getItem(key)?.length || 0);
      }
    }
    
    // 先尝试加载新版本
    const raw = localStorage.getItem(STORAGE_KEY_APP);
    if (raw && raw.length > 2) { // 至少是 "{}" 的长度
      try {
        const data = JSON.parse(raw);
        store.customers = Array.isArray(data.customers) ? data.customers : [];
        store.ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
        store.recipes = Array.isArray(data.recipes) ? data.recipes : [];
        store.orders = Array.isArray(data.orders) ? data.orders : [];
        console.log('加载数据成功 - 顾客:', store.customers.length, '原料:', store.ingredients.length, '食谱:', store.recipes.length);
        if (store.customers.length > 0 || store.ingredients.length > 0 || store.recipes.length > 0) {
          return;
        }
      } catch (parseError) {
        console.error('解析数据失败:', parseError, '原始数据:', raw.substring(0, 200));
      }
    }
    
    // 尝试加载旧版本（向后兼容）
    const oldKeys = ['pff-app-v1', 'pff-app'];
    for (const oldKey of oldKeys) {
      const oldRaw = localStorage.getItem(oldKey);
      if (oldRaw && oldRaw.length > 2) {
        try {
          const oldData = JSON.parse(oldRaw);
          if (Array.isArray(oldData.customers)) {
            store.customers = oldData.customers;
            store.ingredients = Array.isArray(oldData.ingredients) ? oldData.ingredients : [];
            store.recipes = Array.isArray(oldData.recipes) ? oldData.recipes : [];
            // 迁移到新key
            saveApp();
            console.log('从旧版本迁移数据成功 - 顾客:', store.customers.length);
            return;
          }
        } catch (parseError) {
          console.error('解析旧数据失败:', parseError);
        }
      }
    }
    
    // 如果完全没有数据，初始化空数组
    store.customers = [];
    store.ingredients = [];
    store.recipes = [];
    if (allKeys.length === 0) {
      console.log('初始化空数据 - 未找到任何相关存储键');
    } else {
      console.log('初始化空数据 - 但发现以下键:', allKeys.join(', '));
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    // 即使出错也保持空数组，避免崩溃
    store.customers = [];
    store.ingredients = [];
    store.recipes = [];
  }
}

function genId() { return 'id_' + Math.random().toString(36).slice(2, 9); }

function switchView(view) {
  console.log('切换视图到:', view);
  document.querySelectorAll('.view').forEach(v => {
    v.style.display = 'none';
    v.removeAttribute('style');
  });
  const el = document.getElementById(`view-${view}`);
  if (el) {
    el.setAttribute('style', 'display: block !important');
    console.log('视图元素:', el, '显示状态:', el.style.display);
    // 如果切换到原料视图，重新渲染列表
    if (view === 'inventory') {
      setTimeout(() => {
        updateNameFilterSelect();
        renderIngredientsList();
      }, 100);
    }
    // 如果切换到品种管理视图，加载数据
    if (view === 'breeds' && backendState.token) {
      setTimeout(async () => {
        await loadBreeds();
        await loadBreedCategories();
        renderBreedsList();
      }, 100);
    }
    // 如果切换到食谱视图，重新渲染列表
    if (view === 'recipes') {
      setTimeout(() => {
        renderRecipesList();
      }, 100);
    }
    // 如果切换到设置视图，刷新备份列表
    if (view === 'settings') {
      setTimeout(() => renderBackupsList(), 100);
    }
    // 如果切换到订单视图，重新渲染列表
    if (view === 'orders') {
      setTimeout(() => {
        renderOrdersList();
      }, 100);
    }
  } else {
    console.error('找不到视图元素: view-' + view);
  }
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
const recipeTypeLabelMap = { standard: '通用食谱', custom: '定制食谱' };
const nutritionLabelMap = { AAFCO: 'AAFCO', FEDIAF: 'FEDIAF', NRC: 'NRC' };

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value && value !== 0) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatFileTimestamp(date = new Date()) {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function formatAgeDisplay(customer) {
  if (!customer) return '-';
  const months = calcAgeMonths(customer.birthday);
  if (months == null) return '-';
  if (months < 12) return `${months}个月`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return `${years}岁`;
  return `${years}岁${rest}个月`;
}

function formatMultiline(value) {
  if (!value) return '-';
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function formatNumber(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toFixed(digits);
}

function formatPercentInteger(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${Math.round(num)}%`;
}

function formatCurrency(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `¥${num.toFixed(digits)}`;
}

function formatWeight(value, digits = 2, unit = 'g') {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${num.toFixed(digits)} ${unit}`;
}

function buildDetailTable(rows) {
  if (!rows || rows.length === 0) {
    return '<div class="detail-empty">暂无数据</div>';
  }
  const body = rows.map(row => {
    const label = escapeHtml(row.label || '-');
    const raw = row.raw === true;
    let value;
    if (row.value == null || row.value === '') {
      value = '-';
    } else {
      value = raw ? row.value : escapeHtml(row.value);
    }
    return `<tr><th>${label}</th><td>${value}</td></tr>`;
  }).join('');
  return `<table class="detail-table"><tbody>${body}</tbody></table>`;
}

function buildDetailGrid(rows, options = {}) {
  if (!rows || rows.length === 0) {
    return '<div class="detail-empty">暂无数据</div>';
  }
  const columns = options.columns || 2;
  const compact = options.compact ? ' compact' : '';
  const items = rows.map(row => {
    const label = escapeHtml(row.label || '-');
    const raw = row.raw === true;
    let value;
    if (row.value == null || row.value === '') {
      value = '-';
    } else {
      value = raw ? row.value : escapeHtml(row.value);
    }
    return `<div class="detail-grid-item"><div class="detail-grid-label">${label}</div><div class="detail-grid-value">${value}</div></div>`;
  }).join('');
  return `<div class="detail-grid${compact}" style="--detail-grid-columns:${columns};">${items}</div>`;
}

function getEstKcalInfo(customer) {
  if (!customer) return { valueText: '-', formulaText: '-' };
  const estKcal = customer.estKcal;
  const weight = Number(customer.weightKg) || 0;
  const kcalFactor = Number(customer.kcalFactor) || activityKcalFactor(customer.activity);
  const weightPart = `${weight || '体重'}^0.75 × 热量系数${kcalFactor}`;
  let formula = weightPart;
  if (customer.lifeStage === 'puppy') {
    const monthFactor = customer.monthFactor != null ? customer.monthFactor : monthFactorFromMonths(calcAgeMonths(customer.birthday));
    if (monthFactor != null) {
      formula = `${weightPart} × 月龄系数${monthFactor}`;
    }
  } else if (customer.lifeStage === 'pregnancy') {
    formula = `${weightPart} + ${weight || '体重'} × 26`;
  } else if (customer.lifeStage === 'lactation') {
    const litter = customer.litterCount != null ? customer.litterCount : 0;
    const N = Math.min(litter, 4);
    const M = litter > 4 ? (litter - 4) : 0;
    const stageFactor = customer.lactFactor != null ? customer.lactFactor : lactFactorFromStage(customer.lactStage);
    formula = `${weightPart} + ${weight || '体重'} × (24×${N} + 12×${M}) × 阶段因子${stageFactor}`;
  }
  const valueText = (estKcal != null && estKcal !== '') ? `${estKcal} kcal/日` : '-';
  return { valueText, formulaText: formula };
}

function describeEstKcal(customer) {
  const info = getEstKcalInfo(customer);
  return `${escapeHtml(info.valueText)}<div class="detail-hint">计算公式：${escapeHtml(info.formulaText)}</div>`;
}

function buildQuoteCustomerSummary(customer) {
  if (!customer) return '<div class="detail-empty">未找到顾客信息</div>';
  const rows = [
    { label: '宠物昵称', value: customer.petName || '-' },
    { label: '品种', value: customer.breed || '-' },
    { label: '年龄/月龄', value: formatAgeDisplay(customer) },
    { label: '体重', value: customer.weightKg != null ? `${formatNumber(customer.weightKg, 2)} kg` : '-' },
    { label: '每日吃几顿饭', value: customer.mealsPerDay != null ? customer.mealsPerDay : '-' },
    { label: '日均活动水平', value: customer.activity ? `${zh(customer.activity, actMap)}（热量系数 ${customer.kcalFactor != null ? customer.kcalFactor : activityKcalFactor(customer.activity)}）` : '-' },
    { label: '挑食/尽量不吃', value: formatMultiline(customer.avoid), raw: true },
    { label: '过敏/不耐受', value: formatMultiline(customer.allergies), raw: true },
    { label: '非常喜欢吃', value: formatMultiline(customer.fav), raw: true }
  ];
  const { valueText } = getEstKcalInfo(customer);
  const infoHtml = rows.map(row => {
    const label = escapeHtml(row.label || '-');
    let value;
    if (row.raw) {
      value = row.value || '-';
    } else {
      value = escapeHtml(row.value != null && row.value !== '' ? row.value : '-');
    }
    return `<div class="quote-summary-grid-item"><div class="quote-summary-label">${label}</div><div class="quote-summary-value">${value}</div></div>`;
  }).join('');
  return `
    <div class="quote-summary-card">
      <div class="quote-section-header">
        <h3 class="quote-section-title">毛孩子基本信息</h3>
      </div>
      <div class="quote-summary-info">
        <div class="quote-summary-grid">
          ${infoHtml}
        </div>
      </div>
      <div class="quote-energy-highlight">
        <div class="quote-energy-label">每日能量估算</div>
        <div class="quote-energy-value">${escapeHtml(valueText)}</div>
      </div>
    </div>
  `;
}

function openQuoteRecipeSelector(customerId) {
  const customer = store.customers.find(c => c.id === customerId);
  if (!customer) {
    alert('未找到该顾客信息，请刷新后重试');
    return;
  }
  currentQuoteCustomerId = customerId;
  currentQuoteRenderState = null;
  resetQuoteOverrides();
  currentQuoteSelectedRecipeIds = new Set();
  quoteRecipeFilter = { search: '', lifeStage: '' };
  const selectCard = $('quote-select-card');
  const summaryEl = $('quote-customer-summary');
  const searchEl = $('quote-recipe-search');
  const lifeStageEl = $('quote-lifeStage-filter');
  const resultCard = $('quote-result-card');
  if (resultCard) {
    resultCard.style.display = 'none';
    const content = $('quote-result-content');
    if (content) content.innerHTML = '';
  }
  if (summaryEl) summaryEl.innerHTML = buildQuoteCustomerSummary(customer);
  if (searchEl) searchEl.value = '';
  if (lifeStageEl) lifeStageEl.value = customer.lifeStage || '';
  quoteRecipeFilter.lifeStage = lifeStageEl ? lifeStageEl.value || '' : '';
  renderQuoteRecipeList();
  if (selectCard) {
    selectCard.style.display = 'block';
    selectCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function closeQuoteRecipeSelector() {
  const selectCard = $('quote-select-card');
  if (selectCard) selectCard.style.display = 'none';
  currentQuoteCustomerId = null;
  currentQuoteSelectedRecipeIds = new Set();
}

function updateQuoteSelectedInfo() {
  const infoEl = $('quote-selected-info');
  if (infoEl) {
    infoEl.textContent = `已选择 ${currentQuoteSelectedRecipeIds.size} 个食谱`;
  }
}

function renderQuoteRecipeList() {
  const listEl = $('quote-recipe-list');
  if (!listEl) return;
  const search = (quoteRecipeFilter.search || '').toLowerCase();
  const lifeStage = quoteRecipeFilter.lifeStage || '';
  const filtered = store.recipes.filter(recipe => {
    const matchSearch = !search || `${recipe.name || ''}${recipe.code || ''}`.toLowerCase().includes(search);
    const matchLifeStage = !lifeStage || recipe.lifeStage === lifeStage;
    return matchSearch && matchLifeStage;
  });
  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="detail-empty">暂无符合条件的食谱，请调整筛选条件</div>';
  } else {
    listEl.innerHTML = filtered.map(recipe => {
      const checked = currentQuoteSelectedRecipeIds.has(recipe.id) ? 'checked' : '';
      const lifeStageLabel = zh(recipe.lifeStage, lifeMap);
      const typeLabel = recipeTypeLabelMap[recipe.recipeType] || '-';
      const nutritionLabel = nutritionLabelMap[recipe.nutritionStandard] || (recipe.nutritionStandard || '-');
      return `
        <div class="quote-recipe-item">
          <div class="quote-recipe-meta">
            <strong>${escapeHtml(recipe.name || '-')}</strong>
            <span class="muted">编号：${escapeHtml(recipe.code || '-')}</span>
            <span class="muted">生命阶段：${escapeHtml(lifeStageLabel)} ｜ 营养标准：${escapeHtml(nutritionLabel)} ｜ 类型：${escapeHtml(typeLabel)}</span>
          </div>
          <label class="quote-check">
            <input type="checkbox" value="${recipe.id}" ${checked} />
          </label>
        </div>
      `;
    }).join('');
    listEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = e.target.value;
        if (e.target.checked) {
          currentQuoteSelectedRecipeIds.add(id);
        } else {
          currentQuoteSelectedRecipeIds.delete(id);
        }
        updateQuoteSelectedInfo();
      });
    });
  }
  updateQuoteSelectedInfo();
}

function calculateQuoteBaseData(recipe, customer) {
  const mealsPerDay = customer && customer.mealsPerDay > 0 ? customer.mealsPerDay : 1;
  const estKcal = customer && customer.estKcal > 0 ? customer.estKcal : 0;
  const recipeTotalKcal = recipe && recipe.totalKcal > 0 ? recipe.totalKcal : 0;
  const ratio = (estKcal > 0 && recipeTotalKcal > 0 && mealsPerDay > 0) ? (estKcal / recipeTotalKcal) : 0;
  const servingWeight = ratio > 0 ? ((recipe.totalWeight || 0) * ratio / mealsPerDay) : 0;
  const totalWeightPerDay = servingWeight * mealsPerDay;
  const ingredientDetails = calculateQuoteIngredientDetails(recipe, ratio, mealsPerDay, totalWeightPerDay);
  return { ratio, mealsPerDay, estKcal, recipeTotalKcal, servingWeight, totalWeightPerDay, ingredientDetails };
}

function calculateQuoteIngredientDetails(recipe, ratio, mealsPerDay, totalWeightPerDay) {
  const details = [];
  const ingredientsList = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  ingredientsList.forEach((item, idx) => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    const category = ingredient ? (ingredient.category || '-') : '-';
    const project = ingredient ? (ingredient.name || '-') : '-';
    const description = ingredient ? (ingredient.description || '') : '';
    const ingredientName = description ? `${project}-${description}` : project;
    const brand = ingredient ? (ingredient.brand || ingredient.source || '-') : '-';
    const mainFunction = ingredient ? (ingredient.mainFunction || '-') : '-';
    const unit = item.unit || (ingredient ? ingredient.unit : 'g');
    let totalAmount = 0;
    if (ratio > 0) {
      const singleServingsAmount = mealsPerDay > 0 ? (item.weight * ratio / mealsPerDay) : 0;
      totalAmount = singleServingsAmount * mealsPerDay;
    }
    let ratioText = '-';
    if (unit === 'g' && totalWeightPerDay > 0 && totalAmount > 0) {
      ratioText = `${((totalAmount / totalWeightPerDay) * 100).toFixed(1)}%`;
    }
    let amountText = '-';
    if (totalAmount > 0) {
      const unitText = unit ? ` ${unit}` : '';
      amountText = `${formatNumber(totalAmount, 2)}${unitText}`;
    }
    details.push({
      index: idx + 1,
      category,
      ingredientName,
      brand,
      ratioText,
      amountText,
      nutritionValue: mainFunction || '-'
    });
  });
  return details;
}

function resetQuoteOverrides() {
  quoteOverrides = { servingWeight: null, shippingType: 'remote' };
}

resetQuoteOverrides();

function calculateQuoteCostForDays(recipe, customer, baseData, days, overrides = {}) {
  const { ratio, mealsPerDay, servingWeight } = baseData;
  const cookingLoss = recipe && recipe.cookingLoss != null ? recipe.cookingLoss : 7;
  const totalServings = mealsPerDay * days;
  const overrideServing = overrides.servingWeight != null && overrides.servingWeight > 0 ? overrides.servingWeight : null;
  const servingWeightPerMeal = overrideServing != null ? overrideServing : servingWeight;
  const baseServingWeight = servingWeight > 0 ? servingWeight : 1;
  const weightScale = servingWeightPerMeal > 0 ? (servingWeightPerMeal / baseServingWeight) : 1;
  const totalWeight = servingWeightPerMeal * totalServings;
  let totalIngredientCost = 0;
  const ingredientsList = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  ingredientsList.forEach(item => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return;
    const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
    if (!(pricePer500 > 0)) return;
    let totalAmount = 0;
    if (ratio > 0 && mealsPerDay > 0) {
      const singleServingsAmount = item.weight * ratio / mealsPerDay;
      totalAmount = singleServingsAmount * totalServings * weightScale;
    }
    const totalAmountWithLoss = totalAmount * (1 + (cookingLoss || 0) / 100);
    const cost = parseFloat(((totalAmountWithLoss * pricePer500) / 500).toFixed(2));
    totalIngredientCost += cost;
  });

  const packagingList = generatePackagingList(servingWeightPerMeal, totalWeight, totalServings) || [];
  const packagingTotalCost = packagingList.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
  const packagingTotalWeight = packagingList.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0);
  const laborCost = totalWeight > 0 ? Math.ceil(totalWeight / 4000) * 20 : 0;
  const packageTotalWeight = totalWeight * (1 + (cookingLoss || 0) / 100) + packagingTotalWeight;
  const overrideShipping = overrides.shippingType || 'remote';
  let shippingCost = 0;
  if (totalWeight > 0) {
    if (overrideShipping === 'local') {
      shippingCost = 20;
    } else if (overrideShipping === 'none') {
      shippingCost = 0;
    } else {
      shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
    }
  }
  const subtotal = totalIngredientCost + packagingTotalCost + laborCost + shippingCost;
  const totalPrice = subtotal > 0 ? Math.round(subtotal * 2) : 0;
  const averagePerServing = (totalServings > 0 && totalPrice > 0) ? (totalPrice / totalServings) : 0;
  return {
    days,
    servingWeight: servingWeightPerMeal,
    totalWeight,
    totalPrice,
    averagePerServing,
    totalServings
  };
}

function renderQuoteResultWithOverrides(options = {}) {
  if (!currentQuoteRenderState) return;
  const { customer, items } = currentQuoteRenderState;
  const overrides = quoteOverrides || { servingWeight: null, shippingType: 'remote' };
  const defaultServingWeight = items.length > 0 ? items[0].baseData.servingWeight : 0;
  const results = items.map(item => {
    const costComparison = QUOTE_DAYS_OPTIONS.map(days => calculateQuoteCostForDays(item.recipe, customer, item.baseData, days, overrides));
    return {
      recipe: item.recipe,
      basicRows: item.basicRows,
      nutritionRows: item.nutritionRows,
      ingredientDetails: item.ingredientDetails,
      costComparison
    };
  });
  renderQuoteResult(customer, results, { overrides, defaultServingWeight, disableAutoScroll: !!options.silent });
  bindQuoteOverrideControls({ defaultServingWeight });
  if (options.focusTarget === 'weight') {
    const input = $('quote-override-serving-weight');
    if (input) {
      input.focus();
    }
  } else if (options.focusTarget === 'shipping') {
    const selectEl = $('quote-override-shipping-type');
    if (selectEl) {
      selectEl.focus();
    }
  }
}

function generateQuoteComparison() {
  if (!currentQuoteCustomerId) {
    alert('请先从顾客列表中选择需要对比的宠物');
    return;
  }
  const customer = store.customers.find(c => c.id === currentQuoteCustomerId);
  if (!customer) {
    alert('未找到顾客信息，请刷新后重试');
    return;
  }
  const recipeIds = Array.from(currentQuoteSelectedRecipeIds);
  if (recipeIds.length === 0) {
    alert('请至少选择一个食谱进行对比');
    return;
  }

  const items = [];
  recipeIds.forEach(id => {
    const recipe = store.recipes.find(r => r.id === id);
    if (!recipe) return;
    const baseData = calculateQuoteBaseData(recipe, customer);
    const basicRows = [
      { label: '适用生命阶段', value: zh(recipe.lifeStage, lifeMap) },
      { label: '营养参考标准', value: nutritionLabelMap[recipe.nutritionStandard] || (recipe.nutritionStandard || '-') },
      { label: '食谱类型', value: recipeTypeLabelMap[recipe.recipeType] || '-' },
      { label: '食谱制作软件', value: recipe.software || '-' }
    ];
    const nutritionRows = [
      { label: '蛋白质（干物质占比）', value: recipe.protein != null ? formatPercentInteger(recipe.protein) : '-' },
      { label: '脂肪（干物质占比）', value: recipe.fat != null ? formatPercentInteger(recipe.fat) : '-' },
      { label: '碳水化合物（干物质占比）', value: recipe.carb != null ? formatPercentInteger(recipe.carb) : '-' },
      { label: '膳食纤维（干物质占比）', value: recipe.fiber != null ? formatPercentInteger(recipe.fiber) : '-' },
      { label: '灰分（干物质占比）', value: recipe.ash != null ? formatPercentInteger(recipe.ash) : '-' },
      { label: '水分', value: recipe.moisture != null ? formatPercentInteger(recipe.moisture) : '-' },
      { label: '钙磷比', value: recipe.caPratio || '-' },
      { label: '热量密度', value: recipe.kcalDensity != null ? `${Math.round(recipe.kcalDensity)} kcal/kg` : '-' }
    ];
    items.push({
      recipe,
      basicRows,
      nutritionRows,
      baseData,
      ingredientDetails: baseData.ingredientDetails,
    });
  });

  if (items.length === 0) {
    alert('所选食谱数据不足，无法生成对比单');
    return;
  }

  resetQuoteOverrides();
  currentQuoteRenderState = { customer, items };
  renderQuoteResultWithOverrides();
  closeQuoteRecipeSelector();
}

function buildQuoteIngredientsTable(details) {
  if (!details || details.length === 0) return '<div class="detail-empty">未配置原料</div>';
  const rowsHtml = details.map(item => `
    <tr>
      <td>${item.index}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.ingredientName)}</td>
      <td>${escapeHtml(item.brand || '-')}</td>
      <td>${getRatioUsageText(item)}</td>
      <td>${escapeHtml(item.nutritionValue || '-')}</td>
    </tr>
  `).join('');
  return `
    <table class="detail-table quote-ingredients-table">
      <thead>
        <tr>
          <th style="width:50px;">序号</th>
          <th style="width:130px;">类别</th>
          <th style="width:220px;">食谱原材料</th>
          <th style="width:180px;">品牌/来源</th>
          <th style="width:150px;">重量占比/用量</th>
          <th>本食谱中的主要营养价值</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

function getRatioUsageText(item) {
  const ratio = item.ratioText && item.ratioText !== '-' ? item.ratioText : '';
  if (ratio) return escapeHtml(ratio);
  return '待份量确定后可算出';
}

function buildQuoteOverrideControls(options = {}) {
  const overrides = options.overrides || quoteOverrides || { servingWeight: null, shippingType: 'remote' };
  const defaultServingWeight = options.defaultServingWeight || 0;
  const shippingValue = overrides.shippingType || 'remote';
  const weightValue = overrides.servingWeight != null ? overrides.servingWeight : '';
  const placeholder = defaultServingWeight > 0 ? `默认约 ${Math.round(defaultServingWeight)} g/份` : '';
  const shippingOptions = QUOTE_SHIPPING_OPTIONS.map(opt => `<option value="${opt.value}" ${opt.value === shippingValue ? 'selected' : ''}>${opt.label}</option>`).join('');
  return `
    <div class="quote-override-card">
      <div class="quote-override-header">临时调整（仅对本次询价单生效）：</div>
      <div class="quote-override-fields">
        <label class="quote-override-field">
          <span>每份重量（g）</span>
          <input type="number" id="quote-override-serving-weight" min="1" step="1" placeholder="${placeholder}" value="${weightValue}" />
        </label>
        <label class="quote-override-field">
          <span>快递类型</span>
          <select id="quote-override-shipping-type">
            ${shippingOptions}
          </select>
        </label>
        <div class="quote-override-actions">
          <button type="button" class="btn small" id="quote-override-reset">恢复默认</button>
        </div>
      </div>
      <div class="quote-override-hint">调整后将自动刷新费用对比，不会写入原始订单数据。</div>
    </div>
  `;
}

function buildQuoteCostTable(costComparison) {
  if (!costComparison || costComparison.length === 0) return '<div class="detail-empty">暂无费用数据</div>';
  const rowsHtml = costComparison.map(item => {
    const servingText = item.servingWeight > 0 ? `${Math.round(item.servingWeight)} g` : '-';
    const totalWeightText = item.totalWeight > 0 ? `${Math.round(item.totalWeight)} g` : '-';
    const totalPriceText = item.totalPrice > 0 ? formatCurrency(item.totalPrice, 0) : '-';
    const avgText = (item.totalServings > 0 && item.averagePerServing > 0) ? `${formatCurrency(item.averagePerServing, 1)}/份` : '-';
    return `<tr>
      <td>${item.days} 天</td>
      <td>${servingText}</td>
      <td>${item.totalServings > 0 ? item.totalServings : '-'}</td>
      <td>${totalWeightText}</td>
      <td class="quote-cost-total">${totalPriceText}</td>
      <td>${avgText}</td>
    </tr>`;
  }).join('');
  const tableHtml = `
    <table class="quote-cost-table">
      <thead>
        <tr>
          <th>制作天数</th>
          <th>每份重量</th>
          <th>总份数</th>
          <th>总净重</th>
          <th>订单总价</th>
          <th>平均每份费用</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
  const notesHtml = `
    <div class="quote-cost-notes">
      <div>1、制作天数/份数可自选，表中为参考用量；</div>
      <div>2、按小家伙的进餐习惯，每顿饭分装为1份。每份重量根据食谱的热量密度和小家伙的每日能量需求计算得出，需要调整也可以告诉我。</div>
    </div>
  `;
  return `<div class="quote-cost-wrapper">${tableHtml}${notesHtml}</div>`;
}

function renderQuoteResult(customer, results, options = {}) {
  const contentEl = $('quote-result-content');
  const resultCard = $('quote-result-card');
  if (!contentEl || !resultCard) return;
  const summaryHtml = buildQuoteCustomerSummary(customer);
  const overrideControlsHtml = (results && results.length > 0) ? buildQuoteOverrideControls({
    overrides: options.overrides,
    defaultServingWeight: options.defaultServingWeight
  }) : '';
  const recipeHtml = results.map(item => {
    const ingredientTable = buildQuoteIngredientsTable(item.ingredientDetails);
    const costTable = buildQuoteCostTable(item.costComparison);
    const headerHtml = `
      <div class="quote-recipe-header">
        <h4 class="quote-recipe-title">${escapeHtml(item.recipe.name || '-')}</h4>
        <div class="quote-recipe-subtitle">编号：${escapeHtml(item.recipe.code || '-')}</div>
      </div>
    `;
    return `
      <div class="quote-block">
        ${headerHtml}
        ${buildDetailGrid(item.basicRows, { columns: 4, compact: true })}
        <div class="detail-section-title">原料组成</div>
        ${ingredientTable}
        <div class="detail-section-title">营养数据</div>
        ${buildDetailGrid(item.nutritionRows, { columns: 4, compact: true })}
        <div class="detail-section-title">费用对比</div>
        ${costTable}
      </div>
    `;
  }).join('');
  contentEl.innerHTML = `${summaryHtml}${overrideControlsHtml}${recipeHtml}`;
  resultCard.style.display = 'block';
  if (options.disableAutoScroll !== true) {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function bindQuoteOverrideControls(options = {}) {
  const overrides = quoteOverrides || { servingWeight: null, shippingType: 'remote' };
  const defaultServingWeight = options.defaultServingWeight || 0;
  const weightInput = $('quote-override-serving-weight');
  if (weightInput) {
    weightInput.value = overrides.servingWeight != null ? overrides.servingWeight : '';
    if (defaultServingWeight > 0) {
      weightInput.placeholder = `默认约 ${Math.round(defaultServingWeight)} g/份`;
    }
    weightInput.addEventListener('change', () => {
      const value = parseFloat(weightInput.value);
      if (Number.isFinite(value) && value > 0) {
        quoteOverrides.servingWeight = value;
      } else {
        quoteOverrides.servingWeight = null;
        weightInput.value = '';
      }
      renderQuoteResultWithOverrides({ silent: true, focusTarget: 'weight' });
    });
  }

  const shippingSelect = $('quote-override-shipping-type');
  if (shippingSelect) {
    shippingSelect.value = overrides.shippingType || 'remote';
    shippingSelect.addEventListener('change', () => {
      quoteOverrides.shippingType = shippingSelect.value || 'remote';
      renderQuoteResultWithOverrides({ silent: true, focusTarget: 'shipping' });
    });
  }

  const resetBtn = $('quote-override-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', (event) => {
      event.preventDefault();
      resetQuoteOverrides();
      renderQuoteResultWithOverrides({ silent: true, focusTarget: 'weight' });
    });
  }
}

function triggerDownload(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function exportQuoteImage() {
  const exportBtn = $('btn-export-quote-image');
  const resultCard = $('quote-result-card');
  const resultContent = $('quote-result-content');
  if (!resultCard || resultCard.style.display === 'none' || !resultContent || !resultContent.innerHTML.trim()) {
    alert('请先生成食谱对比单');
    return;
  }
  if (!window.htmlToImage || typeof window.htmlToImage.toPng !== 'function') {
    alert('当前环境暂不支持生成图片，请升级浏览器后重试');
    return;
  }
  let scrollY = window.scrollY || 0;
  try {
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.dataset.loading = 'true';
      exportBtn.textContent = '生成中...';
    }
    resultCard.classList.add('quote-export-mode');
    window.scrollTo({ top: resultCard.offsetTop, behavior: 'instant' });

    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const pixelRatio = Math.min(3, (window.devicePixelRatio || 1) * 1.6);
    const dataUrl = await window.htmlToImage.toPng(resultCard, {
      pixelRatio,
      cacheBust: true,
      backgroundColor: '#ffffff'
    });
    const fileName = `quote-${formatFileTimestamp()}.png`;
    triggerDownload(dataUrl, fileName);
  } catch (error) {
    console.error('生成图片失败:', error);
    alert('生成图片失败，请重试');
  } finally {
    resultCard.classList.remove('quote-export-mode');
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.dataset.loading = 'false';
      exportBtn.textContent = '生成图片';
    }
  }
}

function closeQuoteResult() {
  const resultCard = $('quote-result-card');
  const contentEl = $('quote-result-content');
  if (resultCard) resultCard.style.display = 'none';
  if (contentEl) contentEl.innerHTML = '';
}

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
            <button class="btn small" data-quote="${c.id}">筛选食谱</button>
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
  list.querySelectorAll('[data-quote]').forEach(btn => btn.addEventListener('click', () => openQuoteRecipeSelector(btn.dataset.quote)));
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
      if (existsIdx >= 0) {
        store.customers.splice(existsIdx, 1, record);
        console.log('更新顾客记录:', record.petName);
      } else {
        store.customers.unshift(record);
        console.log('新增顾客记录:', record.petName);
      }
      
      if (saveApp()) {
        const card = $('customer-form-card'); 
        if (card) card.style.display = 'none';
        renderCustomersList();
        console.log('当前顾客总数:', store.customers.length);
      } else {
        alert('保存失败，请重试');
      }
    });
  }
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  if (priceEditArea && !priceEditArea.dataset.editing) {
    priceEditArea.dataset.editing = manualFoodMakingOrderPrice != null ? 'true' : 'false';
  }

  const quoteSearchInput = $('quote-recipe-search');
  if (quoteSearchInput) {
    quoteSearchInput.addEventListener('input', (e) => {
      quoteRecipeFilter.search = (e.target.value || '').trim();
      renderQuoteRecipeList();
    });
  }
  const quoteLifeStageFilterEl = $('quote-lifeStage-filter');
  if (quoteLifeStageFilterEl) {
    quoteLifeStageFilterEl.addEventListener('change', (e) => {
      quoteRecipeFilter.lifeStage = e.target.value || '';
      renderQuoteRecipeList();
    });
  }
  const quoteCancelBtn = $('btn-quote-cancel');
  if (quoteCancelBtn) {
    quoteCancelBtn.addEventListener('click', () => {
      closeQuoteRecipeSelector();
    });
  }
  const quoteGenerateBtn = $('btn-quote-generate');
  if (quoteGenerateBtn) {
    quoteGenerateBtn.addEventListener('click', () => {
      generateQuoteComparison();
    });
  }
  const quoteResultCloseBtn = $('btn-close-quote-result');
  if (quoteResultCloseBtn) {
    quoteResultCloseBtn.addEventListener('click', () => {
      closeQuoteResult();
    });
  }
  const quoteExportBtn = $('btn-export-quote-image');
  if (quoteExportBtn) {
    quoteExportBtn.addEventListener('click', () => {
      exportQuoteImage();
    });
  }
}

// ========== 原料管理模块 ==========

function populateCategorySelects() {
  const categorySelect = $('i-category');
  const categoryFilterSelect = $('ingredient-category-filter');
  const nameFilterSelect = $('ingredient-name-filter');
  
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">请选择类别</option>';
    INGREDIENT_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categorySelect.appendChild(opt);
    });
  }
  
  if (categoryFilterSelect) {
    categoryFilterSelect.innerHTML = '<option value="">全部类别</option>';
    INGREDIENT_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilterSelect.appendChild(opt);
    });
  }
  
  // 填充项目名称筛选下拉框
  if (nameFilterSelect) {
    updateNameFilterSelect();
  }
}

// 更新项目名称筛选下拉框
function updateNameFilterSelect() {
  const nameFilterSelect = $('ingredient-name-filter');
  if (!nameFilterSelect) return;
  
  // 获取所有唯一的项目名称
  const uniqueNames = [...new Set(store.ingredients.map(ing => ing.name).filter(Boolean))].sort();
  
  nameFilterSelect.innerHTML = '<option value="">全部项目</option>';
  uniqueNames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    nameFilterSelect.appendChild(opt);
  });
}

function calculatePricePer500(cost, quantity, unit) {
  if (!cost || !quantity || quantity <= 0) return 0;
  
  // 将数量转换为g或ml（基础单位）
  let quantityInBaseUnit = quantity;
  if (unit === 'kg') quantityInBaseUnit = quantity * 1000;
  else if (unit === 'L') quantityInBaseUnit = quantity * 1000;
  else if (unit === 'g' || unit === 'ml') quantityInBaseUnit = quantity;
  // 其他单位（个、包、盒、瓶、袋）需要知道每单位重量，暂时不转换
  
  if (quantityInBaseUnit <= 0) return 0;
  return (cost / quantityInBaseUnit) * 500;
}

function updateIngredientPriceFields() {
  const cost = Number($('i-cost').value) || 0;
  const quantity = Number($('i-quantity').value) || 0;
  const unit = $('i-unit').value || 'g';
  // 可食部现在是百分比，需要转换为0-1的小数
  const ediblePortionPercent = Number($('i-ediblePortion').value) || 100;
  const ediblePortion = ediblePortionPercent / 100;
  
  const pricePer500 = calculatePricePer500(cost, quantity, unit);
  const ediblePricePer500 = ediblePortion > 0 ? pricePer500 / ediblePortion : 0;
  
  const priceEl = $('i-pricePer500');
  const ediblePriceEl = $('i-ediblePricePer500');
  
  if (priceEl) priceEl.value = pricePer500.toFixed(4);
  if (ediblePriceEl) ediblePriceEl.value = ediblePricePer500.toFixed(4);
}
// 根据类别更新项目下拉框
function updateNameSelectByCategory() {
  const categorySelect = $('i-category');
  const nameSelect = $('i-name');
  
  if (!categorySelect || !nameSelect) return;
  
  const selectedCategory = categorySelect.value.trim();
  
  // 获取该类别下的所有唯一项目名称
  const categoryItems = selectedCategory 
    ? store.ingredients
        .filter(ing => ing.category === selectedCategory)
        .map(ing => ing.name)
        .filter(Boolean)
    : [];
  
  const uniqueNames = [...new Set(categoryItems)].sort();
  
  // 清空并重新填充下拉框
  nameSelect.innerHTML = '<option value="">请选择项目</option>';
  
  if (uniqueNames.length === 0 && selectedCategory) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '该类别下暂无项目';
    opt.disabled = true;
    nameSelect.appendChild(opt);
  } else {
    uniqueNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      nameSelect.appendChild(opt);
    });
  }
  
  // 如果类别改变，清空项目选择和编号
  if (selectedCategory) {
    nameSelect.value = '';
    const codeEl = $('i-code');
    if (codeEl) codeEl.value = '';
  }
}

// 自动生成编号（当类别和项目都填写后）
function autoGenerateCode() {
  const category = $('i-category').value.trim();
  const name = $('i-name').value.trim();
  const codeEl = $('i-code');
  const ingredientId = $('ingredient-id').value || null;
  
  console.log('自动生成编号 - 类别:', category, '项目:', name, 'ID:', ingredientId);
  
  if (!category || !name) {
    console.log('类别或项目为空，无法生成编号');
    if (codeEl) codeEl.value = '';
    return;
  }
  
  if (codeEl) {
    const code = generateIngredientCode(category, name, ingredientId);
    console.log('生成的编号:', code);
    if (code) {
      codeEl.value = code;
    } else {
      console.warn('编号生成失败');
      codeEl.value = '';
    }
  }
}

// 格式化原料详细信息
function formatIngredientDetails(ing) {
  const parts = [];
  parts.push(`编号：${ing.code || '-'}`);
  parts.push(`类别：${ing.category || '-'}`);
  parts.push(`项目（名称）：${ing.name || '-'}`);
  parts.push(`品牌/来源：${ing.brand || '-'}`);
  if (ing.cost != null) parts.push(`费用（采购价格）：${ing.cost.toFixed(2)}`);
  if (ing.quantity != null) parts.push(`单量（采购数量）：${ing.quantity} ${ing.unit || ''}`);
  parts.push(`单位：${ing.unit || '-'}`);
  if (ing.pricePer500 != null) parts.push(`单价/500单位：${ing.pricePer500.toFixed(4)}`);
  if (ing.ediblePortion != null) {
    const percent = Math.round(ing.ediblePortion * 100);
    if (percent !== 100) parts.push(`可食部：${percent}%`);
  }
  if (ing.ediblePricePer500 != null) parts.push(`可食部单价/500单位：${ing.ediblePricePer500.toFixed(4)}`);
  if (ing.weightPerUnit != null) parts.push(`每单位重量：${ing.weightPerUnit} g`);
  if (ing.description) parts.push(`说明：${ing.description}`);
  if (ing.mainFunction) parts.push(`主要作用：${ing.mainFunction}`);
  return `<div class="item-details">${parts.map(t => `<div>${t}</div>`).join('')}</div>`;
}

function renderIngredientsList() {
  const list = $('ingredients-list');
  if (!list) return;
  
  const { pageItems, total, totalPages } = paginatedIngredients();
  
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="muted" style="text-align:center; padding:20px">暂无原料数据</div>';
    $('ingredients-total').textContent = '共 0 条';
    $('ingredients-pageinfo').textContent = '';
    $('ingredients-prev').disabled = true;
    $('ingredients-next').disabled = true;
    return;
  }
  
  list.innerHTML = pageItems.map(ing => {
    const pricePer500 = (ing.pricePer500 || 0).toFixed(2);
    const description = (ing.description || '').substring(0, 40);
    const mainFunction = (ing.mainFunction || '').substring(0, 40);
    return `
      <div class="list-item" data-id="${ing.id}">
        <div class="list-item-row" style="grid-template-columns: 1fr 1.2fr 1fr 0.8fr 1fr 1.2fr 1.2fr;">
          <div>${ing.category || '-'}</div>
          <div>${ing.name || '-'}</div>
          <div>${ing.brand || '-'}</div>
          <div>${ing.unit || '-'}</div>
          <div>${pricePer500}</div>
          <div style="font-size:13px; color:var(--text-secondary)">${description}${(ing.description || '').length > 40 ? '...' : ''}</div>
          <div style="font-size:13px; color:var(--text-secondary)">${mainFunction}${(ing.mainFunction || '').length > 40 ? '...' : ''}</div>
        </div>
        <div class="item-actions">
          <button class="btn small" data-detail="${ing.id}">详细信息</button>
          <button class="btn small" data-edit="${ing.id}">编辑</button>
          <button class="btn small" data-del="${ing.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  // 绑定详细信息按钮
  list.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.detail;
      const wrap = list.querySelector(`.list-item[data-id="${id}"]`);
      const existing = wrap.querySelector('.item-details');
      if (existing) {
        existing.remove();
        return;
      }
      const ing = store.ingredients.find(x => x.id === id);
      if (!ing) return;
      wrap.insertAdjacentHTML('beforeend', formatIngredientDetails(ing));
    });
  });
  
  // 绑定编辑按钮
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      openIngredientForm(btn.dataset.edit);
      const formCard = $('ingredient-form-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  
  // 绑定删除按钮
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteIngredient(btn.dataset.del));
  });
  
  $('ingredients-total').textContent = `共 ${total} 条`;
  $('ingredients-pageinfo').textContent = `第 ${store.ingredientPage}/${totalPages} 页`;
  $('ingredients-prev').disabled = store.ingredientPage <= 1;
  $('ingredients-next').disabled = store.ingredientPage >= totalPages;
}

function paginatedIngredients() {
  const searchQ = ($('ingredient-search').value || '').trim().toLowerCase();
  const categoryFilter = ($('ingredient-category-filter').value || '').trim();
  const nameFilter = ($('ingredient-name-filter').value || '').trim();
  
  const filtered = store.ingredients.filter(ing => {
    const matchSearch = !searchQ || 
      (ing.name || '').toLowerCase().includes(searchQ) ||
      (ing.brand || '').toLowerCase().includes(searchQ);
    
    const matchCategory = !categoryFilter || ing.category === categoryFilter;
    const matchName = !nameFilter || ing.name === nameFilter;
    
    return matchSearch && matchCategory && matchName;
  });
  
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / store.ingredientPageSize));
  if (store.ingredientPage > totalPages) store.ingredientPage = totalPages;
  
  const start = (store.ingredientPage - 1) * store.ingredientPageSize;
  const pageItems = filtered.slice(start, start + store.ingredientPageSize);
  
  return { pageItems, total, totalPages };
}

function openIngredientForm(id = null) {
  const card = $('ingredient-form-card');
  const title = $('ingredient-form-title');
  const form = $('ingredient-form');
  
  if (!card || !form) return;
  
  if (id) {
    const ing = store.ingredients.find(x => x.id === id);
    if (!ing) return;
    
    if (title) title.textContent = '编辑原料';
    $('ingredient-id').value = ing.id;
    $('i-code').value = ing.code || '';
    
    // 先设置类别，然后更新项目下拉框
    $('i-category').value = ing.category || '';
    updateNameSelectByCategory();
    
    // 然后设置项目（如果在下拉框中存在）
    const nameSelect = $('i-name');
    if (nameSelect && ing.name) {
      // 检查项目是否在下拉框中
      const optionExists = Array.from(nameSelect.options).some(opt => opt.value === ing.name);
      if (optionExists) {
        nameSelect.value = ing.name;
        // 编辑时，如果编号已存在，不自动重新生成；如果编号为空，则生成
        if (!ing.code || ing.code.trim() === '') {
          setTimeout(() => autoGenerateCode(), 100);
        }
      } else {
        // 如果不存在，添加一个选项
        const opt = document.createElement('option');
        opt.value = ing.name;
        opt.textContent = ing.name;
        nameSelect.appendChild(opt);
        nameSelect.value = ing.name;
        // 编辑时，如果编号已存在，不自动重新生成；如果编号为空，则生成
        if (!ing.code || ing.code.trim() === '') {
          setTimeout(() => autoGenerateCode(), 100);
        }
      }
    }
    
    $('i-brand').value = ing.brand || '';
    $('i-cost').value = ing.cost || '';
    $('i-quantity').value = ing.quantity || '';
    $('i-unit').value = ing.unit || 'g';
    $('i-pricePer500').value = ing.pricePer500 || '';
    // 可食部从0-1转换为百分比
    const ediblePortionPercent = ing.ediblePortion !== undefined ? Math.round(ing.ediblePortion * 100) : 100;
    $('i-ediblePortion').value = ediblePortionPercent;
    $('i-ediblePricePer500').value = ing.ediblePricePer500 || '';
    $('i-weightPerUnit').value = ing.weightPerUnit || '';
    $('i-description').value = ing.description || '';
    $('i-mainFunction').value = ing.mainFunction || '';
  } else {
    if (title) title.textContent = '新增原料';
    form.reset();
    $('ingredient-id').value = '';
    $('i-ediblePortion').value = '100';
    $('i-code').value = '';
    // 清空项目下拉框
    const nameSelect = $('i-name');
    if (nameSelect) {
      nameSelect.innerHTML = '<option value="">请先选择类别</option>';
    }
  }
  
  updateIngredientPriceFields();
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function deleteIngredient(id) {
  if (!confirm('确定要删除这个原料吗？')) return;
  const idx = store.ingredients.findIndex(x => x.id === id);
  if (idx >= 0) {
    store.ingredients.splice(idx, 1);
    saveApp();
    updateNameFilterSelect(); // 更新名称筛选下拉框
    renderIngredientsList();
  }
}
// 批量生成缺失的编号
function generateMissingCodes() {
  // 找出所有编号为空或无效的原料（只检查编号）
  const missingCodes = store.ingredients.filter(ing => {
    return !ing.code || ing.code.trim() === '';
  });
  
  if (missingCodes.length === 0) {
    alert('所有原料都已拥有编号！');
    return;
  }
  
  // 统计需要生成编号的数量（有类别和项目的）
  const validMissing = missingCodes.filter(ing => ing.category && ing.name);
  const invalidMissing = missingCodes.length - validMissing.length;
  
  if (validMissing.length === 0) {
    alert(`有 ${invalidMissing} 条原料缺少类别或项目名称，无法生成编号。请先完善这些原料的信息。`);
    return;
  }
  
  const confirmMsg = `发现 ${validMissing.length} 条原料缺少编号，${invalidMissing > 0 ? `另有 ${invalidMissing} 条缺少类别或项目名称。` : ''}\n是否要为缺少编号的原料自动生成编号？\n\n注意：操作前会自动创建备份。`;
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  // 创建备份
  const currentData = {
    customers: store.customers,
    ingredients: store.ingredients
  };
  createBackup(currentData);
  
  // 为每个缺少编号的原料生成编号
  let generated = 0;
  let failed = 0;
  
  validMissing.forEach(ing => {
    if (!ing.code || ing.code.trim() === '') {
      const code = generateIngredientCode(ing.category, ing.name, ing.id);
      if (code) {
        ing.code = code;
        generated++;
      } else {
        console.warn('生成编号失败:', ing.category, ing.name);
        failed++;
      }
    }
  });
  
  // 保存数据
  if (saveApp()) {
    updateNameFilterSelect();
    renderIngredientsList();
    alert(`编号生成完成！\n成功生成: ${generated} 条\n失败: ${failed} 条${invalidMissing > 0 ? `\n缺少类别/项目: ${invalidMissing} 条` : ''}`);
  } else {
    alert('保存失败，请重试');
  }
}

function importFromExcel(file) {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      let imported = 0;
      let skipped = 0;
      
      jsonData.forEach(row => {
        // 检查是否已存在（按编号判断）
        const code = (row['编号'] || '').toString().trim();
        if (!code) { skipped++; return; }
        
        const exists = store.ingredients.some(ing => ing.code === code);
        if (exists) { skipped++; return; }
        
        const cost = parseFloat(row['费用']) || 0;
        const quantity = parseFloat(row['单量']) || 0;
        const unit = (row['单位'] || 'g').toString().trim();
        // Excel中的可食部是0-1的小数，保持原样
        const ediblePortion = parseFloat(row['可食部']) || 1;
        const pricePer500 = parseFloat(row['单价/500单位']) || calculatePricePer500(cost, quantity, unit);
        const ediblePricePer500 = parseFloat(row['可食部单价/500单位']) || (pricePer500 / ediblePortion);
        
        // 自动生成编号（如果Excel中没有编号）
        const category = (row['类别'] || '').toString().trim();
        const name = (row['项目'] || '').toString().trim();
        let finalCode = code;
        if (!finalCode && category && name) {
          finalCode = generateIngredientCode(category, name, null);
        }
        
        const ingredient = {
          id: genId(),
          code: finalCode || '',
          category: category,
          name: name,
          brand: (row['品牌/来源'] || '').toString().trim(),
          cost: cost,
          quantity: quantity,
          unit: unit,
          pricePer500: pricePer500,
          ediblePortion: ediblePortion,
          ediblePricePer500: ediblePricePer500,
          weightPerUnit: parseFloat(row['每单位重量(g)']) || null,
          description: (row['说明'] || '').toString().trim(),
          mainFunction: (row['主要作用'] || '').toString().trim(),
          createdAt: Date.now()
        };
        
        if (!ingredient.name) { skipped++; return; }
        
        store.ingredients.push(ingredient);
        imported++;
      });
      
      saveApp();
      updateNameFilterSelect(); // 更新名称筛选下拉框
      renderIngredientsList();
      alert(`导入完成！成功导入 ${imported} 条，跳过 ${skipped} 条（已存在或无名称）`);
      
      const importCard = $('import-excel-card');
      if (importCard) importCard.style.display = 'none';
      const fileInput = $('excel-file-input');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('导入Excel失败:', error);
      alert('导入失败：' + error.message);
    }
  };
  
  reader.readAsArrayBuffer(file);
}

// 渲染类别管理列表
function renderCategoryManageList() {
  const listEl = $('category-list-manage');
  if (!listEl) return;
  
  listEl.innerHTML = INGREDIENT_CATEGORIES.map((cat, idx) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border:0.5px solid var(--border); border-radius:6px;">
      <span>${cat}</span>
      <button class="btn small" onclick="removeCategory(${idx})" style="font-size:12px;">删除</button>
    </div>
  `).join('');
}

// 删除类别
function removeCategory(index) {
  if (confirm(`确定要删除类别"${INGREDIENT_CATEGORIES[index]}"吗？`)) {
    INGREDIENT_CATEGORIES.splice(index, 1);
    populateCategorySelects();
    renderCategoryManageList();
  }
}

// 添加类别
function addCategory() {
  const input = $('new-category-input');
  if (!input) return;
  const newCat = input.value.trim();
  if (!newCat) {
    alert('请输入类别名称');
    return;
  }
  if (INGREDIENT_CATEGORIES.includes(newCat)) {
    alert('该类别已存在');
    return;
  }
  INGREDIENT_CATEGORIES.push(newCat);
  INGREDIENT_CATEGORIES.sort();
  populateCategorySelects();
  renderCategoryManageList();
  input.value = '';
}

// 渲染项目名称管理列表
function renderNameManageList() {
  const listEl = $('name-list-manage');
  if (!listEl) return;
  
  const uniqueNames = [...new Set(store.ingredients.map(ing => ing.name).filter(Boolean))].sort();
  
  if (uniqueNames.length === 0) {
    listEl.innerHTML = '<div class="muted" style="text-align:center; padding:20px;">暂无项目数据</div>';
    return;
  }
  
  listEl.innerHTML = uniqueNames.map((name, idx) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border:0.5px solid var(--border); border-radius:6px; cursor:pointer; transition:background 0.2s;" 
         data-name="${name}"
         onmouseover="this.style.background='var(--bg-secondary)'" 
         onmouseout="this.style.background=''">
      <span>${name}</span>
      <span style="font-size:12px; color:var(--text-secondary);">${store.ingredients.filter(ing => ing.name === name).length} 条</span>
    </div>
  `).join('');
  
  // 使用事件委托避免字符串转义问题
  listEl.querySelectorAll('[data-name]').forEach(div => {
    div.addEventListener('click', () => {
      const name = div.getAttribute('data-name');
      if (name) selectNameForForm(name);
    });
  });
}
// 选择项目名称填入表单
function selectNameForForm(name) {
  const nameEl = $('i-name');
  if (nameEl) {
    // 检查项目是否在下拉框中
    const optionExists = Array.from(nameEl.options).some(opt => opt.value === name);
    if (!optionExists) {
      // 如果不存在，添加一个选项
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      nameEl.appendChild(opt);
    }
    nameEl.value = name;
    autoGenerateCode(); // 自动生成编号
  }
  // 关闭编辑对话框
  const editCard = $('edit-name-card');
  if (editCard) editCard.style.display = 'none';
  const input = $('new-name-input');
  if (input) input.value = '';
}

// 添加项目名称（输入新项目）
function addNameToForm() {
  const input = $('new-name-input');
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) {
    alert('请输入项目名称');
    return;
  }
  // 直接将输入的值填入项目字段
  selectNameForForm(newName);
}
function setupIngredientsModule() {
  populateCategorySelects();
  
  const newBtn = $('btn-new-ingredient');
  if (newBtn) newBtn.addEventListener('click', () => openIngredientForm());
  
  const cancelBtn = $('btn-cancel-ingredient');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    const card = $('ingredient-form-card');
    if (card) card.style.display = 'none';
  });
  
  // 类别变化时更新项目下拉框
  const categoryEl = $('i-category');
  if (categoryEl) {
    categoryEl.addEventListener('change', () => {
      console.log('类别变化:', categoryEl.value);
      updateNameSelectByCategory();
      // 类别改变后，如果项目已选择，重新生成编号
      const nameEl = $('i-name');
      if (nameEl && nameEl.value) {
        setTimeout(() => autoGenerateCode(), 100);
      }
    });
  }
  
  // 项目变化时自动生成编号
  const nameEl = $('i-name');
  if (nameEl) {
    nameEl.addEventListener('change', () => {
      console.log('项目变化:', nameEl.value);
      autoGenerateCode();
    });
  }
  
  // 编辑类别按钮
  const editCategoryBtn = $('btn-edit-category');
  if (editCategoryBtn) {
    editCategoryBtn.addEventListener('click', () => {
      renderCategoryManageList();
      const card = $('edit-category-card');
      if (card) card.style.display = 'block';
    });
  }
  
  const cancelEditCategoryBtn = $('btn-cancel-edit-category');
  if (cancelEditCategoryBtn) {
    cancelEditCategoryBtn.addEventListener('click', () => {
      const card = $('edit-category-card');
      if (card) card.style.display = 'none';
    });
  }
  
  const addCategoryBtn = $('btn-add-category');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', addCategory);
    const newCategoryInput = $('new-category-input');
    if (newCategoryInput) {
      newCategoryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCategory();
        }
      });
    }
  }
  
  // 编辑项目按钮
  const editNameBtn = $('btn-edit-name');
  if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
      renderNameManageList();
      const card = $('edit-name-card');
      if (card) card.style.display = 'block';
    });
  }
  
  const cancelEditNameBtn = $('btn-cancel-edit-name');
  if (cancelEditNameBtn) {
    cancelEditNameBtn.addEventListener('click', () => {
      const card = $('edit-name-card');
      if (card) card.style.display = 'none';
    });
  }
  
  const addNameBtn = $('btn-add-name');
  if (addNameBtn) {
    addNameBtn.addEventListener('click', addNameToForm);
    const newNameInput = $('new-name-input');
    if (newNameInput) {
      newNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addNameToForm();
        }
      });
    }
  }
  
  const searchEl = $('ingredient-search');
  if (searchEl) searchEl.addEventListener('input', () => {
    store.ingredientPage = 1;
    renderIngredientsList();
  });
  
  const categoryFilterEl = $('ingredient-category-filter');
  if (categoryFilterEl) categoryFilterEl.addEventListener('change', () => {
    store.ingredientPage = 1;
    renderIngredientsList();
  });
  
  const nameFilterEl = $('ingredient-name-filter');
  if (nameFilterEl) nameFilterEl.addEventListener('change', () => {
    store.ingredientPage = 1;
    renderIngredientsList();
  });
  
  const prevBtn = $('ingredients-prev');
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (store.ingredientPage > 1) {
      store.ingredientPage--;
      renderIngredientsList();
    }
  });
  
  const nextBtn = $('ingredients-next');
  if (nextBtn) nextBtn.addEventListener('click', () => {
    const { totalPages } = paginatedIngredients();
    if (store.ingredientPage < totalPages) {
      store.ingredientPage++;
      renderIngredientsList();
    }
  });
  
  // 价格自动计算
  const priceFields = ['i-cost', 'i-quantity', 'i-unit', 'i-ediblePortion'];
  priceFields.forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', updateIngredientPriceFields);
  });
  
  // 表单提交
  const form = $('ingredient-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('ingredient-id').value || genId();
      const name = $('i-name').value.trim();
      if (!name) {
        alert('请填写原料名称');
        return;
      }
      
      const cost = Number($('i-cost').value) || 0;
      const quantity = Number($('i-quantity').value) || 0;
      const unit = $('i-unit').value || 'g';
      // 可食部从百分比转换为0-1的小数
      const ediblePortionPercent = Number($('i-ediblePortion').value) || 100;
      const ediblePortion = ediblePortionPercent / 100;
      
      // 自动生成编号（如果是新增且没有编号，或编辑时编号为空）
      let code = $('i-code').value.trim();
      if (!code) {
        code = generateIngredientCode($('i-category').value.trim(), name, id || null);
        if (code) $('i-code').value = code;
      }
      
      updateIngredientPriceFields();
      const pricePer500 = Number($('i-pricePer500').value) || 0;
      const ediblePricePer500 = Number($('i-ediblePricePer500').value) || 0;
      
      const record = {
        id,
        code: code || '',
        category: $('i-category').value.trim(),
        name: name,
        brand: $('i-brand').value.trim(),
        cost: cost,
        quantity: quantity,
        unit: unit,
        pricePer500: pricePer500,
        ediblePortion: ediblePortion,
        ediblePricePer500: ediblePricePer500,
        weightPerUnit: $('i-weightPerUnit').value ? Number($('i-weightPerUnit').value) : null,
        description: $('i-description').value.trim(),
        mainFunction: $('i-mainFunction').value.trim(),
        updatedAt: Date.now()
      };
      
      const existsIdx = store.ingredients.findIndex(x => x.id === id);
      if (existsIdx >= 0) {
        // 保留创建时间
        record.createdAt = store.ingredients[existsIdx].createdAt;
        store.ingredients.splice(existsIdx, 1, record);
      } else {
        record.createdAt = Date.now();
        store.ingredients.unshift(record);
      }
      
      saveApp();
      updateNameFilterSelect(); // 更新名称筛选下拉框
      const card = $('ingredient-form-card');
      if (card) card.style.display = 'none';
      renderIngredientsList();
    });
  }
  
  // Excel导入
  const importBtn = $('btn-import-excel');
  if (importBtn) importBtn.addEventListener('click', () => {
    const importCard = $('import-excel-card');
    if (importCard) importCard.style.display = 'block';
  });
  
  const cancelImportBtn = $('btn-cancel-import');
  if (cancelImportBtn) cancelImportBtn.addEventListener('click', () => {
    const importCard = $('import-excel-card');
    if (importCard) importCard.style.display = 'none';
    const fileInput = $('excel-file-input');
    if (fileInput) fileInput.value = '';
  });
  
  const confirmImportBtn = $('btn-confirm-import');
  if (confirmImportBtn) confirmImportBtn.addEventListener('click', () => {
    const fileInput = $('excel-file-input');
    if (fileInput && fileInput.files.length > 0) {
      importFromExcel(fileInput.files[0]);
    } else {
      alert('请先选择Excel文件');
    }
  });
  
  // 初始渲染
  renderIngredientsList();
  
  // 当数据变化时，更新名称筛选下拉框
  const originalSaveApp = saveApp;
  const checkAndUpdate = () => {
    setTimeout(() => {
      updateNameFilterSelect();
    }, 100);
  };
  
  // 监听数据变化，更新名称筛选
  checkAndUpdate();
}

// 暴露给全局，方便按钮调用
window.openIngredientForm = openIngredientForm;
window.deleteIngredient = deleteIngredient;
window.removeCategory = removeCategory;
window.selectNameForForm = selectNameForForm;

// ========== 食谱管理模块 ==========

// 当前编辑的食谱的食材列表（临时存储）
let currentRecipeIngredients = [];
let currentRecipeCookingSteps = [];

// 当前选中的原料ID（用于搜索）
let selectedIngredientId = null;

// 搜索原料并显示结果
function searchIngredients(query) {
  const resultsEl = $('r-ingredient-search-results');
  if (!resultsEl) return;
  
  const q = (query || '').trim().toLowerCase();
  
  if (!q) {
    resultsEl.style.display = 'none';
    selectedIngredientId = null;
    return;
  }
  
  // 搜索原料（按名称、类别、品牌）
  const matches = store.ingredients.filter(ing => {
    if (!ing.category || !ing.name) return false;
    const name = (ing.name || '').toLowerCase();
    const category = (ing.category || '').toLowerCase();
    const brand = (ing.brand || '').toLowerCase();
    return name.includes(q) || category.includes(q) || brand.includes(q);
  }).slice(0, 10); // 最多显示10个结果
  
  if (matches.length === 0) {
    resultsEl.innerHTML = '<div style="padding:12px; text-align:center; color:var(--text-secondary);">未找到匹配的原料</div>';
    resultsEl.style.display = 'block';
    return;
  }
  
  resultsEl.innerHTML = matches.map(ing => {
    const unit = ing.unit || 'g';
    return `
      <div class="ingredient-search-item" data-id="${ing.id}" style="padding:8px 12px; cursor:pointer; border-bottom:0.5px solid var(--border); transition:background 0.2s;"
           onmouseover="this.style.background='var(--bg-secondary)'"
           onmouseout="this.style.background=''">
        <div style="font-weight:500;">${ing.name || ''}${ing.description ? '-' + ing.description : ''}${ing.brand ? '（' + ing.brand + '）' : ''}</div>
        <div style="font-size:12px; color:var(--text-secondary);">单位: ${unit}</div>
      </div>
    `;
  }).join('');
  
  // 绑定点击事件
  resultsEl.querySelectorAll('.ingredient-search-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const ing = store.ingredients.find(i => i.id === id);
      if (ing) {
        selectedIngredientId = id;
        const searchInput = $('r-ingredient-search');
        if (searchInput) {
          const name = ing.name || '';
          const description = ing.description || '';
          const brand = ing.brand || '';
          let displayText = name;
          if (description) {
            displayText += '-' + description;
          }
          if (brand) {
            displayText += '（' + brand + '）';
          }
          searchInput.value = displayText;
        }
        resultsEl.style.display = 'none';
      }
    });
  });
  
  resultsEl.style.display = 'block';
}
// 当前正在编辑的食材索引（用于原位置编辑）
let editingIngredientIndex = null;
// 渲染食谱中的食材列表
function renderRecipeIngredientsList() {
  const listEl = $('recipe-ingredients-list');
  if (!listEl) return;
  
  if (currentRecipeIngredients.length === 0) {
    listEl.innerHTML = '<div class="muted" style="text-align:center; padding:12px;">暂无食材，请添加</div>';
    return;
  }
  
  listEl.innerHTML = currentRecipeIngredients.map((item, idx) => {
    const ing = store.ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return '';
    
    const unit = item.unit || ing.unit || 'g';
    // 格式：项目-说明（品牌/来源），例如"葵花籽-有机生葵花籽（人民食品）"
    const name = ing.name || '';
    const description = ing.description || '';
    const brand = ing.brand || '';
    let displayText = name;
    if (description) {
      displayText += '-' + description;
    }
    if (brand) {
      displayText += '（' + brand + '）';
    }
    
    const isEditing = editingIngredientIndex === idx;
    
    return `
      <div class="recipe-ingredient-item" data-index="${idx}" draggable="${!isEditing}" style="display:flex; flex-direction:column; padding:8px; border:0.5px solid var(--border); border-radius:6px; background:var(--bg-secondary); ${isEditing ? 'border:2px solid var(--primary);' : 'cursor:move;'} transition:all 0.2s;"
           onmouseover="${!isEditing ? 'this.style.opacity=\'0.9\'' : ''}" onmouseout="${!isEditing ? 'this.style.opacity=\'1\'' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px; flex:1;">
            <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:4px; font-weight:600; font-size:14px; color:var(--text-primary); flex-shrink:0;">${idx + 1}</div>
            <div style="flex:1;">
              <div style="font-weight:500;">${displayText}</div>
              ${!isEditing ? `<div style="font-size:12px; color:var(--text-secondary);">${item.weight} ${unit}</div>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn small" data-edit-ingredient="${idx}" style="font-size:12px;">${isEditing ? '保存' : '编辑'}</button>
            <button type="button" class="btn small" data-remove-ingredient="${idx}" style="font-size:12px;">删除</button>
          </div>
        </div>
        ${isEditing ? `
          <div style="margin-top:8px; padding-top:8px; border-top:0.5px solid var(--border);">
            <div style="display:flex; gap:8px; align-items:center;">
              <label style="flex:1; margin:0; font-size:13px;">
                <span style="display:block; margin-bottom:4px; color:var(--text-secondary);">重量</span>
                <input type="number" min="0" step="0.1" value="${item.weight}" data-edit-weight="${idx}" style="width:100%; padding:6px 10px; font-size:14px;" />
              </label>
              <span style="font-size:13px; color:var(--text-secondary);">${unit}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  // 绑定拖拽事件
  let draggedIndex = null;
  
  listEl.querySelectorAll('.recipe-ingredient-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedIndex = parseInt(item.dataset.index, 10);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedIndex);
      item.style.opacity = '0.5';
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', (e) => {
      item.style.opacity = '1';
      item.classList.remove('dragging');
      listEl.querySelectorAll('.recipe-ingredient-item').forEach(el => {
        el.classList.remove('drag-over');
      });
      draggedIndex = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const afterElement = getDragAfterElement(listEl, e.clientY);
      const dragging = listEl.querySelector('.dragging');
      
      if (dragging && afterElement == null) {
        listEl.appendChild(dragging);
      } else if (dragging && afterElement) {
        listEl.insertBefore(dragging, afterElement);
      }
    });
    
    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (item.classList.contains('dragging')) return;
      item.classList.add('drag-over');
    });
    
    item.addEventListener('dragleave', (e) => {
      item.classList.remove('drag-over');
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      
      if (draggedIndex === null) return;
      
      // 获取拖拽元素在DOM中的最终位置
      const draggingEl = listEl.querySelector('.dragging');
      if (!draggingEl) return;
      
      // 基于DOM顺序计算目标索引
      const allItems = Array.from(listEl.children).filter(el => el.classList.contains('recipe-ingredient-item'));
      const toIndex = allItems.indexOf(draggingEl);
      
      if (draggedIndex !== toIndex && !isNaN(toIndex) && toIndex >= 0 && toIndex < currentRecipeIngredients.length) {
        // 移动数组元素
        const [movedItem] = currentRecipeIngredients.splice(draggedIndex, 1);
        currentRecipeIngredients.splice(toIndex, 0, movedItem);
        
        // 更新编辑索引
        updateIndicesAfterDrag(draggedIndex, toIndex);
        
        renderRecipeIngredientsList();
        calculateRecipeTotalWeight();
      }
    });
  });
  
  // 绑定编辑按钮
  listEl.querySelectorAll('[data-edit-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.editIngredient, 10);
      const item = currentRecipeIngredients[idx];
      if (!item) return;
      
      const ing = store.ingredients.find(i => i.id === item.ingredientId);
      if (!ing) return;
      
      if (editingIngredientIndex === idx) {
        // 保存编辑
        const weightInputEl = listEl.querySelector(`[data-edit-weight="${idx}"]`);
        const newWeight = parseFloat(weightInputEl ? weightInputEl.value : 0);
        
        if (newWeight <= 0) {
          alert('请输入重量（大于0）');
          return;
        }
        
        // 更新当前项
        item.weight = newWeight;
        
        editingIngredientIndex = null;
        selectedIngredientId = null;
        const searchInput = $('r-ingredient-search');
        if (searchInput) searchInput.value = '';
        const weightInput = $('r-ingredient-weight');
        if (weightInput) weightInput.value = '';
        
        renderRecipeIngredientsList();
        calculateRecipeTotalWeight();
      } else {
        // 开始编辑（取消之前的编辑）
        if (editingIngredientIndex !== null && editingIngredientIndex !== idx) {
          // 取消之前的编辑
          const prevItem = currentRecipeIngredients[editingIngredientIndex];
          if (prevItem) {
            // 恢复原值（如果之前有修改）
            const prevWeightInputEl = listEl.querySelector(`[data-edit-weight="${editingIngredientIndex}"]`);
            if (prevWeightInputEl) {
              prevItem.weight = parseFloat(prevWeightInputEl.value) || prevItem.weight;
            }
          }
        }
        
        editingIngredientIndex = idx;
        selectedIngredientId = item.ingredientId;
        
        renderRecipeIngredientsList();
        
        // 滚动到编辑项并聚焦重量输入框
        const itemEl = listEl.querySelector(`[data-index="${idx}"]`);
        if (itemEl) {
          itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => {
            const weightInputEl = itemEl.querySelector(`[data-edit-weight="${idx}"]`);
            if (weightInputEl) {
              weightInputEl.focus();
              weightInputEl.select();
            }
          }, 100);
        }
      }
    });
  });
  
  // 绑定卡片内重量输入框的回车事件
  listEl.querySelectorAll('[data-edit-weight]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const idx = parseInt(input.dataset.editWeight, 10);
        const saveBtn = listEl.querySelector(`[data-edit-ingredient="${idx}"]`);
        if (saveBtn) {
          saveBtn.click();
        }
      }
    });
    
    input.addEventListener('blur', () => {
      // 失去焦点时自动保存（可选）
      // const idx = parseInt(input.dataset.editWeight, 10);
      // if (editingIngredientIndex === idx) {
      //   const saveBtn = listEl.querySelector(`[data-edit-ingredient="${idx}"]`);
      //   if (saveBtn) saveBtn.click();
      // }
    });
  });
  
  // 绑定删除按钮
  listEl.querySelectorAll('[data-remove-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeIngredient, 10);
      
      // 如果正在编辑该项，取消编辑
      if (editingIngredientIndex === idx) {
        editingIngredientIndex = null;
        selectedIngredientId = null;
        const searchInput = $('r-ingredient-search');
        const weightInput = $('r-ingredient-weight');
        if (searchInput) searchInput.value = '';
        if (weightInput) weightInput.value = '';
      } else if (editingIngredientIndex !== null && editingIngredientIndex > idx) {
        // 如果删除的项在编辑项之前，更新编辑索引
        editingIngredientIndex--;
      }
      
      currentRecipeIngredients.splice(idx, 1);
      renderRecipeIngredientsList();
      calculateRecipeTotalWeight();
    });
  });
}

// 获取拖拽目标位置
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.recipe-ingredient-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 更新拖拽后的索引
function updateIndicesAfterDrag(fromIndex, toIndex) {
  // 重新渲染会更新索引，但需要更新编辑索引
  if (editingIngredientIndex !== null) {
    if (editingIngredientIndex === fromIndex) {
      editingIngredientIndex = toIndex;
    } else if (editingIngredientIndex > fromIndex && editingIngredientIndex <= toIndex) {
      editingIngredientIndex--;
    } else if (editingIngredientIndex < fromIndex && editingIngredientIndex >= toIndex) {
      editingIngredientIndex++;
    }
  }
}

// 生成食谱编号
// 规则：生命阶段 + 营养参考标准 + 食谱类型 + 升序三位数
// 生命阶段：成犬="C", 幼犬="Y", 老年犬="L", 哺乳期="B", 妊娠期="R"
// 营养参考标准：AAFCO="A", FEDIAF="F", NRC="N"
// 食谱类型：通用="T", 定制="D"
function generateRecipeCode(lifeStage, nutritionStandard, recipeType, excludeId = null) {
  const lifeStageMap = {
    'adult': 'C',
    'puppy': 'Y',
    'senior': 'L',
    'lactation': 'B',
    'pregnancy': 'R'
  };
  
  const standardMap = {
    'AAFCO': 'A',
    'FEDIAF': 'F',
    'NRC': 'N'
  };
  
  const typeMap = {
    'standard': 'T',
    'custom': 'D'
  };
  
  const prefix = (lifeStageMap[lifeStage] || 'C') + 
                 (standardMap[nutritionStandard] || 'F') + 
                 (typeMap[recipeType] || 'T');
  
  // 找到相同前缀的所有食谱，计算下一个编号
  const samePrefix = store.recipes
    .filter(recipe => {
      if (excludeId && recipe.id === excludeId) return false;
      if (!recipe.code) return false;
      return recipe.code.startsWith(prefix);
    });
  
  // 找到最大编号
  let maxNum = 0;
  samePrefix.forEach(recipe => {
    if (recipe.code) {
      const match = recipe.code.match(new RegExp(`^${prefix}(\\d{3})$`));
      if (match) {
        const num = parseInt(match[1], 10);
        maxNum = Math.max(maxNum, num);
      }
    }
  });
  
  // 计算下一个编号
  const nextNum = maxNum + 1;
  const code = prefix + String(nextNum).padStart(3, '0');
  
  return code;
}

// 自动生成食谱编号
function autoGenerateRecipeCode() {
  const lifeStage = $('r-lifeStage').value || 'adult';
  const nutritionStandard = $('r-nutritionStandard').value || 'FEDIAF';
  const recipeType = $('r-recipeType').value || 'standard';
  const recipeId = $('recipe-id').value || null;
  
  const code = generateRecipeCode(lifeStage, nutritionStandard, recipeType, recipeId);
  const codeEl = $('r-code');
  if (codeEl) {
    codeEl.value = code;
  }
}

// 添加食材到食谱
function addIngredientToRecipe() {
  const weightInput = $('r-ingredient-weight');
  const searchInput = $('r-ingredient-search');
  
  if (!weightInput) return;
  
  const ingredientId = selectedIngredientId;
  const weight = parseFloat(weightInput.value) || 0;
  
  if (!ingredientId) {
    alert('请先搜索并选择原料');
    return;
  }
  
  if (weight <= 0) {
    alert('请输入重量（大于0）');
    return;
  }
  
  const ing = store.ingredients.find(i => i.id === ingredientId);
  if (!ing) {
    alert('原料不存在');
    return;
  }
  
  // 如果正在编辑某个项，更新该项
  if (editingIngredientIndex !== null) {
    const item = currentRecipeIngredients[editingIngredientIndex];
    if (item) {
      item.ingredientId = ingredientId;
      item.weight = weight;
      item.unit = ing.unit || 'g';
      editingIngredientIndex = null;
      renderRecipeIngredientsList();
      calculateRecipeTotalWeight();
      
      // 清空输入
      selectedIngredientId = null;
      if (searchInput) searchInput.value = '';
      if (weightInput) weightInput.value = '';
      const resultsEl = $('r-ingredient-search-results');
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }
  }
  
  // 检查是否已添加（编辑模式下不检查）
  const exists = currentRecipeIngredients.find(item => item.ingredientId === ingredientId);
  if (exists) {
    if (confirm('该原料已添加，是否更新重量？')) {
      exists.weight = weight;
      exists.unit = ing.unit || 'g';
    } else {
      return;
    }
  } else {
    currentRecipeIngredients.push({
      ingredientId: ingredientId,
      weight: weight,
      unit: ing.unit || 'g'
    });
  }
  
  renderRecipeIngredientsList();
  calculateRecipeTotalWeight();
  
  // 清空输入
  selectedIngredientId = null;
  if (searchInput) searchInput.value = '';
  if (weightInput) weightInput.value = '';
  const resultsEl = $('r-ingredient-search-results');
  if (resultsEl) resultsEl.style.display = 'none';
}

// 计算食谱总重量（只计算单位为g的食材）
function calculateRecipeTotalWeight() {
  let totalWeight = 0;
  
  currentRecipeIngredients.forEach(item => {
    const ing = store.ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return;
    
    const unit = item.unit || ing.unit || 'g';
    let weightInG = item.weight;
    
    // 转换为g
    if (unit === 'kg') {
      weightInG = item.weight * 1000;
    } else if (unit === 'g' || unit === 'ml') {
      weightInG = item.weight;
    } else if (unit === 'L') {
      weightInG = item.weight * 1000;
    } else {
      // 其他单位（个、包、盒、瓶、袋）需要知道每单位重量
      if (ing.weightPerUnit) {
        weightInG = item.weight * ing.weightPerUnit;
      } else {
        // 如果没有每单位重量，跳过
        console.warn('原料缺少每单位重量，无法计算:', ing.name);
        return;
      }
    }
    
    totalWeight += weightInG;
  });
  
  const totalWeightEl = $('r-totalWeight');
  if (totalWeightEl) {
    totalWeightEl.value = totalWeight.toFixed(2);
  }
  
  // 同时计算热量密度
  calculateRecipeKcalDensity();
}
// 渲染制作流程列表
function renderRecipeCookingSteps() {
  const stepsEl = $('recipe-cooking-steps');
  if (!stepsEl) return;
  
  if (currentRecipeCookingSteps.length === 0) {
    stepsEl.innerHTML = '<div class="muted" style="text-align:center; padding:12px; font-size:13px;">暂无制作流程，点击"添加步骤"添加</div>';
    return;
  }
  
  stepsEl.innerHTML = currentRecipeCookingSteps.map((step, idx) => `
    <div style="display:flex; gap:8px; align-items:start; padding:8px; border:0.5px solid var(--border); border-radius:6px; background:var(--bg-secondary); margin-bottom:6px;">
      <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:4px; font-weight:600; font-size:13px; color:var(--text-primary); flex-shrink:0; margin-top:2px;">${idx + 1}</div>
      <textarea data-step-index="${idx}" style="flex:1; min-height:60px; padding:8px; font-size:13px; border:0.5px solid var(--border); border-radius:4px; resize:vertical;" placeholder="请输入制作步骤...">${step || ''}</textarea>
      <button type="button" class="btn small" data-remove-step="${idx}" style="font-size:12px; flex-shrink:0; margin-top:2px;">删除</button>
    </div>
  `).join('');
  
  // 绑定删除按钮
  stepsEl.querySelectorAll('[data-remove-step]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.removeStep, 10);
      currentRecipeCookingSteps.splice(idx, 1);
      renderRecipeCookingSteps();
    });
  });
  
  // 绑定textarea输入事件（自动保存）
  stepsEl.querySelectorAll('[data-step-index]').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const idx = parseInt(textarea.dataset.stepIndex, 10);
      if (idx >= 0 && idx < currentRecipeCookingSteps.length) {
        currentRecipeCookingSteps[idx] = textarea.value;
      }
    });
  });
}

// 添加制作步骤
function addCookingStep() {
  currentRecipeCookingSteps.push('');
  renderRecipeCookingSteps();
  
  // 聚焦到新添加的textarea
  setTimeout(() => {
    const stepsEl = $('recipe-cooking-steps');
    if (stepsEl) {
      const lastTextarea = stepsEl.querySelector(`[data-step-index="${currentRecipeCookingSteps.length - 1}"]`);
      if (lastTextarea) {
        lastTextarea.focus();
        lastTextarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, 100);
}

// 计算热量密度（总热量 ÷ 总重量 × 1000）
function calculateRecipeKcalDensity() {
  const totalKcalEl = $('r-totalKcal');
  const totalWeightEl = $('r-totalWeight');
  const kcalDensityEl = $('r-kcalDensity');
  
  if (!totalKcalEl || !totalWeightEl || !kcalDensityEl) return;
  
  const totalKcal = parseFloat(totalKcalEl.value) || 0;
  const totalWeight = parseFloat(totalWeightEl.value) || 0;
  
  if (totalWeight > 0) {
    const density = (totalKcal / totalWeight) * 1000;
    kcalDensityEl.value = density.toFixed(2);
  } else {
    kcalDensityEl.value = '';
  }
}

// 格式化食谱详细信息
function formatRecipeDetails(recipe) {
  const parts = [];
  const lifeStageMap = { puppy: '幼犬', adult: '成犬', senior: '老年犬', pregnancy: '妊娠期', lactation: '哺乳期' };
  const recipeTypeMap = { standard: '通用食谱', custom: '定制食谱' };
  
  parts.push(`食谱编号：${recipe.code || '-'}`);
  parts.push(`食谱名称：${recipe.name || '-'}`);
  parts.push(`适用生命阶段：${lifeStageMap[recipe.lifeStage] || recipe.lifeStage || '-'}`);
  parts.push(`营养参考标准：${recipe.nutritionStandard || '-'}`);
  
  if (recipe.software) {
    parts.push(`食谱制作软件：${recipe.software}`);
  }
  
  parts.push(`食谱类型：${recipeTypeMap[recipe.recipeType] || (recipe.isCustom ? '定制食谱' : '通用食谱')}`);
  
  // 食材列表
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    parts.push(`食材列表：`);
    recipe.ingredients.forEach(item => {
      const ing = store.ingredients.find(i => i.id === item.ingredientId);
      if (ing) {
        const name = ing.name || '';
        const description = ing.description || '';
        const brand = ing.brand || '';
        let displayText = name;
        if (description) {
          displayText += '-' + description;
        }
        if (brand) {
          displayText += '（' + brand + '）';
        }
        parts.push(`  - ${displayText}: ${item.weight} ${item.unit || ing.unit || 'g'}`);
      }
    });
  }
  
  // 营养数据
  parts.push(`营养数据（干物质占比）：`);
  if (recipe.protein != null) parts.push(`  蛋白质：${recipe.protein}%`);
  if (recipe.fat != null) parts.push(`  脂肪：${recipe.fat}%`);
  if (recipe.carb != null) parts.push(`  碳水化合物：${recipe.carb}%`);
  if (recipe.fiber != null) parts.push(`  膳食纤维：${recipe.fiber}%`);
  if (recipe.ash != null) parts.push(`  灰分：${recipe.ash}%`);
  if (recipe.moisture != null) parts.push(`  水分：${recipe.moisture}%`);
  if (recipe.caPratio != null) parts.push(`  钙磷比：${recipe.caPratio}`);
  if (recipe.totalKcal != null) parts.push(`  总热量：${recipe.totalKcal} kcal`);
  if (recipe.totalWeight != null) parts.push(`  总重量：${recipe.totalWeight} g`);
  if (recipe.kcalDensity != null) parts.push(`  热量密度：${recipe.kcalDensity} kcal/kg`);
  
  return `<div class="item-details">${parts.map(t => `<div>${t}</div>`).join('')}</div>`;
}

// 分页食谱
function paginatedRecipes() {
  const searchQ = ($('recipe-search').value || '').trim().toLowerCase();
  const lifeStageFilter = ($('recipe-lifeStage-filter').value || '').trim();
  const customFilter = ($('recipe-custom-filter').value || '').trim();
  
  const filtered = store.recipes.filter(recipe => {
    const matchSearch = !searchQ || 
      (recipe.name || '').toLowerCase().includes(searchQ);
    
    const matchLifeStage = !lifeStageFilter || recipe.lifeStage === lifeStageFilter;
    
    let matchCustom = true;
    if (customFilter === 'true') {
      matchCustom = recipe.recipeType === 'custom' || (recipe.recipeType == null && recipe.isCustom === true);
    } else if (customFilter === 'false') {
      matchCustom = recipe.recipeType === 'standard' || (recipe.recipeType == null && (recipe.isCustom === false || recipe.isCustom == null));
    }
    
    return matchSearch && matchLifeStage && matchCustom;
  });
  
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / store.recipePageSize));
  if (store.recipePage > totalPages) store.recipePage = totalPages;
  
  const start = (store.recipePage - 1) * store.recipePageSize;
  const pageItems = filtered.slice(start, start + store.recipePageSize);
  
  return { pageItems, total, totalPages };
}
// 渲染食谱列表
function renderRecipesList() {
  const list = $('recipes-list');
  if (!list) return;
  
  const { pageItems, total, totalPages } = paginatedRecipes();
  
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="muted" style="text-align:center; padding:20px">暂无食谱数据</div>';
    $('recipes-total').textContent = '共 0 条';
    $('recipes-pageinfo').textContent = '';
    $('recipes-prev').disabled = true;
    $('recipes-next').disabled = true;
    return;
  }
  
  const lifeStageMap = { puppy: '幼犬', adult: '成犬', senior: '老年犬', pregnancy: '妊娠期', lactation: '哺乳期' };
  const recipeTypeMap = { standard: '通用食谱', custom: '定制食谱' };
  
  list.innerHTML = pageItems.map(recipe => {
    const lifeStage = lifeStageMap[recipe.lifeStage] || recipe.lifeStage || '-';
    const recipeType = recipeTypeMap[recipe.recipeType] || (recipe.isCustom ? '定制食谱' : '通用食谱');
    const code = recipe.code || '-';
    const software = recipe.software || '-';
    return `
      <div class="list-item" data-id="${recipe.id}">
        <div class="list-item-row" style="grid-template-columns: 1fr 0.8fr 1fr 1.2fr 0.8fr 0.8fr;">
          <div>${code}</div>
          <div>${recipe.name || '-'}</div>
          <div>${lifeStage}</div>
          <div>${software}</div>
          <div>${recipe.nutritionStandard || '-'}</div>
          <div>${recipeType}</div>
        </div>
        <div class="item-actions">
          <button class="btn small" data-detail="${recipe.id}">详细信息</button>
          <button class="btn small" data-edit="${recipe.id}">编辑</button>
          <button class="btn small" data-del="${recipe.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  // 绑定详细信息按钮
  list.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.detail;
      const wrap = list.querySelector(`.list-item[data-id="${id}"]`);
      const existing = wrap.querySelector('.item-details');
      if (existing) {
        existing.remove();
        return;
      }
      const recipe = store.recipes.find(x => x.id === id);
      if (!recipe) return;
      wrap.insertAdjacentHTML('beforeend', formatRecipeDetails(recipe));
    });
  });
  
  // 绑定编辑按钮
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      openRecipeForm(btn.dataset.edit);
      const formCard = $('recipe-form-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  
  // 绑定删除按钮
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteRecipe(btn.dataset.del));
  });
  
  $('recipes-total').textContent = `共 ${total} 条`;
  $('recipes-pageinfo').textContent = `第 ${store.recipePage}/${totalPages} 页`;
  $('recipes-prev').disabled = store.recipePage <= 1;
  $('recipes-next').disabled = store.recipePage >= totalPages;
}

// 打开食谱表单
function openRecipeForm(id = null) {
  const card = $('recipe-form-card');
  const title = $('recipe-form-title');
  const form = $('recipe-form');
  
  if (!card || !form) return;
  
  if (id) {
    const recipe = store.recipes.find(x => x.id === id);
    if (!recipe) return;
    
    if (title) title.textContent = '编辑食谱';
    $('recipe-id').value = recipe.id;
    $('r-name').value = recipe.name || '';
    $('r-lifeStage').value = recipe.lifeStage || recipe.targetGroup || 'adult';
    $('r-nutritionStandard').value = recipe.nutritionStandard || 'FEDIAF';
    
    $('r-software').value = recipe.software || 'ADF';
    // 兼容旧数据
    if (recipe.recipeType) {
      $('r-recipeType').value = recipe.recipeType;
    } else {
      $('r-recipeType').value = recipe.isCustom === true ? 'custom' : 'standard';
    }
    
    // 设置编号（如果已有则显示，否则自动生成）
    if (recipe.code) {
      $('r-code').value = recipe.code;
    } else {
      autoGenerateRecipeCode();
    }
    
    // 设置制作损耗、售价
    $('r-cookingLoss').value = recipe.cookingLoss != null ? recipe.cookingLoss : 7;
    $('r-sellingPrice').value = recipe.sellingPrice != null ? recipe.sellingPrice : '';
    
    // 设置制作流程
    currentRecipeCookingSteps = Array.isArray(recipe.cookingSteps) ? [...recipe.cookingSteps] : [];
    renderRecipeCookingSteps();
    
    // 设置食材列表
    currentRecipeIngredients = (recipe.ingredients || []).map(item => ({
      ingredientId: item.ingredientId,
      weight: item.weight,
      unit: item.unit
    }));
    renderRecipeIngredientsList();
    
    // 设置营养数据
    $('r-protein').value = recipe.protein != null ? recipe.protein : '';
    $('r-fat').value = recipe.fat != null ? recipe.fat : '';
    $('r-carb').value = recipe.carb != null ? recipe.carb : '';
    $('r-fiber').value = recipe.fiber != null ? recipe.fiber : '';
    $('r-ash').value = recipe.ash != null ? recipe.ash : '';
    $('r-moisture').value = recipe.moisture != null ? recipe.moisture : '';
    $('r-caPratio').value = recipe.caPratio != null ? recipe.caPratio : '';
    $('r-totalKcal').value = recipe.totalKcal != null ? recipe.totalKcal : '';
    $('r-totalWeight').value = recipe.totalWeight != null ? recipe.totalWeight.toFixed(2) : '';
    $('r-kcalDensity').value = recipe.kcalDensity != null ? recipe.kcalDensity.toFixed(2) : '';
    
    // 计算总重量和热量密度
    calculateRecipeTotalWeight();
  } else {
    if (title) title.textContent = '新增食谱';
    form.reset();
    $('recipe-id').value = '';
    $('r-nutritionStandard').value = 'FEDIAF';
    $('r-software').value = 'ADF';
    $('r-recipeType').value = 'standard';
    $('r-cookingLoss').value = 7;
    $('r-sellingPrice').value = '';
    selectedIngredientId = null;
    editingIngredientIndex = null;
    const searchInput = $('r-ingredient-search');
    if (searchInput) searchInput.value = '';
    currentRecipeIngredients = [];
    currentRecipeCookingSteps = [];
    renderRecipeIngredientsList();
    renderRecipeCookingSteps();
    $('r-totalWeight').value = '';
    $('r-kcalDensity').value = '';
    
    // 自动生成编号
    autoGenerateRecipeCode();
  }
  
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 删除食谱
function deleteRecipe(id) {
  if (!confirm('确定要删除这个食谱吗？')) return;
  const idx = store.recipes.findIndex(x => x.id === id);
  if (idx >= 0) {
    store.recipes.splice(idx, 1);
    saveApp();
    renderRecipesList();
  }
}
// 设置食谱模块
function setupRecipesModule() {
  const newBtn = $('btn-new-recipe');
  if (newBtn) newBtn.addEventListener('click', () => openRecipeForm());
  
  const cancelBtn = $('btn-cancel-recipe');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const card = $('recipe-form-card');
      if (card) card.style.display = 'none';
      selectedIngredientId = null;
      editingIngredientIndex = null;
      const searchInput = $('r-ingredient-search');
      if (searchInput) searchInput.value = '';
      const weightInput = $('r-ingredient-weight');
      if (weightInput) weightInput.value = '';
      const resultsEl = $('r-ingredient-search-results');
      if (resultsEl) resultsEl.style.display = 'none';
    });
  }
  
  // 原料搜索功能
  const searchInput = $('r-ingredient-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchIngredients(e.target.value);
    });
    
    // 点击外部关闭搜索结果
    document.addEventListener('click', (e) => {
      const resultsEl = $('r-ingredient-search-results');
      if (resultsEl && !resultsEl.contains(e.target) && e.target !== searchInput) {
        resultsEl.style.display = 'none';
      }
    });
  }
  
  // 添加食材按钮
  const addIngredientBtn = $('btn-add-ingredient');
  if (addIngredientBtn) {
    addIngredientBtn.addEventListener('click', addIngredientToRecipe);
  }
  
  // 回车键添加食材
  const weightInput = $('r-ingredient-weight');
  if (weightInput) {
    weightInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addIngredientToRecipe();
      }
    });
  }
  
  // 总热量变化时重新计算热量密度
  const totalKcalEl = $('r-totalKcal');
  if (totalKcalEl) {
    totalKcalEl.addEventListener('input', calculateRecipeKcalDensity);
  }
  
  // 生命阶段、营养标准、食谱类型变化时自动生成编号
  const codeFields = ['r-lifeStage', 'r-nutritionStandard', 'r-recipeType'];
  codeFields.forEach(fieldId => {
    const fieldEl = $(fieldId);
    if (fieldEl) {
      fieldEl.addEventListener('change', () => {
        // 如果是新增食谱，自动生成编号
        if (!$('recipe-id').value) {
          autoGenerateRecipeCode();
        }
      });
    }
  });
  
  // 搜索和筛选
  const searchEl = $('recipe-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      store.recipePage = 1;
      renderRecipesList();
    });
  }
  
  const lifeStageFilterEl = $('recipe-lifeStage-filter');
  if (lifeStageFilterEl) {
    lifeStageFilterEl.addEventListener('change', () => {
      store.recipePage = 1;
      renderRecipesList();
    });
  }
  
  const customFilterEl = $('recipe-custom-filter');
  if (customFilterEl) {
    customFilterEl.addEventListener('change', () => {
      store.recipePage = 1;
      renderRecipesList();
    });
  }
  
  // 分页
  const prevBtn = $('recipes-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (store.recipePage > 1) {
        store.recipePage--;
        renderRecipesList();
      }
    });
  }
  
  const nextBtn = $('recipes-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const { totalPages } = paginatedRecipes();
      if (store.recipePage < totalPages) {
        store.recipePage++;
        renderRecipesList();
      }
    });
  }
  
  // 制作流程管理
  const addStepBtn = $('btn-add-cooking-step');
  if (addStepBtn) {
    addStepBtn.addEventListener('click', addCookingStep);
  }
  
  // 表单提交
  const form = $('recipe-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const id = $('recipe-id').value || genId();
      const name = $('r-name').value.trim();
      
      if (!name) {
        alert('请填写食谱名称');
        return;
      }
      
      // 验证钙磷比格式
      const caPratioInput = $('r-caPratio').value.trim();
      let caPratio = null;
      if (caPratioInput) {
        // 验证格式：数字:数字，如 1.2:1
        const ratioPattern = /^[0-9]+(\.[0-9]+)?:[0-9]+(\.[0-9]+)?$/;
        if (!ratioPattern.test(caPratioInput)) {
          alert('钙磷比格式不正确，请输入如 1.2:1 的格式');
          return;
        }
        caPratio = caPratioInput;
      }
      
      // 计算总重量
      calculateRecipeTotalWeight();
      const totalWeight = parseFloat($('r-totalWeight').value) || 0;
      
      // 计算热量密度
      calculateRecipeKcalDensity();
      const kcalDensity = parseFloat($('r-kcalDensity').value) || 0;
      
      // 自动生成编号
      autoGenerateRecipeCode();
      const code = $('r-code').value.trim();
      
      const record = {
        id,
        code: code,
        name: name,
        lifeStage: $('r-lifeStage').value || 'adult',
        nutritionStandard: $('r-nutritionStandard').value || 'FEDIAF',
        software: $('r-software').value || 'ADF',
        recipeType: $('r-recipeType').value || 'standard',
        ingredients: currentRecipeIngredients.map(item => ({
          ingredientId: item.ingredientId,
          weight: item.weight,
          unit: item.unit
        })),
        protein: $('r-protein').value ? parseFloat($('r-protein').value) : null,
        fat: $('r-fat').value ? parseFloat($('r-fat').value) : null,
        carb: $('r-carb').value ? parseFloat($('r-carb').value) : null,
        fiber: $('r-fiber').value ? parseFloat($('r-fiber').value) : null,
        ash: $('r-ash').value ? parseFloat($('r-ash').value) : null,
        moisture: $('r-moisture').value ? parseFloat($('r-moisture').value) : null,
        caPratio: caPratio,
        totalKcal: $('r-totalKcal').value ? parseFloat($('r-totalKcal').value) : null,
        totalWeight: totalWeight > 0 ? totalWeight : null,
        kcalDensity: kcalDensity > 0 ? kcalDensity : null,
        cookingLoss: parseInt($('r-cookingLoss').value) || 7,
        sellingPrice: $('r-sellingPrice').value ? parseFloat($('r-sellingPrice').value) : null,
        cookingSteps: currentRecipeCookingSteps.length > 0 ? [...currentRecipeCookingSteps] : [],
        updatedAt: Date.now()
      };
      
      const existsIdx = store.recipes.findIndex(x => x.id === id);
      if (existsIdx >= 0) {
        record.createdAt = store.recipes[existsIdx].createdAt;
        store.recipes.splice(existsIdx, 1, record);
      } else {
        record.createdAt = Date.now();
        store.recipes.unshift(record);
      }
      
      saveApp();
      const card = $('recipe-form-card');
      if (card) card.style.display = 'none';
      renderRecipesList();
    });
  }
  
  // 初始渲染
  renderRecipesList();
}

// 暴露给全局
window.openRecipeForm = openRecipeForm;
window.deleteRecipe = deleteRecipe;

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

// 渲染备份列表
function renderBackupsList() {
  const listEl = $('backups-list');
  if (!listEl) return;
  
  const backups = getBackups();
  
  if (backups.length === 0) {
    listEl.innerHTML = '<div class="muted" style="text-align:center; padding:20px;">暂无备份记录</div>';
    return;
  }
  
  listEl.innerHTML = backups.map(backup => {
    const timeAgo = getTimeAgo(backup.timestamp);
    return `
      <div style="padding:12px; border:0.5px solid var(--border); border-radius:8px; background:var(--surface-elevated);">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
          <div style="flex:1;">
            <div style="font-weight:500; color:var(--text-primary); margin-bottom:4px;">${backup.date}</div>
            <div style="font-size:12px; color:var(--text-secondary);">
              顾客: ${backup.customersCount} 条 | 原料: ${backup.ingredientsCount} 条 | 食谱: ${backup.recipesCount || 0} 条 | 订单: ${backup.ordersCount || 0} 条 | ${timeAgo}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn small" onclick="restoreBackup('${backup.id}')" style="font-size:12px;">恢复</button>
            <button class="btn small" onclick="deleteBackupAndRefresh('${backup.id}')" style="font-size:12px;">删除</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 获取相对时间
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

// 删除备份并刷新列表
function deleteBackupAndRefresh(backupId) {
  if (confirm('确定要删除这个备份吗？')) {
    if (deleteBackup(backupId)) {
      renderBackupsList();
    }
  }
}

// 暴露给全局
window.restoreBackup = restoreBackup;
window.deleteBackupAndRefresh = deleteBackupAndRefresh;

// ========== 订单管理模块 ==========

// 当前编辑订单的食谱列表（临时存储）
let currentOrderRecipes = [];

// 订单中食谱录入的临时数据（纯食谱定制类型使用）
let currentOrderRecipeIngredients = [];
let currentOrderRecipeCookingSteps = [];
let selectedOrderRecipeIngredientId = null;
let editingOrderRecipeIngredientIndex = null;

// 鲜食制作类型的临时数据
let currentFoodMakingRecipeId = null;
let currentFoodMakingDays = 1;
let currentFoodMakingPackaging = []; // 包装清单 [{name, quantity, unit, cost}]
let currentFoodMakingShippingType = 'remote';
let latestFoodMakingAutoPrice = 0;
let manualFoodMakingOrderPrice = null;

function getOrderTypeLabel(orderType) {
  const select = $('o-orderType');
  if (select) {
    const option = Array.from(select.options).find(opt => opt.value === orderType);
    if (option) {
      return option.textContent.trim();
    }
  }
  const fallback = {
    recipe_only: '食谱定制',
    food_making: '鲜食制作',
    both: '食谱定制+鲜食制作'
  };
  return fallback[orderType] || '';
}

// 生成订单编号
// 规则：订单类型拼音首字母集 + 日期(YYYYMMDD) + 4位序号
function generateOrderNumber(orderType, orderDate, excludeId = null) {
  let prefix = 'SPDZ';
  if (orderType === 'food_making') {
    prefix = 'XSZZ';
  } else if (orderType === 'both') {
    prefix = 'DZZZ';
  }
  const dateStr = (orderDate || '').replace(/\D/g, '');
  
  // 找到相同前缀和日期的所有订单，计算下一个序号
  const samePrefixDate = store.orders.filter(order => {
    if (excludeId && order.id === excludeId) return false;
    if (!order.orderNumber) return false;
    return order.orderNumber.startsWith(prefix + dateStr);
  });
  
  // 找到最大序号
  let maxNum = 0;
  samePrefixDate.forEach(order => {
    if (order.orderNumber) {
      const match = order.orderNumber.match(new RegExp(`^${prefix}${dateStr}(\\d{4})$`));
      if (match) {
        const num = parseInt(match[1], 10);
        maxNum = Math.max(maxNum, num);
      }
    }
  });
  
  const nextNum = maxNum + 1;
  return prefix + dateStr + String(nextNum).padStart(4, '0');
}

// 自动生成订单编号
function autoGenerateOrderNumber() {
  const orderType = $('o-orderType').value;
  let orderDate = $('o-orderDate').value;
  
  // 如果订单日期为空，自动设置为当前日期
  if (!orderDate) {
    orderDate = new Date().toISOString().split('T')[0];
    if ($('o-orderDate')) {
      $('o-orderDate').value = orderDate;
    }
  }
  
  // 如果订单类型为空，不生成编号
  if (!orderType || !orderDate) {
    const numberEl = $('o-orderNumber');
    if (numberEl) numberEl.value = '';
    const numberField = $('order-number-field');
    if (numberField) numberField.style.display = 'none';
    return;
  }
  
  const orderId = $('order-id').value || null;
  const number = generateOrderNumber(orderType, orderDate, orderId);
  const numberEl = $('o-orderNumber');
  if (numberEl) numberEl.value = number;
  const numberField = $('order-number-field');
  if (numberField) numberField.style.display = 'block';
}

// 根据订单类型显示/隐藏不同的内容区域
function toggleOrderTypeContent() {
  const orderType = $('o-orderType').value;
  const form = $('order-form');
  
  // 隐藏所有类型的内容
  const recipeOnlyContent = $('order-recipe-only-content');
  const foodMakingContent = $('order-food-making-content');
  const bothContent = $('order-both-content');
  const amountSection = $('order-amount-section');
  
  // 先移除所有隐藏区域的required属性，避免验证错误
  if (recipeOnlyContent) {
    const recipeOnlyFields = recipeOnlyContent.querySelectorAll('[required]');
    recipeOnlyFields.forEach(field => {
      field.removeAttribute('required');
    });
  }
  
  if (recipeOnlyContent) recipeOnlyContent.style.display = 'none';
  if (foodMakingContent) foodMakingContent.style.display = 'none';
  if (bothContent) bothContent.style.display = 'none';
  if (amountSection) amountSection.style.display = 'none';
  
  // 根据订单类型显示对应的内容
  if (orderType === 'recipe_only') {
    if (recipeOnlyContent) {
      recipeOnlyContent.style.display = 'block';
      // 恢复必填字段的required属性
      const recipeNameField = $('or-name');
      const cookingLossField = $('or-cookingLoss');
      if (recipeNameField) recipeNameField.setAttribute('required', 'required');
      if (cookingLossField) cookingLossField.setAttribute('required', 'required');
    }
    if (amountSection) amountSection.style.display = 'block';
    
    // 如果是新增订单，自动生成食谱编号
    if (!$('order-id').value) {
      autoGenerateOrderRecipeCode();
    }
  } else if (orderType === 'food_making') {
    if (foodMakingContent) foodMakingContent.style.display = 'block';
  } else if (orderType === 'both') {
    if (bothContent) bothContent.style.display = 'block';
  }
  
  // 如果订单类型已选择，自动生成订单编号（订单创建日期会自动设置）
  if (orderType) {
    // 确保订单创建日期有值
    if (!$('o-orderDate').value) {
      const today = new Date().toISOString().split('T')[0];
      $('o-orderDate').value = today;
    }
    autoGenerateOrderNumber();
  }
}
// 显示顾客信息表格
function renderOrderCustomerInfo(customerId) {
  const infoEl = $('order-customer-info');
  const tableEl = $('order-customer-info-table');
  
  if (!infoEl || !tableEl) return;
  
  if (!customerId) {
    infoEl.style.display = 'none';
    return;
  }
  
  const customer = store.customers.find(c => c.id === customerId);
  if (!customer) {
    infoEl.style.display = 'none';
    return;
  }
  
  const years = calcAgeYears(customer.birthday);
  const showAge = customer.lifeStage === 'adult' || customer.lifeStage === 'pregnancy' || customer.lifeStage === 'lactation';
  const showPuppy = customer.lifeStage === 'puppy';
  const showLact = customer.lifeStage === 'lactation';
  
  let html = `
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500; width:120px;">宠物昵称</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.petName || '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500; width:120px;">品种</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.breed || '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">微信号</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.wechat || '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">收货信息</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.address || '-'}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">生日</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.birthday || '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">体重</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.weightKg != null ? customer.weightKg + ' kg' : '-'}</td>
      </tr>
      ${showAge && years != null ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">年龄</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${years.toFixed(1)} 岁</td>
        <td colspan="2"></td>
      </tr>
      ` : ''}
      ${showPuppy ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">月龄</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.monthAge != null ? customer.monthAge : '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">月龄系数</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.monthFactor != null ? customer.monthFactor : '-'}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">性别</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.sex, sexMap)}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">是否绝育</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.neutered, neuterMap)}</td>
      </tr>
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">生命阶段</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.lifeStage, lifeMap)}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">活动水平</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.activity, actMap)}</td>
      </tr>
      ${showLact ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">哺乳阶段</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${zh(customer.lactStage, lactMap)}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">产仔数</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.litterCount != null ? customer.litterCount : '-'}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">热量系数</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.kcalFactor != null ? customer.kcalFactor : '-'}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">每日能量估算</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.estKcal != null ? customer.estKcal + ' kcal/日' : '-'}</td>
      </tr>
      ${customer.bcs != null ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">体况评分</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.bcs}</td>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">每日吃几顿饭</td>
        <td style="padding:6px; border:0.5px solid var(--border);">${customer.mealsPerDay != null ? customer.mealsPerDay : '-'}</td>
      </tr>
      ` : ''}
      ${customer.allergies ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">过敏/不耐受</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.allergies}</td>
      </tr>
      ` : ''}
      ${customer.avoid ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">挑食/尽量不吃</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.avoid}</td>
      </tr>
      ` : ''}
      ${customer.fav ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">非常喜欢</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.fav}</td>
      </tr>
      ` : ''}
      ${customer.med ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">症状史/疾病史</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.med}</td>
      </tr>
      ` : ''}
      ${customer.notes ? `
      <tr>
        <td style="padding:6px; border:0.5px solid var(--border); background:var(--bg-tertiary); font-weight:500;">备注</td>
        <td colspan="3" style="padding:6px; border:0.5px solid var(--border);">${customer.notes}</td>
      </tr>
      ` : ''}
    </table>
  `;
  
  tableEl.innerHTML = html;
  infoEl.style.display = 'block';
}

// 搜索原料（用于订单中的食谱录入）
function searchIngredientsForOrderRecipe(query) {
  const resultsEl = $('or-ingredient-search-results');
  if (!resultsEl) return;
  
  const q = (query || '').trim().toLowerCase();
  
  if (!q) {
    resultsEl.style.display = 'none';
    selectedOrderRecipeIngredientId = null;
    return;
  }
  
  // 搜索原料（按名称、类别、品牌）
  const matches = store.ingredients.filter(ing => {
    if (!ing.category || !ing.name) return false;
    const name = (ing.name || '').toLowerCase();
    const category = (ing.category || '').toLowerCase();
    const brand = (ing.brand || '').toLowerCase();
    return name.includes(q) || category.includes(q) || brand.includes(q);
  }).slice(0, 10); // 最多显示10个结果
  
  if (matches.length === 0) {
    resultsEl.innerHTML = '<div style="padding:12px; text-align:center; color:var(--text-secondary);">未找到匹配的原料</div>';
    resultsEl.style.display = 'block';
    return;
  }
  
  resultsEl.innerHTML = matches.map(ing => {
    const unit = ing.unit || 'g';
    return `
      <div class="ingredient-search-item" data-id="${ing.id}" style="padding:8px 12px; cursor:pointer; border-bottom:0.5px solid var(--border); transition:background 0.2s;"
           onmouseover="this.style.background='var(--bg-secondary)'"
           onmouseout="this.style.background=''">
        <div style="font-weight:500;">${ing.name || ''}${ing.description ? '-' + ing.description : ''}${ing.brand ? '（' + ing.brand + '）' : ''}</div>
        <div style="font-size:12px; color:var(--text-secondary);">单位: ${unit}</div>
      </div>
    `;
  }).join('');
  
  // 绑定点击事件
  resultsEl.querySelectorAll('.ingredient-search-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const ing = store.ingredients.find(i => i.id === id);
      if (ing) {
        selectedOrderRecipeIngredientId = id;
        const searchInput = $('or-ingredient-search');
        if (searchInput) {
          const name = ing.name || '';
          const description = ing.description || '';
          const brand = ing.brand || '';
          let displayText = name;
          if (description) {
            displayText += '-' + description;
          }
          if (brand) {
            displayText += '（' + brand + '）';
          }
          searchInput.value = displayText;
        }
        resultsEl.style.display = 'none';
      }
    });
  });
  
  resultsEl.style.display = 'block';
}

// 渲染订单中食谱的食材列表
function renderOrderRecipeIngredientsList() {
  const listEl = $('order-recipe-ingredients-list');
  if (!listEl) return;
  
  if (currentOrderRecipeIngredients.length === 0) {
    listEl.innerHTML = '<div class="muted" style="text-align:center; padding:12px;">暂无食材，请添加</div>';
    return;
  }
  
  listEl.innerHTML = currentOrderRecipeIngredients.map((item, idx) => {
    const ing = store.ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return '';
    
    const unit = item.unit || ing.unit || 'g';
    const name = ing.name || '';
    const description = ing.description || '';
    const brand = ing.brand || '';
    let displayText = name;
    if (description) {
      displayText += '-' + description;
    }
    if (brand) {
      displayText += '（' + brand + '）';
    }
    
    const isEditing = editingOrderRecipeIngredientIndex === idx;
    
    return `
      <div class="recipe-ingredient-item" data-index="${idx}" draggable="${!isEditing}" style="display:flex; flex-direction:column; padding:8px; border:0.5px solid var(--border); border-radius:6px; background:var(--bg-secondary); ${isEditing ? 'border:2px solid var(--primary);' : 'cursor:move;'} transition:all 0.2s;"
           onmouseover="${!isEditing ? 'this.style.opacity=\'0.9\'' : ''}" onmouseout="${!isEditing ? 'this.style.opacity=\'1\'' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px; flex:1;">
            <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:4px; font-weight:600; font-size:14px; color:var(--text-primary); flex-shrink:0;">${idx + 1}</div>
            <div style="flex:1;">
              <div style="font-weight:500;">${displayText}</div>
              ${!isEditing ? `<div style="font-size:12px; color:var(--text-secondary);">${item.weight} ${unit}</div>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn small" data-edit-order-ingredient="${idx}" style="font-size:12px;">${isEditing ? '保存' : '编辑'}</button>
            <button type="button" class="btn small" data-remove-order-ingredient="${idx}" style="font-size:12px;">删除</button>
          </div>
        </div>
        ${isEditing ? `
          <div style="margin-top:8px; padding-top:8px; border-top:0.5px solid var(--border);">
            <div style="display:flex; gap:8px; align-items:center;">
              <label style="flex:1; margin:0; font-size:13px;">
                <span style="display:block; margin-bottom:4px; color:var(--text-secondary);">重量</span>
                <input type="number" min="0" step="0.1" value="${item.weight}" data-edit-order-weight="${idx}" style="width:100%; padding:6px 10px; font-size:14px;" />
              </label>
              <span style="font-size:13px; color:var(--text-secondary);">${unit}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  // 绑定拖拽事件（与食谱模块相同）
  let draggedIndex = null;
  
  listEl.querySelectorAll('.recipe-ingredient-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedIndex = parseInt(item.dataset.index, 10);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedIndex);
      item.style.opacity = '0.5';
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', (e) => {
      item.style.opacity = '1';
      item.classList.remove('dragging');
      listEl.querySelectorAll('.recipe-ingredient-item').forEach(el => {
        el.classList.remove('drag-over');
      });
      draggedIndex = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const afterElement = getDragAfterElement(listEl, e.clientY);
      const dragging = listEl.querySelector('.dragging');
      
      if (dragging && afterElement == null) {
        listEl.appendChild(dragging);
      } else if (dragging && afterElement) {
        listEl.insertBefore(dragging, afterElement);
      }
    });
    
    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (item.classList.contains('dragging')) return;
      item.classList.add('drag-over');
    });
    
    item.addEventListener('dragleave', (e) => {
      item.classList.remove('drag-over');
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      
      if (draggedIndex === null) return;
      
      const draggingEl = listEl.querySelector('.dragging');
      if (!draggingEl) return;
      
      const allItems = Array.from(listEl.children).filter(el => el.classList.contains('recipe-ingredient-item'));
      const toIndex = allItems.indexOf(draggingEl);
      
      if (draggedIndex !== toIndex && !isNaN(toIndex) && toIndex >= 0 && toIndex < currentOrderRecipeIngredients.length) {
        const [movedItem] = currentOrderRecipeIngredients.splice(draggedIndex, 1);
        currentOrderRecipeIngredients.splice(toIndex, 0, movedItem);
        
        if (editingOrderRecipeIngredientIndex !== null) {
          if (editingOrderRecipeIngredientIndex === draggedIndex) {
            editingOrderRecipeIngredientIndex = toIndex;
          } else if (editingOrderRecipeIngredientIndex > draggedIndex && editingOrderRecipeIngredientIndex <= toIndex) {
            editingOrderRecipeIngredientIndex--;
          } else if (editingOrderRecipeIngredientIndex < draggedIndex && editingOrderRecipeIngredientIndex >= toIndex) {
            editingOrderRecipeIngredientIndex++;
          }
        }
        
        renderOrderRecipeIngredientsList();
        calculateOrderRecipeTotalWeight();
      }
    });
  });
  
  // 绑定编辑按钮
  listEl.querySelectorAll('[data-edit-order-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.editOrderIngredient, 10);
      const item = currentOrderRecipeIngredients[idx];
      if (!item) return;
      
      if (editingOrderRecipeIngredientIndex === idx) {
        // 保存编辑
        const weightInputEl = listEl.querySelector(`[data-edit-order-weight="${idx}"]`);
        const newWeight = parseFloat(weightInputEl ? weightInputEl.value : 0);
        
        if (newWeight <= 0) {
          alert('请输入重量（大于0）');
          return;
        }
        
        item.weight = newWeight;
        editingOrderRecipeIngredientIndex = null;
        selectedOrderRecipeIngredientId = null;
        const searchInput = $('or-ingredient-search');
        if (searchInput) searchInput.value = '';
        const weightInput = $('or-ingredient-weight');
        if (weightInput) weightInput.value = '';
        
        renderOrderRecipeIngredientsList();
        calculateOrderRecipeTotalWeight();
      } else {
        // 开始编辑
        if (editingOrderRecipeIngredientIndex !== null && editingOrderRecipeIngredientIndex !== idx) {
          const prevItem = currentOrderRecipeIngredients[editingOrderRecipeIngredientIndex];
          if (prevItem) {
            const prevWeightInputEl = listEl.querySelector(`[data-edit-order-weight="${editingOrderRecipeIngredientIndex}"]`);
            if (prevWeightInputEl) {
              prevItem.weight = parseFloat(prevWeightInputEl.value) || prevItem.weight;
            }
          }
        }
        
        editingOrderRecipeIngredientIndex = idx;
        selectedOrderRecipeIngredientId = item.ingredientId;
        
        renderOrderRecipeIngredientsList();
        
        const itemEl = listEl.querySelector(`[data-index="${idx}"]`);
        if (itemEl) {
          itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => {
            const weightInputEl = itemEl.querySelector(`[data-edit-order-weight="${idx}"]`);
            if (weightInputEl) {
              weightInputEl.focus();
              weightInputEl.select();
            }
          }, 100);
        }
      }
    });
  });
  
  // 绑定删除按钮
  listEl.querySelectorAll('[data-remove-order-ingredient]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeOrderIngredient, 10);
      
      if (editingOrderRecipeIngredientIndex === idx) {
        editingOrderRecipeIngredientIndex = null;
        selectedOrderRecipeIngredientId = null;
        const searchInput = $('or-ingredient-search');
        const weightInput = $('or-ingredient-weight');
        if (searchInput) searchInput.value = '';
        if (weightInput) weightInput.value = '';
      } else if (editingOrderRecipeIngredientIndex !== null && editingOrderRecipeIngredientIndex > idx) {
        editingOrderRecipeIngredientIndex--;
      }
      
      currentOrderRecipeIngredients.splice(idx, 1);
      renderOrderRecipeIngredientsList();
      calculateOrderRecipeTotalWeight();
    });
  });
  
  // 绑定卡片内重量输入框的回车事件
  listEl.querySelectorAll('[data-edit-order-weight]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const idx = parseInt(input.dataset.editOrderWeight, 10);
        const saveBtn = listEl.querySelector(`[data-edit-order-ingredient="${idx}"]`);
        if (saveBtn) {
          saveBtn.click();
        }
      }
    });
  });
}
// 添加食材到订单中的食谱
function addIngredientToOrderRecipe() {
  const weightInput = $('or-ingredient-weight');
  
  if (!weightInput) return;
  
  const ingredientId = selectedOrderRecipeIngredientId;
  const weight = parseFloat(weightInput.value) || 0;
  
  if (!ingredientId) {
    alert('请先搜索并选择原料');
    return;
  }
  
  if (weight <= 0) {
    alert('请输入重量（大于0）');
    return;
  }
  
  const ing = store.ingredients.find(i => i.id === ingredientId);
  if (!ing) {
    alert('原料不存在');
    return;
  }
  
  // 如果正在编辑某个项，更新该项
  if (editingOrderRecipeIngredientIndex !== null) {
    const item = currentOrderRecipeIngredients[editingOrderRecipeIngredientIndex];
    if (item) {
      item.ingredientId = ingredientId;
      item.weight = weight;
      item.unit = ing.unit || 'g';
      editingOrderRecipeIngredientIndex = null;
      renderOrderRecipeIngredientsList();
      calculateOrderRecipeTotalWeight();
      
      selectedOrderRecipeIngredientId = null;
      const searchInput = $('or-ingredient-search');
      if (searchInput) searchInput.value = '';
      if (weightInput) weightInput.value = '';
      const resultsEl = $('or-ingredient-search-results');
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }
  }
  
  // 检查是否已添加
  const exists = currentOrderRecipeIngredients.find(item => item.ingredientId === ingredientId);
  if (exists) {
    if (confirm('该原料已添加，是否更新重量？')) {
      exists.weight = weight;
      exists.unit = ing.unit || 'g';
    } else {
      return;
    }
  } else {
    currentOrderRecipeIngredients.push({
      ingredientId: ingredientId,
      weight: weight,
      unit: ing.unit || 'g'
    });
  }
  
  renderOrderRecipeIngredientsList();
  calculateOrderRecipeTotalWeight();
  
  // 清空输入
  selectedOrderRecipeIngredientId = null;
  const searchInput = $('or-ingredient-search');
  if (searchInput) searchInput.value = '';
  if (weightInput) weightInput.value = '';
  const resultsEl = $('or-ingredient-search-results');
  if (resultsEl) resultsEl.style.display = 'none';
}

// 计算订单中食谱的总重量
function calculateOrderRecipeTotalWeight() {
  let totalWeight = 0;
  
  currentOrderRecipeIngredients.forEach(item => {
    const ing = store.ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return;
    
    const unit = item.unit || ing.unit || 'g';
    let weightInG = item.weight;
    
    // 转换为g
    if (unit === 'kg') {
      weightInG = item.weight * 1000;
    } else if (unit === 'g' || unit === 'ml') {
      weightInG = item.weight;
    } else if (unit === 'L') {
      weightInG = item.weight * 1000;
    } else {
      if (ing.weightPerUnit) {
        weightInG = item.weight * ing.weightPerUnit;
      } else {
        console.warn('原料缺少每单位重量，无法计算:', ing.name);
        return;
      }
    }
    
    totalWeight += weightInG;
  });
  
  const totalWeightEl = $('or-totalWeight');
  if (totalWeightEl) {
    totalWeightEl.value = totalWeight.toFixed(2);
  }
  
  calculateOrderRecipeKcalDensity();
}

// 计算订单中食谱的热量密度
function calculateOrderRecipeKcalDensity() {
  const totalKcalEl = $('or-totalKcal');
  const totalWeightEl = $('or-totalWeight');
  const kcalDensityEl = $('or-kcalDensity');
  
  if (!totalKcalEl || !totalWeightEl || !kcalDensityEl) return;
  
  const totalKcal = parseFloat(totalKcalEl.value) || 0;
  const totalWeight = parseFloat(totalWeightEl.value) || 0;
  
  if (totalWeight > 0) {
    const density = (totalKcal / totalWeight) * 1000;
    kcalDensityEl.value = density.toFixed(2);
  } else {
    kcalDensityEl.value = '';
  }
}

// 渲染订单中食谱的制作流程列表
function renderOrderRecipeCookingSteps() {
  const stepsEl = $('order-recipe-cooking-steps');
  if (!stepsEl) return;
  
  if (currentOrderRecipeCookingSteps.length === 0) {
    stepsEl.innerHTML = '<div class="muted" style="text-align:center; padding:12px; font-size:13px;">暂无制作流程，点击"添加步骤"添加</div>';
    return;
  }
  
  stepsEl.innerHTML = currentOrderRecipeCookingSteps.map((step, idx) => `
    <div style="display:flex; gap:8px; align-items:start; padding:8px; border:0.5px solid var(--border); border-radius:6px; background:var(--bg-secondary); margin-bottom:6px;">
      <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; background:var(--bg-tertiary); border-radius:4px; font-weight:600; font-size:13px; color:var(--text-primary); flex-shrink:0; margin-top:2px;">${idx + 1}</div>
      <textarea data-order-step-index="${idx}" style="flex:1; min-height:60px; padding:8px; font-size:13px; border:0.5px solid var(--border); border-radius:4px; resize:vertical;" placeholder="请输入制作步骤...">${step || ''}</textarea>
      <button type="button" class="btn small" data-remove-order-step="${idx}" style="font-size:12px; flex-shrink:0; margin-top:2px;">删除</button>
    </div>
  `).join('');
  
  // 绑定删除按钮
  stepsEl.querySelectorAll('[data-remove-order-step]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.removeOrderStep, 10);
      currentOrderRecipeCookingSteps.splice(idx, 1);
      renderOrderRecipeCookingSteps();
    });
  });
  
  // 绑定textarea输入事件（自动保存）
  stepsEl.querySelectorAll('[data-order-step-index]').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      const idx = parseInt(textarea.dataset.orderStepIndex, 10);
      if (idx >= 0 && idx < currentOrderRecipeCookingSteps.length) {
        currentOrderRecipeCookingSteps[idx] = textarea.value;
      }
    });
  });
}

// 添加制作步骤到订单中的食谱
function addCookingStepToOrderRecipe() {
  currentOrderRecipeCookingSteps.push('');
  renderOrderRecipeCookingSteps();
  
  setTimeout(() => {
    const stepsEl = $('order-recipe-cooking-steps');
    if (stepsEl) {
      const lastTextarea = stepsEl.querySelector(`[data-order-step-index="${currentOrderRecipeCookingSteps.length - 1}"]`);
      if (lastTextarea) {
        lastTextarea.focus();
        lastTextarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, 100);
}

// 自动生成订单中食谱的编号
function autoGenerateOrderRecipeCode() {
  const lifeStage = $('or-lifeStage').value || 'adult';
  const nutritionStandard = $('or-nutritionStandard').value || 'FEDIAF';
  const recipeType = $('or-recipeType').value || 'standard';
  
  const code = generateRecipeCode(lifeStage, nutritionStandard, recipeType, null);
  const codeEl = $('or-code');
  if (codeEl) {
    codeEl.value = code;
  }
}

// ========== 鲜食制作类型的功能 ==========

// 填充鲜食制作的食谱下拉框
function populateFoodMakingRecipeSelect() {
  const recipeSelect = $('ofm-recipe-select');
  if (!recipeSelect) return;
  
  recipeSelect.innerHTML = '<option value="">请选择食谱</option>';
  store.recipes.forEach(recipe => {
    const option = document.createElement('option');
    option.value = recipe.id;
    option.textContent = `${recipe.name || '-'} (${recipe.code || '-'})`;
    recipeSelect.appendChild(option);
  });
}
// 自动生成包装清单
// 根据订单信息（每份重量、总重量、总份数）自动选择包装规格和计算用量
function generatePackagingList(servingWeight, totalWeight, totalServings) {
  // 从原料数据库中筛选"包装"类别的条目
  const packagingIngredients = store.ingredients.filter(ing => ing.category === '包装');
  
  if (packagingIngredients.length === 0) {
    console.warn('原料数据库中未找到"包装"类别的条目');
    return [];
  }
  
  // 按项目字段分类
  const packagingByProject = {
    '食品袋': packagingIngredients.filter(ing => ing.name === '食品袋'),
    '泡沫箱': packagingIngredients.filter(ing => ing.name === '泡沫箱'),
    '铝箔保温袋': packagingIngredients.filter(ing => ing.name === '铝箔保温袋'),
    '冰袋': packagingIngredients.filter(ing => ing.name === '冰袋'),
    '标签纸': packagingIngredients.filter(ing => ing.name === '标签纸')
  };
  
  const packagingList = [];
  
  // 1. 食品袋：根据每份重量选择规格，用量=订单的总份数
  if (packagingByProject['食品袋'].length > 0) {
    let selectedFoodBag = null;
    if (servingWeight < 70) {
      // 选择10*15cm
      selectedFoodBag = packagingByProject['食品袋'].find(ing => ing.description && ing.description.includes('10*15cm'));
    } else if (servingWeight >= 70 && servingWeight < 120) {
      // 选择12*17cm
      selectedFoodBag = packagingByProject['食品袋'].find(ing => ing.description && ing.description.includes('12*17cm'));
    } else if (servingWeight >= 120 && servingWeight < 200) {
      // 选择15*20cm
      selectedFoodBag = packagingByProject['食品袋'].find(ing => ing.description && ing.description.includes('15*20cm'));
    } else if (servingWeight >= 200) {
      // 选择20*25cm
      selectedFoodBag = packagingByProject['食品袋'].find(ing => ing.description && ing.description.includes('20*25cm'));
    }
    
    if (selectedFoodBag) {
      const quantity = totalServings;
      const pricePer500 = selectedFoodBag.ediblePricePer500 || selectedFoodBag.pricePer500 || 0;
      const unit = selectedFoodBag.unit || '个';
      // 计算费用：用量 * 每500单位单价 / 500
      const cost = pricePer500 > 0 ? ((quantity * pricePer500) / 500).toFixed(2) : '0.00';
      
      const name = `食品袋${selectedFoodBag.description ? '-' + selectedFoodBag.description : ''}${selectedFoodBag.brand ? '（' + selectedFoodBag.brand + '）' : ''}`;
      
      // 计算单价：每500单位的单价/500
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      // 计算总重量：用量*每单位重量
      const weightPerUnit = selectedFoodBag.weightPerUnit || 0;
      const totalWeight = quantity * weightPerUnit;
      
      packagingList.push({
        ingredientId: selectedFoodBag.id,
        name: name,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  // 2. 泡沫箱：根据总重量选择规格，用量根据规格计算
  let selectedFoamBox = null;
  let foamBoxQuantity = 1;
  
  if (packagingByProject['泡沫箱'].length > 0) {
    if (totalWeight < 2500) {
      // 选择4号箱，用量默认为1
      selectedFoamBox = packagingByProject['泡沫箱'].find(ing => ing.description && ing.description.includes('4号箱'));
      foamBoxQuantity = 1;
    } else {
      // 选择3号箱，用量=订单的总重量（净重）/5000克，向上取整
      selectedFoamBox = packagingByProject['泡沫箱'].find(ing => ing.description && ing.description.includes('3号箱'));
      foamBoxQuantity = Math.ceil(totalWeight / 5000);
    }
    
    if (selectedFoamBox) {
      const pricePer500 = selectedFoamBox.ediblePricePer500 || selectedFoamBox.pricePer500 || 0;
      const unit = selectedFoamBox.unit || '个';
      // 计算费用：用量 * 每500单位单价 / 500
      const cost = pricePer500 > 0 ? ((foamBoxQuantity * pricePer500) / 500).toFixed(2) : '0.00';
      
      const name = `泡沫箱${selectedFoamBox.description ? '-' + selectedFoamBox.description : ''}${selectedFoamBox.brand ? '（' + selectedFoamBox.brand + '）' : ''}`;
      
      // 计算单价：每500单位的单价/500
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      // 计算总重量：用量*每单位重量
      const weightPerUnit = selectedFoamBox.weightPerUnit || 0;
      const totalWeight = foamBoxQuantity * weightPerUnit;
      
      packagingList.push({
        ingredientId: selectedFoamBox.id,
        name: name,
        quantity: foamBoxQuantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  // 3. 铝箔保温袋：根据泡沫箱规格选择，用量=泡沫箱用量
  if (packagingByProject['铝箔保温袋'].length > 0 && selectedFoamBox) {
    let selectedInsulationBag = null;
    if (selectedFoamBox.description && selectedFoamBox.description.includes('3号箱')) {
      // 选择适配3号箱
      selectedInsulationBag = packagingByProject['铝箔保温袋'].find(ing => ing.description && ing.description.includes('3号箱'));
    } else if (selectedFoamBox.description && selectedFoamBox.description.includes('4号箱')) {
      // 选择适配4号箱
      selectedInsulationBag = packagingByProject['铝箔保温袋'].find(ing => ing.description && ing.description.includes('4号箱'));
    }
    
    if (selectedInsulationBag) {
      const quantity = foamBoxQuantity; // 用量等于泡沫箱用量
      const pricePer500 = selectedInsulationBag.ediblePricePer500 || selectedInsulationBag.pricePer500 || 0;
      const unit = selectedInsulationBag.unit || '个';
      // 计算费用：用量 * 每500单位单价 / 500
      const cost = pricePer500 > 0 ? ((quantity * pricePer500) / 500).toFixed(2) : '0.00';
      
      const name = `铝箔保温袋${selectedInsulationBag.description ? '-' + selectedInsulationBag.description : ''}${selectedInsulationBag.brand ? '（' + selectedInsulationBag.brand + '）' : ''}`;
      
      // 计算单价：每500单位的单价/500
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      // 计算总重量：用量*每单位重量
      const weightPerUnit = selectedInsulationBag.weightPerUnit || 0;
      const totalWeight = quantity * weightPerUnit;
      
      packagingList.push({
        ingredientId: selectedInsulationBag.id,
        name: name,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  // 4. 冰袋：默认选择200ml，用量根据泡沫箱规格
  if (packagingByProject['冰袋'].length > 0 && selectedFoamBox) {
    const selectedIceBag = packagingByProject['冰袋'].find(ing => ing.description && ing.description.includes('200ml'));
    if (selectedIceBag) {
      const perBoxQuantity = (selectedFoamBox.description && selectedFoamBox.description.includes('3号箱')) ? 5 : 3;
      const quantity = perBoxQuantity * foamBoxQuantity;
      const pricePer500 = selectedIceBag.ediblePricePer500 || selectedIceBag.pricePer500 || 0;
      const unit = selectedIceBag.unit || '个';
      const cost = pricePer500 > 0 ? ((quantity * pricePer500) / 500).toFixed(2) : '0.00';
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      const weightPerUnit = selectedIceBag.weightPerUnit || 0;
      const totalWeight = quantity * weightPerUnit;
      const name = `冰袋${selectedIceBag.description ? '-' + selectedIceBag.description : ''}${selectedIceBag.brand ? '（' + selectedIceBag.brand + '）' : ''}`;
      packagingList.push({
        ingredientId: selectedIceBag.id,
        name: name,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  // 5. 标签纸：默认选择70*100mm，用量=订单的总份数
  if (packagingByProject['标签纸'].length > 0) {
    // 默认选择70*100mm
    const selectedLabel = packagingByProject['标签纸'].find(ing => ing.description && ing.description.includes('70*100mm'));
    
    if (selectedLabel) {
      const quantity = totalServings; // 用量=订单的总份数
      const pricePer500 = selectedLabel.ediblePricePer500 || selectedLabel.pricePer500 || 0;
      const unit = selectedLabel.unit || '张';
      // 计算费用：用量 * 每500单位单价 / 500
      const cost = pricePer500 > 0 ? ((quantity * pricePer500) / 500).toFixed(2) : '0.00';
      
      const name = `标签纸${selectedLabel.description ? '-' + selectedLabel.description : ''}${selectedLabel.brand ? '（' + selectedLabel.brand + '）' : ''}`;
      
      // 计算单价：每500单位的单价/500
      const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
      // 计算总重量：用量*每单位重量
      const weightPerUnit = selectedLabel.weightPerUnit || 0;
      const totalWeight = quantity * weightPerUnit;
      
      packagingList.push({
        ingredientId: selectedLabel.id,
        name: name,
        quantity: quantity,
        unit: unit,
        unitPrice: unitPrice,
        totalWeight: totalWeight,
        cost: parseFloat(cost)
      });
    }
  }
  
  return packagingList;
}
// 计算并展示鲜食制作的食材总用量
function calculateFoodMakingIngredients() {
  const customerId = $('o-customerId') ? $('o-customerId').value : '';
  const recipeId = $('ofm-recipe-select') ? $('ofm-recipe-select').value : '';
  const days = parseInt(($('ofm-days') ? $('ofm-days').value : '') || '1') || 1;
  
  console.log('calculateFoodMakingIngredients called:', { customerId, recipeId, days });
  
  if (!customerId || !recipeId) {
    console.log('Missing customerId or recipeId, hiding sections');
    if ($('ofm-recipe-info')) $('ofm-recipe-info').style.display = 'none';
    if ($('ofm-ingredients-summary')) $('ofm-ingredients-summary').style.display = 'none';
    return;
  }
  
  const customer = store.customers.find(c => c.id === customerId);
  const recipe = store.recipes.find(r => r.id === recipeId);
  
  if (!customer || !recipe) {
    console.log('Customer or recipe not found, hiding sections');
    if ($('ofm-recipe-info')) $('ofm-recipe-info').style.display = 'none';
    if ($('ofm-ingredients-summary')) $('ofm-ingredients-summary').style.display = 'none';
    return;
  }
  
  console.log('Customer and recipe found, proceeding with calculation');
  
  // 计算每份的重量比例
  const estKcal = customer.estKcal || 0;
  const recipeTotalKcal = recipe.totalKcal || 0;
  
  // 计算比例，如果能量数据缺失则设为0
  const ratio = (estKcal > 0 && recipeTotalKcal > 0) ? (estKcal / recipeTotalKcal) : 0;
  
  if (estKcal <= 0 || recipeTotalKcal <= 0) {
    // 即使能量数据缺失，也显示表格结构（但可能数据为空）
    console.warn('顾客每日能量估算或食谱总热量缺失，但继续显示表格');
  }
  
  // 计算总份数和每份重量
  const mealsPerDay = customer.mealsPerDay || 1;
  const totalServings = mealsPerDay * days;
  
  // 计算每份重量：每份重量 = 食谱总重量 × (顾客每日能量估算 / 食谱总热量) / 每天吃几顿
  // 如果 ratio 为 0，则 servingWeight 也为 0
  const servingWeight = ratio > 0 ? ((recipe.totalWeight || 0) * ratio / mealsPerDay) : 0;
  
  // 计算总重量和总热量
  const totalWeight = servingWeight * totalServings;
  const totalKcal = (recipe.totalKcal && ratio > 0) ? (recipe.totalKcal * ratio * days) : 0;
  
  // 自动生成包装清单（如果当前包装清单为空、是新增订单，或者食谱信息发生变化，则自动生成）
  const orderId = $('order-id') ? $('order-id').value : null;
  const currentRecipeId = recipeId;
  const currentDays = days;
  const currentCustomerId = customerId;
  
  // 检查食谱信息是否发生变化（通过比较当前值和保存的值）
  const recipeInfoChanged = !orderId || 
    currentFoodMakingRecipeId !== currentRecipeId || 
    currentFoodMakingDays !== currentDays ||
    (orderId && currentFoodMakingPackaging.length === 0);
  
  if (recipeInfoChanged || currentFoodMakingPackaging.length === 0) {
    // 新增订单、包装清单为空或食谱信息变化时，自动生成
    currentFoodMakingPackaging = generatePackagingList(servingWeight, totalWeight, totalServings);
  } else {
    // 编辑订单时，如果包装清单已存在且食谱信息未变化，则保留用户的手动修改
    // 但需要更新费用、单价和总重量（如果原料价格有变化）
    currentFoodMakingPackaging = currentFoodMakingPackaging.map(item => {
      const ingredient = store.ingredients.find(ing => ing.id === item.ingredientId);
      if (ingredient) {
        const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
        const quantity = parseFloat(item.quantity) || 0;
        // 重新计算单价：每500单位的单价/500
        const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
        // 重新计算费用
        const cost = pricePer500 > 0 ? parseFloat(((quantity * pricePer500) / 500).toFixed(2)) : 0;
        // 重新计算总重量：用量*每单位重量
        const weightPerUnit = ingredient.weightPerUnit || 0;
        const totalWeight = quantity * weightPerUnit;
        return {
          ...item,
          unitPrice: unitPrice,
          totalWeight: totalWeight,
          cost: cost
        };
      }
      return item;
    });
  }
  
  // 显示食谱信息（按顺序：食谱名称、制作天数、每份总量、总份数、总重量（净重）、总热量）
  const recipeInfoEl = $('ofm-recipe-info-content');
  if (recipeInfoEl) {
    recipeInfoEl.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; font-size:13px;">
        <div><strong>食谱名称：</strong>${recipe.name || '-'}</div>
        <div><strong>制作天数：</strong>${days} 天</div>
        <div><strong>每份总量：</strong>${servingWeight.toFixed(2)} g</div>
        <div><strong>总份数：</strong>${totalServings} 份</div>
        <div><strong>总重量（净重）：</strong>${totalWeight.toFixed(2)} g</div>
        <div><strong>总热量：</strong>${totalKcal.toFixed(2)} kcal</div>
      </div>
    `;
    $('ofm-recipe-info').style.display = 'block';
  }
  // 计算并显示食材总用量
  const ingredientsSummaryEl = $('ofm-ingredients-summary-content');
  console.log('ingredientsSummaryEl found:', !!ingredientsSummaryEl);
  
  if (ingredientsSummaryEl) {
    console.log('Rendering ingredients table, recipe.ingredients:', recipe.ingredients ? recipe.ingredients.length : 0);
    // 先计算总用量和总重量（只计算单位是"g"的食材）
    let totalWeightForPercent = 0;
    const ingredientsData = (recipe.ingredients || []).map((ingItem, idx) => {
      const ingredient = store.ingredients.find(i => i.id === ingItem.ingredientId);
      if (!ingredient) return null;
      
      const unit = ingItem.unit || ingredient.unit || 'g';
      // 单份用量 = 食谱中该食材重量 × (顾客每日能量估算 / 食谱总热量) / 每天吃几顿
      // 如果 ratio 为 0，则用量为 0
      const singleServingsAmount = ratio > 0 ? (ingItem.weight * ratio / mealsPerDay) : 0;
      const totalAmount = singleServingsAmount * totalServings; // 总用量
      
      // 计算该食材在总重量中的占比（只计算单位是"g"的）
      let weightInG = 0;
      if (unit === 'g' || unit === 'ml') {
        weightInG = totalAmount;
      } else if (unit === 'kg') {
        weightInG = totalAmount * 1000;
      } else if (unit === 'L') {
        weightInG = totalAmount * 1000;
      } else if (unit !== 'g' && unit !== 'ml') {
        // 其他单位需要每单位重量
        if (ingredient.weightPerUnit) {
          weightInG = totalAmount * ingredient.weightPerUnit;
        }
      }
      
      if (unit === 'g' || unit === 'ml' || unit === 'kg' || unit === 'L' || (unit !== 'g' && unit !== 'ml' && ingredient.weightPerUnit)) {
        totalWeightForPercent += weightInG;
      }
      
      const name = ingredient.name || '';
      const description = ingredient.description || '';
      const brand = ingredient.brand || '';
      let displayText = name;
      if (description) {
        displayText += '-' + description;
      }
      if (brand) {
        displayText += '（' + brand + '）';
      }
      
      return {
        idx,
        ingredientId: ingItem.ingredientId,
        displayText,
        totalAmount,
        unit,
        weightInG
      };
    }).filter(x => x !== null);
    
    let html = `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:var(--bg-tertiary);">
            <th style="padding:8px; border:0.5px solid var(--border); text-align:left;">序号</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:left;">食材名称</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">总用量</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:left;">单位</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">重量占比</th>
            <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">费用（含制作损耗）</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    if (ingredientsData.length > 0) {
      ingredientsData.forEach((item) => {
        // 计算重量占比（只对可以转换为重量的食材计算）
        let weightPercent = '-';
        if (item.weightInG > 0 && totalWeightForPercent > 0) {
          weightPercent = ((item.weightInG / totalWeightForPercent) * 100).toFixed(2) + '%';
        }
        
        // 计算费用（含制作损耗）：总用量 * (1 + 食谱制作损耗) * 每500单位单价 / 500
        // 直接使用总用量和单价计算，不需要转换为克
        const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
        let estimatedCost = '-';
        if (ingredient) {
          const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
          if (pricePer500 > 0 && item.totalAmount > 0) {
            // 获取食谱的制作损耗（百分比），默认为7%
            const cookingLoss = recipe.cookingLoss || 7;
            // 计算：总用量 * (1 + 制作损耗/100) * 每500单位单价 / 500
            const totalAmountWithLoss = item.totalAmount * (1 + cookingLoss / 100);
            estimatedCost = ((totalAmountWithLoss * pricePer500) / 500).toFixed(2);
          }
        }
        
        html += `
          <tr>
            <td style="padding:6px; border:0.5px solid var(--border);">${item.idx + 1}</td>
            <td style="padding:6px; border:0.5px solid var(--border);">${item.displayText}</td>
            <td style="padding:6px; border:0.5px solid var(--border); text-align:right; font-weight:500;">${item.totalAmount.toFixed(2)}</td>
            <td style="padding:6px; border:0.5px solid var(--border);">${item.unit}</td>
            <td style="padding:6px; border:0.5px solid var(--border); text-align:right;">${weightPercent}</td>
            <td style="padding:6px; border:0.5px solid var(--border); text-align:right; font-weight:500;">${estimatedCost === '-' ? '-' : '¥' + estimatedCost}</td>
          </tr>
        `;
      });
    } else {
      html += `
        <tr>
          <td colspan="6" style="padding:12px; border:0.5px solid var(--border); text-align:center; color:var(--text-secondary);">该食谱暂无食材</td>
        </tr>
      `;
    }
    
    // 计算日期默认值（新增订单时，或编辑订单但没有保存的日期时）
    const orderId = $('order-id') ? $('order-id').value : null;
    let productionDateValue = '';
    let shippingDateValue = '';
    
    // 如果是新增订单，或者编辑订单但需要计算默认日期，则计算
    if (!orderId) {
      // 新增订单：计算默认日期
      let orderDate = $('o-orderDate') ? $('o-orderDate').value : '';
      if (!orderDate) {
        orderDate = new Date().toISOString().split('T')[0];
      }
      
      console.log('计算日期默认值 - 订单创建日期:', orderDate);
      
      if (orderDate) {
        // 计算制作日期（订单创建日期的第二天）
        // 使用本地时区避免时区问题
        const [year, month, day] = orderDate.split('-').map(Number);
        const orderDateObj = new Date(year, month - 1, day);
        orderDateObj.setDate(orderDateObj.getDate() + 1);
        productionDateValue = `${orderDateObj.getFullYear()}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')}`;
        console.log('计算制作日期 - 加1天后:', productionDateValue);
        
        // 计算发货日期（制作日期的第二天）
        const [pYear, pMonth, pDay] = productionDateValue.split('-').map(Number);
        const productionDateObj = new Date(pYear, pMonth - 1, pDay);
        productionDateObj.setDate(productionDateObj.getDate() + 1);
        shippingDateValue = `${productionDateObj.getFullYear()}-${String(productionDateObj.getMonth() + 1).padStart(2, '0')}-${String(productionDateObj.getDate()).padStart(2, '0')}`;
        console.log('计算发货日期 - 加1天后:', shippingDateValue);
        
        console.log('计算日期默认值 - 制作日期:', productionDateValue, '发货日期:', shippingDateValue);
      }
    } else {
      console.log('编辑订单，日期值将在openOrderForm中单独处理');
    }
    
    // 计算食材总费用（所有食材的费用求和）
    let totalIngredientCost = 0;
    ingredientsData.forEach((item) => {
      const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
      if (ingredient) {
        const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
        if (pricePer500 > 0 && item.totalAmount > 0) {
          const cookingLoss = recipe.cookingLoss || 7;
          const totalAmountWithLoss = item.totalAmount * (1 + cookingLoss / 100);
          const cost = parseFloat(((totalAmountWithLoss * pricePer500) / 500).toFixed(2));
          totalIngredientCost += cost;
        }
      }
    });
    
    // 计算预估人工成本：向上取整（总重量（净重）/4000）*20
    const laborCost = Math.ceil(totalWeight / 4000) * 20;
    
    // 计算包装总费用和包装总重量
    const packagingTotalCost = currentFoodMakingPackaging.reduce((sum, item) => {
      return sum + (parseFloat(item.cost) || 0);
    }, 0);
    const packagingTotalWeight = currentFoodMakingPackaging.reduce((sum, item) => {
      return sum + (parseFloat(item.totalWeight) || 0);
    }, 0);
    
    // 计算预估快递费用（根据快递类型）
    // 包裹总重=总重量（净重）*（1+制作损耗）+包装总重量
    const cookingLoss = recipe.cookingLoss || 7;
    const packageTotalWeight = totalWeight * (1 + cookingLoss / 100) + packagingTotalWeight;
    const previousPriceEditArea = document.getElementById('ofm-price-edit-area');
    const wasEditingPrice = previousPriceEditArea ? previousPriceEditArea.dataset.editing === 'true' : false;
    const previousManualPriceInput = document.getElementById('ofm-manual-price');
    const previousManualInputValue = previousManualPriceInput ? previousManualPriceInput.value : '';
    let shippingType = currentFoodMakingShippingType || 'remote';
    const existingShippingSelect = document.getElementById('ofm-shipping-type');
    if (existingShippingSelect && existingShippingSelect.value) {
      shippingType = existingShippingSelect.value;
    }
    let shippingCost = 0;
    let shippingDescText = '';
    if (shippingType === 'local') {
      shippingCost = 20;
      shippingDescText = '（同城快递固定 ¥20）';
    } else if (shippingType === 'none') {
      shippingCost = 0;
      shippingDescText = '（无需快递，费用为 0）';
    } else {
      shippingType = 'remote';
      shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
      shippingDescText = `（自动计算：23 + (包裹总重${(packageTotalWeight / 1000).toFixed(2)}kg - 1) × 13 + 5）`;
    }
    currentFoodMakingShippingType = shippingType;
    
    // 计算订单总价：订单总价=（食材总费用+包装总费用+预估人工成本+预估快递费用）*2
    const subtotalCost = totalIngredientCost + packagingTotalCost + laborCost + shippingCost;
    const orderTotalPriceAuto = Math.round(subtotalCost * 2);
    latestFoodMakingAutoPrice = orderTotalPriceAuto;
    const displayOrderTotalPrice = manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : orderTotalPriceAuto;
    const displayOrderTotalPriceRounded = Math.round(displayOrderTotalPrice || 0);
    if (manualFoodMakingOrderPrice != null) {
      manualFoodMakingOrderPrice = displayOrderTotalPriceRounded;
    }
    const orderPriceDescText = manualFoodMakingOrderPrice != null ? '（已手动改价）' : '（自动计算并取整数）';
    
    html += `
        </tbody>
      </table>
      <div style="margin-top:16px; padding:12px; background:var(--bg-tertiary); border-radius:6px;">
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; font-size:13px;">
          <div>
            <strong>订单制作日期：</strong>
            <input id="ofm-production-date" type="date" value="${productionDateValue}" style="margin-left:8px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px;" />
          </div>
          <div>
            <strong>订单发货日期：</strong>
            <input id="ofm-shipping-date" type="date" value="${shippingDateValue}" style="margin-left:8px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px;" />
          </div>
        </div>
      </div>
      <div style="margin-top:16px; padding:16px; background:var(--bg-secondary); border-radius:8px; border:1px solid var(--border);">
        <h3 style="margin:0 0 16px 0; font-size:16px; font-weight:600;">费用计算</h3>
        <div style="display:grid; grid-template-columns: 1fr; gap:12px; font-size:13px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <strong style="min-width:120px;">食材总费用：</strong>
            <span id="ofm-total-ingredient-cost" style="font-weight:600; color:var(--text-primary);">¥${totalIngredientCost.toFixed(2)}</span>
            <span style="color:var(--text-secondary); font-size:12px;">（自动计算，不可更改）</span>
          </div>
          <div style="margin-top:8px;">
            <strong style="display:block; margin-bottom:8px;">包装清单：</strong>
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">（自动生成，可手动修改）</div>
            <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:8px;">
              <thead>
                <tr style="background:var(--bg-tertiary);">
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:left;">包装项目</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">用量</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">单价</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">总费用</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:right;">总重量(g)</th>
                  <th style="padding:8px; border:0.5px solid var(--border); text-align:center;">操作</th>
                </tr>
              </thead>
              <tbody id="ofm-packaging-list">
                ${currentFoodMakingPackaging.map((item, idx) => `
                  <tr>
                    <td style="padding:6px; border:0.5px solid var(--border);">${item.name || ''}</td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:right;">
                      <input type="number" data-packaging-quantity="${idx}" value="${item.quantity || ''}" placeholder="用量" min="0" step="0.01" style="width:80px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px; text-align:right;" />
                      <span style="margin-left:4px; font-size:12px; color:var(--text-secondary);">${item.unit || ''}</span>
                    </td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:right; font-weight:500;" data-packaging-unit-price="${idx}">¥${(item.unitPrice || 0).toFixed(4)}</td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:right;">
                      <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                        <span style="font-size:13px; color:var(--text-primary);">¥</span>
                        <input type="number" data-packaging-cost="${idx}" value="${(item.cost || 0).toFixed(2)}" placeholder="费用" min="0" step="0.01" style="width:100px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px; text-align:right;" />
                      </div>
                    </td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:right; font-weight:500;" data-packaging-total-weight="${idx}">${(item.totalWeight || 0).toFixed(2)}</td>
                    <td style="padding:6px; border:0.5px solid var(--border); text-align:center;">
                      <button type="button" class="btn small" data-packaging-remove="${idx}" style="padding:4px 12px; font-size:12px;">删除</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:var(--bg-secondary); font-weight:600;">
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:left;">合计</td>
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:right;">-</td>
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:right;">-</td>
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:right;" id="ofm-packaging-total-cost">¥${packagingTotalCost.toFixed(2)}</td>
                  <td style="padding:8px; border:0.5px solid var(--border); text-align:right;" id="ofm-packaging-total-weight">${currentFoodMakingPackaging.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0).toFixed(2)}</td>
                  <td style="padding:8px; border:0.5px solid var(--border);"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <strong style="min-width:120px;">快递类型：</strong>
            <select id="ofm-shipping-type" style="padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px;">
              <option value="remote" ${shippingType === 'remote' ? 'selected' : ''}>异地快递</option>
              <option value="local" ${shippingType === 'local' ? 'selected' : ''}>同城快递</option>
              <option value="none" ${shippingType === 'none' ? 'selected' : ''}>无需快递</option>
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <strong style="min-width:120px;">预估快递费用：</strong>
            <span id="ofm-shipping-cost" style="font-weight:600; color:var(--text-primary);">¥${shippingCost.toFixed(2)}</span>
            <span id="ofm-shipping-cost-desc" style="color:var(--text-secondary); font-size:12px;">${shippingDescText}</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <strong style="min-width:120px;">预估人工成本：</strong>
            <span id="ofm-labor-cost" style="font-weight:600; color:var(--text-primary);">¥${laborCost.toFixed(2)}</span>
            <span style="color:var(--text-secondary); font-size:12px;">（自动计算：向上取整（总重量${totalWeight.toFixed(2)}g÷4000）×20）</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <strong style="min-width:120px;">订单总价：</strong>
            <span id="ofm-order-total-price" style="font-weight:700; font-size:18px; color:var(--accent);">¥${displayOrderTotalPriceRounded}</span>
            <span id="ofm-order-total-price-desc" style="color:var(--text-secondary); font-size:12px;">${orderPriceDescText}</span>
            <button type="button" id="ofm-price-edit" class="btn small" style="padding:4px 12px; font-size:12px; display:${manualFoodMakingOrderPrice != null ? 'none' : 'inline-flex'};">改价</button>
            <div id="ofm-price-edit-area" style="display:${manualFoodMakingOrderPrice != null ? 'flex' : 'none'}; gap:8px; align-items:center;">
              <input id="ofm-manual-price" type="number" min="0" step="1" value="${manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : displayOrderTotalPriceRounded}" style="width:120px; padding:4px 8px; border:0.5px solid var(--border); border-radius:4px; font-size:13px;" />
              <button type="button" id="ofm-price-confirm" class="btn small" style="padding:4px 12px; font-size:12px;">确认</button>
              <button type="button" id="ofm-price-reset" class="btn small" style="padding:4px 12px; font-size:12px;">恢复默认价格</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    console.log('生成HTML时的日期值:', { productionDateValue, shippingDateValue });
    ingredientsSummaryEl.innerHTML = html;
    const priceEditArea = document.getElementById('ofm-price-edit-area');
    if (priceEditArea) {
      const editingState = manualFoodMakingOrderPrice != null ? 'true' : (wasEditingPrice ? 'true' : 'false');
      priceEditArea.dataset.editing = editingState;
      if (editingState === 'true') {
        priceEditArea.style.display = 'flex';
      }
    }
    const manualPriceInput = document.getElementById('ofm-manual-price');
    if (manualPriceInput) {
      if (manualFoodMakingOrderPrice != null) {
        manualPriceInput.value = manualFoodMakingOrderPrice;
      } else if (wasEditingPrice && previousManualInputValue !== '') {
        manualPriceInput.value = previousManualInputValue;
      } else {
        manualPriceInput.value = displayOrderTotalPriceRounded;
      }
    }
    const priceEditBtn = document.getElementById('ofm-price-edit');
    if (priceEditBtn) {
      if (priceEditArea && priceEditArea.dataset.editing === 'true') {
        priceEditBtn.style.display = 'none';
      } else if (manualFoodMakingOrderPrice == null) {
        priceEditBtn.style.display = 'inline-flex';
      }
    }
    const shippingTypeSelect = document.getElementById('ofm-shipping-type');
    if (shippingTypeSelect) {
      shippingTypeSelect.value = currentFoodMakingShippingType || 'remote';
    }
    
    // 立即验证日期值是否被正确设置
    setTimeout(() => {
      const productionDateInput = document.getElementById('ofm-production-date');
      const shippingDateInput = document.getElementById('ofm-shipping-date');
      if (productionDateInput && shippingDateInput) {
        console.log('HTML生成后立即检查日期值:', {
          productionDateInputValue: productionDateInput.value,
          shippingDateInputValue: shippingDateInput.value,
          expectedProductionDate: productionDateValue,
          expectedShippingDate: shippingDateValue
        });
      }
    }, 10);
    const summaryContainer = $('ofm-ingredients-summary');
    if (summaryContainer) {
      summaryContainer.style.display = 'block';
      console.log('Ingredients summary container displayed');
    } else {
      console.error('ofm-ingredients-summary element not found!');
    }
    // 设置日期默认值或加载保存的日期
    setTimeout(() => {
      const productionDateInput = document.getElementById('ofm-production-date');
      const shippingDateInput = document.getElementById('ofm-shipping-date');
      
      if (productionDateInput && shippingDateInput) {
        const orderId = $('order-id') ? $('order-id').value : null;
        
        // 注意：编辑订单时，日期会在openOrderForm中单独处理
        // 这里只处理新增订单的情况
        if (!orderId) {
          // 新增订单：设置默认值
          // 获取订单日期，如果没有则使用当前日期
          let orderDate = $('o-orderDate') ? $('o-orderDate').value : '';
          if (!orderDate) {
            orderDate = new Date().toISOString().split('T')[0];
            // 如果订单日期字段存在，也更新它
            if ($('o-orderDate')) {
              $('o-orderDate').value = orderDate;
            }
          }
          
          // 强制设置日期默认值（新增订单时总是设置）
          if (orderDate) {
            // 计算制作日期（订单创建日期的第二天）
            // 使用本地时区避免时区问题
            const [year, month, day] = orderDate.split('-').map(Number);
            const orderDateObj = new Date(year, month - 1, day);
            orderDateObj.setDate(orderDateObj.getDate() + 1);
            const productionDate = `${orderDateObj.getFullYear()}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')}`;
            
            // 计算发货日期（制作日期的第二天）
            const [pYear, pMonth, pDay] = productionDate.split('-').map(Number);
            const productionDateObj = new Date(pYear, pMonth - 1, pDay);
            productionDateObj.setDate(productionDateObj.getDate() + 1);
            const shippingDate = `${productionDateObj.getFullYear()}-${String(productionDateObj.getMonth() + 1).padStart(2, '0')}-${String(productionDateObj.getDate()).padStart(2, '0')}`;
            
            // 强制设置日期值（新增订单时总是设置默认值）
            productionDateInput.value = productionDate;
            shippingDateInput.value = shippingDate;
            
            // 再次验证日期值是否被正确设置
            console.log('setTimeout中设置日期默认值:', { 
              orderDate, 
              productionDate, 
              shippingDate,
              productionDateInputValue: productionDateInput.value,
              shippingDateInputValue: shippingDateInput.value,
              productionDateInputValueAfterSet: productionDateInput.value === productionDate ? '✓ 正确' : '✗ 错误',
              shippingDateInputValueAfterSet: shippingDateInput.value === shippingDate ? '✓ 正确' : '✗ 错误'
            });
            
            // 如果日期值不正确，强制再次设置
            if (productionDateInput.value !== productionDate) {
              console.warn('制作日期值不正确，强制重新设置');
              productionDateInput.setAttribute('value', productionDate);
              productionDateInput.value = productionDate;
            }
            if (shippingDateInput.value !== shippingDate) {
              console.warn('发货日期值不正确，强制重新设置');
              shippingDateInput.setAttribute('value', shippingDate);
              shippingDateInput.value = shippingDate;
            }
          }
        }
      } else {
        console.warn('日期输入框未找到，重试...');
        // 如果元素还没创建，再等一会儿
        setTimeout(() => {
          const productionDateInput = document.getElementById('ofm-production-date');
          const shippingDateInput = document.getElementById('ofm-shipping-date');
          if (productionDateInput && shippingDateInput) {
            const orderId = $('order-id') ? $('order-id').value : null;
            if (!orderId) {
              let orderDate = $('o-orderDate') ? $('o-orderDate').value : '';
              if (!orderDate) {
                orderDate = new Date().toISOString().split('T')[0];
              }
              if (orderDate) {
                // 计算制作日期（订单创建日期的第二天）
                // 使用本地时区避免时区问题
                const [year, month, day] = orderDate.split('-').map(Number);
                const orderDateObj = new Date(year, month - 1, day);
                orderDateObj.setDate(orderDateObj.getDate() + 1);
                const productionDate = `${orderDateObj.getFullYear()}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')}`;
                
                // 计算发货日期（制作日期的第二天）
                const [pYear, pMonth, pDay] = productionDate.split('-').map(Number);
                const productionDateObj = new Date(pYear, pMonth - 1, pDay);
                productionDateObj.setDate(productionDateObj.getDate() + 1);
                const shippingDate = `${productionDateObj.getFullYear()}-${String(productionDateObj.getMonth() + 1).padStart(2, '0')}-${String(productionDateObj.getDate()).padStart(2, '0')}`;
                
                // 强制设置日期值
                productionDateInput.value = productionDate;
                shippingDateInput.value = shippingDate;
              }
            }
          }
        }, 200);
      }
    }, 100);
    
    // 保存计算结果到全局变量
    currentFoodMakingRecipeId = recipeId;
    currentFoodMakingDays = days;
    
    // 绑定费用计算板块的事件监听器
    setupFoodMakingCostCalculation();
  } else {
    $('ofm-ingredients-summary').style.display = 'none';
  }
}

// 更新包装清单合计
function updatePackagingTotals() {
  const packagingTotalCost = currentFoodMakingPackaging.reduce((sum, item) => {
    return sum + (parseFloat(item.cost) || 0);
  }, 0);
  const packagingTotalWeight = currentFoodMakingPackaging.reduce((sum, item) => {
    return sum + (parseFloat(item.totalWeight) || 0);
  }, 0);
  
  const totalCostEl = document.getElementById('ofm-packaging-total-cost');
  const totalWeightEl = document.getElementById('ofm-packaging-total-weight');
  
  if (totalCostEl) {
    totalCostEl.textContent = `¥${packagingTotalCost.toFixed(2)}`;
  }
  if (totalWeightEl) {
    totalWeightEl.textContent = packagingTotalWeight.toFixed(2);
  }
}
// 设置鲜食制作费用计算板块的事件监听器
function setupFoodMakingCostCalculation() {
  // 删除包装按钮（使用事件委托）
  const packagingList = document.getElementById('ofm-packaging-list');
  if (packagingList) {
    packagingList.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-packaging-remove')) {
        const idx = parseInt(e.target.getAttribute('data-packaging-remove'));
        const item = currentFoodMakingPackaging[idx];
        if (item && confirm(`确定要删除"${item.name || '该包装项'}"吗？`)) {
          currentFoodMakingPackaging.splice(idx, 1);
          calculateFoodMakingIngredients(); // 重新渲染（会重新计算合计）
        }
      }
    });
    
    // 包装清单输入框变化时更新数据并重新计算总价
    packagingList.addEventListener('input', (e) => {
      if (e.target.hasAttribute('data-packaging-quantity')) {
        const idx = parseInt(e.target.getAttribute('data-packaging-quantity'));
        if (currentFoodMakingPackaging[idx]) {
          const quantity = parseFloat(e.target.value) || 0;
          currentFoodMakingPackaging[idx].quantity = quantity;
          
          // 重新计算费用、单价和总重量
          const ingredient = store.ingredients.find(ing => ing.id === currentFoodMakingPackaging[idx].ingredientId);
          if (ingredient) {
            const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
            // 重新计算单价：每500单位的单价/500
            const unitPrice = pricePer500 > 0 ? (pricePer500 / 500) : 0;
            // 重新计算费用：用量 * 每500单位单价 / 500
            const cost = pricePer500 > 0 ? parseFloat(((quantity * pricePer500) / 500).toFixed(2)) : 0;
            // 重新计算总重量：用量*每单位重量
            const weightPerUnit = ingredient.weightPerUnit || 0;
            const totalWeight = quantity * weightPerUnit;
            
            currentFoodMakingPackaging[idx].unitPrice = unitPrice;
            currentFoodMakingPackaging[idx].cost = cost;
            currentFoodMakingPackaging[idx].totalWeight = totalWeight;
            
            // 更新单价显示
            const unitPriceEl = packagingList.querySelector(`[data-packaging-unit-price="${idx}"]`);
            if (unitPriceEl) {
              unitPriceEl.textContent = `¥${unitPrice.toFixed(4)}`;
            }
            
            // 更新费用显示（费用输入框在¥符号后面）
            const costInput = packagingList.querySelector(`[data-packaging-cost="${idx}"]`);
            if (costInput) {
              costInput.value = cost.toFixed(2);
            }
            
            // 更新总重量显示
            const totalWeightEl = packagingList.querySelector(`[data-packaging-total-weight="${idx}"]`);
            if (totalWeightEl) {
              totalWeightEl.textContent = totalWeight.toFixed(2);
            }
            
            // 更新合计行
            updatePackagingTotals();
          }
        }
        updateFoodMakingOrderTotalPrice();
      } else if (e.target.hasAttribute('data-packaging-cost')) {
        // 允许手动修改费用
        const idx = parseInt(e.target.getAttribute('data-packaging-cost'));
        if (currentFoodMakingPackaging[idx]) {
          currentFoodMakingPackaging[idx].cost = parseFloat(e.target.value) || 0;
        }
        // 更新合计行
        updatePackagingTotals();
        updateFoodMakingOrderTotalPrice();
      }
    });
  }
  
  // 预估快递费用现在是自动计算的，不需要手动输入
  // 优惠折扣已移除，订单总价直接乘以2
}

// 更新鲜食制作订单总价
function updateFoodMakingOrderTotalPrice() {
  // 重新计算所有费用
  const customerId = $('o-customerId') ? $('o-customerId').value : '';
  const recipeId = $('ofm-recipe-select') ? $('ofm-recipe-select').value : '';
  
  if (!customerId || !recipeId) return;
  
  const customer = store.customers.find(c => c.id === customerId);
  const recipe = store.recipes.find(r => r.id === recipeId);
  
  if (!customer || !recipe) return;
  
  const estKcal = customer.estKcal || 0;
  const recipeTotalKcal = recipe.totalKcal || 0;
  const ratio = (estKcal > 0 && recipeTotalKcal > 0) ? (estKcal / recipeTotalKcal) : 0;
  const mealsPerDay = customer.mealsPerDay || 1;
  const days = parseInt(($('ofm-days') ? $('ofm-days').value : '') || '1') || 1;
  const totalServings = mealsPerDay * days;
  const servingWeight = ratio > 0 ? ((recipe.totalWeight || 0) * ratio / mealsPerDay) : 0;
  const totalWeight = servingWeight * totalServings;
  
  // 计算食材总费用
  let totalIngredientCost = 0;
  (recipe.ingredients || []).forEach((ingItem) => {
    const ingredient = store.ingredients.find(i => i.id === ingItem.ingredientId);
    if (ingredient) {
      const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
      if (pricePer500 > 0) {
        const singleServingsAmount = ratio > 0 ? (ingItem.weight * ratio / mealsPerDay) : 0;
        const totalAmount = singleServingsAmount * totalServings;
        if (totalAmount > 0) {
          const cookingLoss = recipe.cookingLoss || 7;
          const totalAmountWithLoss = totalAmount * (1 + cookingLoss / 100);
          const cost = parseFloat(((totalAmountWithLoss * pricePer500) / 500).toFixed(2));
          totalIngredientCost += cost;
        }
      }
    }
  });
  
  // 计算预估人工成本：向上取整（总重量（净重）/4000）*20
  const laborCost = Math.ceil(totalWeight / 4000) * 20;
  
  // 计算包装总费用和包装总重量
  const packagingTotalCost = currentFoodMakingPackaging.reduce((sum, item) => {
    return sum + (parseFloat(item.cost) || 0);
  }, 0);
  const packagingTotalWeight = currentFoodMakingPackaging.reduce((sum, item) => {
    return sum + (parseFloat(item.totalWeight) || 0);
  }, 0);
  
  // 计算预估快递费用（根据快递类型）
  // 包裹总重=总重量（净重）*（1+制作损耗）+包装总重量
  const cookingLoss = recipe.cookingLoss || 7;
  const packageTotalWeight = totalWeight * (1 + cookingLoss / 100) + packagingTotalWeight;
  const shippingTypeSelect = document.getElementById('ofm-shipping-type');
  let shippingType = shippingTypeSelect ? shippingTypeSelect.value : currentFoodMakingShippingType || 'remote';
  let shippingCost = 0;
  let shippingDescText = '';
  if (shippingType === 'local') {
    shippingCost = 20;
    shippingDescText = '（同城快递固定 ¥20）';
  } else if (shippingType === 'none') {
    shippingCost = 0;
    shippingDescText = '（无需快递，费用为 0）';
  } else {
    shippingType = 'remote';
    shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
    shippingDescText = `（自动计算：23 + (包裹总重${(packageTotalWeight / 1000).toFixed(2)}kg - 1) × 13 + 5）`;
  }
  currentFoodMakingShippingType = shippingType;
  if (shippingTypeSelect && shippingTypeSelect.value !== shippingType) {
    shippingTypeSelect.value = shippingType;
  }
  
  // 计算订单总价：订单总价=（食材总费用+包装总费用+预估人工成本+预估快递费用）*2
  const subtotalCost = totalIngredientCost + packagingTotalCost + laborCost + shippingCost;
  // 订单总价四舍五入为整数
  const orderTotalPriceAuto = Math.round(subtotalCost * 2);
  latestFoodMakingAutoPrice = orderTotalPriceAuto;
  const displayOrderTotalPrice = manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : orderTotalPriceAuto;
  const displayOrderTotalPriceRounded = Math.round(displayOrderTotalPrice || 0);
  if (manualFoodMakingOrderPrice != null) {
    manualFoodMakingOrderPrice = displayOrderTotalPriceRounded;
  }
  const orderPriceDescText = manualFoodMakingOrderPrice != null ? '（已手动改价）' : '（自动计算并取整数）';
  
  // 更新人工成本显示
  const laborCostEl = document.getElementById('ofm-labor-cost');
  if (laborCostEl) {
    laborCostEl.textContent = `¥${laborCost.toFixed(2)}`;
    const descEl = laborCostEl.nextElementSibling;
    if (descEl) {
      descEl.textContent = `（自动计算：向上取整（总重量${totalWeight.toFixed(2)}g÷4000）×20）`;
    }
  }
  
  // 更新快递费用显示
  const shippingCostEl = document.getElementById('ofm-shipping-cost');
  if (shippingCostEl) {
    shippingCostEl.textContent = `¥${shippingCost.toFixed(2)}`;
  }
  const shippingDescEl = document.getElementById('ofm-shipping-cost-desc');
  if (shippingDescEl) {
    shippingDescEl.textContent = shippingDescText;
  }
  
  // 更新订单总价显示
  const orderTotalPriceEl = document.getElementById('ofm-order-total-price');
  if (orderTotalPriceEl) {
    orderTotalPriceEl.textContent = `¥${displayOrderTotalPriceRounded}`;
  }
  const orderTotalPriceDescEl = document.getElementById('ofm-order-total-price-desc');
  if (orderTotalPriceDescEl) {
    orderTotalPriceDescEl.textContent = orderPriceDescText;
  }

  const priceEditBtn = document.getElementById('ofm-price-edit');
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  const manualPriceInput = document.getElementById('ofm-manual-price');
  const isEditing = priceEditArea ? priceEditArea.dataset.editing === 'true' : false;

  if (priceEditBtn && priceEditArea) {
    if (manualFoodMakingOrderPrice != null) {
      priceEditBtn.style.display = 'none';
      priceEditArea.style.display = 'flex';
      priceEditArea.dataset.editing = 'true';
    } else if (isEditing) {
      priceEditBtn.style.display = 'none';
      priceEditArea.style.display = 'flex';
    } else {
      priceEditBtn.style.display = 'inline-flex';
      priceEditArea.style.display = 'none';
    }
  }

  if (manualPriceInput) {
    if (manualFoodMakingOrderPrice != null) {
      manualPriceInput.value = manualFoodMakingOrderPrice;
    } else if (!isEditing) {
      manualPriceInput.value = Math.round(orderTotalPriceAuto || 0);
    }
  }
}

function handleFoodMakingShippingChange(value) {
  currentFoodMakingShippingType = value || 'remote';
  updateFoodMakingOrderTotalPrice();
}

function openFoodMakingManualPriceEditor() {
  const priceEditBtn = document.getElementById('ofm-price-edit');
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  const manualPriceInput = document.getElementById('ofm-manual-price');
  if (!priceEditArea || !manualPriceInput || !priceEditBtn) return;
  priceEditBtn.style.display = 'none';
  priceEditArea.style.display = 'flex';
  priceEditArea.dataset.editing = 'true';
  const baseValue = manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : (latestFoodMakingAutoPrice || 0);
  manualPriceInput.value = Math.round(baseValue || 0);
  manualPriceInput.focus();
  if (typeof manualPriceInput.select === 'function') {
    try {
      manualPriceInput.select();
    } catch (err) {
      console.warn('选择手动价格输入框失败:', err);
    }
  }
}

function confirmFoodMakingManualPrice() {
  const manualPriceInput = document.getElementById('ofm-manual-price');
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  if (!manualPriceInput || !priceEditArea) return;
  const value = parseFloat(manualPriceInput.value);
  if (Number.isNaN(value) || value < 0) {
    alert('请输入有效的价格');
    manualPriceInput.focus();
    if (typeof manualPriceInput.select === 'function') {
      try { manualPriceInput.select(); } catch (err) { console.warn(err); }
    }
    return;
  }
  manualFoodMakingOrderPrice = Math.round(value);
  priceEditArea.dataset.editing = 'true';
  updateFoodMakingOrderTotalPrice();
}

function resetFoodMakingManualPrice() {
  const priceEditBtn = document.getElementById('ofm-price-edit');
  const priceEditArea = document.getElementById('ofm-price-edit-area');
  const manualPriceInput = document.getElementById('ofm-manual-price');
  manualFoodMakingOrderPrice = null;
  if (priceEditArea) {
    priceEditArea.dataset.editing = 'false';
    priceEditArea.style.display = 'none';
  }
  if (priceEditBtn) {
    priceEditBtn.style.display = 'inline-flex';
  }
  if (manualPriceInput) {
    manualPriceInput.value = Math.round(latestFoodMakingAutoPrice || 0);
  }
  updateFoodMakingOrderTotalPrice();
}
// 计算订单总计
function calculateOrderTotals() {
  const customerId = $('o-customerId').value;
  if (!customerId || currentOrderRecipes.length === 0) {
    return;
  }
  
  const customer = store.customers.find(c => c.id === customerId);
  if (!customer || !customer.estKcal) {
    alert('该顾客缺少每日能量估算信息，请先完善顾客信息');
    return;
  }
  
  const estKcal = customer.estKcal; // 顾客每日能量估算
  let totalRecipeCost = 0; // 所有食谱的食材总成本
  let totalWeight = 0; // 订单总重量（g）
  
  // 计算每个食谱的用量和成本
  const recipesWithCalculations = currentOrderRecipes.map(item => {
    const recipe = store.recipes.find(r => r.id === item.recipeId);
    if (!recipe || !recipe.totalKcal || !recipe.totalWeight) {
      return null;
    }
    
    const servings = item.servings || 1;
    const cookingLoss = recipe.cookingLoss || 7; // 制作损耗（%）
    
    // 计算订单中该食谱的用量：每日能量估算 / 食谱总热量 × 食谱中该食材重量 × 份数
    const ratio = estKcal / recipe.totalKcal;
    
    // 计算该食谱在订单中的总重量
    const recipeWeightInOrder = recipe.totalWeight * ratio * servings;
    totalWeight += recipeWeightInOrder;
    
    // 计算该食谱的食材成本
    let recipeCost = 0;
    const ingredientsWithCost = (recipe.ingredients || []).map(ingItem => {
      const ingredient = store.ingredients.find(i => i.id === ingItem.ingredientId);
      if (!ingredient) return null;
      
      // 订单中该食材用量 = 每日能量估算 / 食谱总热量 × 食谱中该食材重量 × 份数
      const orderAmount = ingItem.weight * ratio * servings;
      
      // 实际采购量 = 订单用量 × (1 + 制作损耗 / 100)
      const purchaseAmount = orderAmount * (1 + cookingLoss / 100);
      
      // 转换为统一单位（g）进行计算
      let purchaseAmountInG = purchaseAmount;
      const unit = ingItem.unit || ingredient.unit || 'g';
      if (unit === 'kg') {
        purchaseAmountInG = purchaseAmount * 1000;
      } else if (unit === 'L') {
        purchaseAmountInG = purchaseAmount * 1000;
      } else if (unit !== 'g' && unit !== 'ml') {
        // 其他单位需要每单位重量
        if (ingredient.weightPerUnit) {
          purchaseAmountInG = purchaseAmount * ingredient.weightPerUnit;
        } else {
          console.warn('原料缺少每单位重量，无法计算成本:', ingredient.name);
          return null;
        }
      }
      
      // 食材成本 = 实际采购量(g) / 500 × 可食部单价/500单位
      const ediblePricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
      const ediblePortion = ingredient.ediblePortion || 1;
      const cost = (purchaseAmountInG / 500) * ediblePricePer500;
      
      recipeCost += cost;
      
      return {
        ingredientId: ingItem.ingredientId,
        ingredientName: ingredient.name || '',
        recipeAmount: ingItem.weight,
        orderAmount: orderAmount,
        purchaseAmount: purchaseAmount,
        unit: unit,
        ediblePortion: ediblePortion,
        ediblePricePer500: ediblePricePer500,
        cost: cost
      };
    }).filter(x => x !== null);
    
    return {
      recipeId: recipe.id,
      recipeName: recipe.name || '',
      recipeCode: recipe.code || '',
      servings: servings,
      cookingLoss: cookingLoss,
      sellingPrice: recipe.sellingPrice || null, // 食谱售价（需求确认前）
      ingredients: ingredientsWithCost,
      recipeCost: recipeCost,
      recipeSellingPrice: recipe.sellingPrice || (recipeCost * 2), // 默认售价=成本×2
      cookingSteps: Array.isArray(recipe.cookingSteps) ? [...recipe.cookingSteps] : []
    };
  }).filter(x => x !== null);
  
  // 计算总成本
  recipesWithCalculations.forEach(r => {
    totalRecipeCost += r.recipeCost;
  });
  
  const packagingCost = parseFloat($('o-packagingCost').value) || 0;
  const laborCost = parseFloat($('o-laborCost').value) || 0;
  const shippingCost = parseFloat($('o-shippingCost').value) || 0;
  const totalCost = totalRecipeCost + packagingCost + laborCost + shippingCost;
  
  // 默认总售价 = 总成本 × 2
  const totalSellingPrice = totalCost * 2;
  
  // 保存计算结果到全局变量（供表单提交时使用）
  window.currentOrderCalculations = {
    recipes: recipesWithCalculations,
    totalRecipeCost: totalRecipeCost,
    totalCost: totalCost,
    totalSellingPrice: totalSellingPrice,
    totalWeight: totalWeight
  };
  
  return {
    recipes: recipesWithCalculations,
    totalRecipeCost,
    totalCost,
    totalSellingPrice,
    totalWeight
  };
}

// 分页订单
function paginatedOrders() {
  const searchQ = ($('order-search').value || '').trim().toLowerCase();
  const statusFilter = ($('order-status-filter').value || '').trim();
  
  const filtered = store.orders.filter(order => {
    const matchSearch = !searchQ || 
      (order.orderNumber || '').toLowerCase().includes(searchQ) ||
      (() => {
        const customer = store.customers.find(c => c.id === order.customerId);
        return customer && (
          (customer.petName || '').toLowerCase().includes(searchQ) ||
          (customer.wechat || '').toLowerCase().includes(searchQ)
        );
      })();
    
    const matchStatus = !statusFilter || order.status === statusFilter;
    
    return matchSearch && matchStatus;
  });
  
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / store.orderPageSize));
  if (store.orderPage > totalPages) store.orderPage = totalPages;
  
  const start = (store.orderPage - 1) * store.orderPageSize;
  const pageItems = filtered.slice(start, start + store.orderPageSize);
  
  return { pageItems, total, totalPages };
}
// 渲染订单列表
function buildOrderBasicSection(order) {
  const rows = [
    { label: '订单编号', value: order.orderNumber || '-' },
    { label: '订单制作日期', value: order.productionDate || '-' },
    { label: '订单发货日期', value: order.shippingDate || '-' },
    { label: '备注', value: order.notes ? formatMultiline(order.notes) : '-', raw: true },
    { label: '更新时间', value: formatDateTime(order.updatedAt) }
  ];
  return `<div><div class="detail-section-title">基本信息</div>${buildDetailTable(rows)}</div>`;
}

function buildCustomerSection(customer) {
  if (!customer) {
    return `<div><div class="detail-section-title">顾客与宠物信息</div><div class="detail-empty">未找到关联的顾客与宠物信息</div></div>`;
  }
  const rows = [];
  rows.push({ label: '品种', value: customer.breed || '-' });
  rows.push({ label: '年龄/月龄', value: formatAgeDisplay(customer) });
  rows.push({ label: '体重', value: customer.weightKg != null ? `${formatNumber(customer.weightKg, 2)} kg` : '-' });
  rows.push({ label: '性别', value: zh(customer.sex, sexMap) });
  rows.push({ label: '是否绝育', value: zh(customer.neutered, neuterMap) });
  rows.push({ label: '生命阶段', value: zh(customer.lifeStage, lifeMap) });
  const activityLabel = customer.activity ? zh(customer.activity, actMap) : '-';
  const kcalFactor = customer.kcalFactor != null ? customer.kcalFactor : activityKcalFactor(customer.activity);
  rows.push({ label: '日均活动水平', value: activityLabel !== '-' ? `${activityLabel}（热量系数 ${kcalFactor}）` : '-' });
  rows.push({ label: '每日吃几顿饭', value: customer.mealsPerDay != null ? customer.mealsPerDay : '-' });
  rows.push({ label: '每日能量估算', value: describeEstKcal(customer), raw: true });
  if (customer.lifeStage === 'puppy') {
    const monthAge = customer.monthAge != null ? customer.monthAge : calcAgeMonths(customer.birthday);
    const monthFactor = customer.monthFactor != null ? customer.monthFactor : monthFactorFromMonths(monthAge);
    rows.push({ label: '月龄', value: monthAge != null ? `${monthAge} 个月` : '-' });
    rows.push({ label: '月龄系数', value: monthFactor != null ? monthFactor : '-' });
  }
  if (customer.lifeStage === 'lactation') {
    rows.push({ label: '哺乳阶段', value: zh(customer.lactStage, lactMap) });
    const lactFactor = customer.lactFactor != null ? customer.lactFactor : lactFactorFromStage(customer.lactStage);
    rows.push({ label: '哺乳阶段因子', value: lactFactor != null ? lactFactor : '-' });
    rows.push({ label: '产仔数', value: customer.litterCount != null ? customer.litterCount : '-' });
  }
  rows.push({ label: '热量系数', value: kcalFactor != null ? kcalFactor : '-' });
  rows.push({ label: '体况评分', value: customer.bcs != null ? customer.bcs : '-' });
  rows.push({ label: '过敏/不耐受', value: formatMultiline(customer.allergies) , raw: true });
  rows.push({ label: '挑食/尽量不吃', value: formatMultiline(customer.avoid), raw: true });
  rows.push({ label: '非常喜欢吃', value: formatMultiline(customer.fav), raw: true });
  rows.push({ label: '症状史/疾病史', value: formatMultiline(customer.med), raw: true });
  rows.push({ label: '备注', value: formatMultiline(customer.notes), raw: true });
  rows.push({ label: '收货信息', value: formatMultiline(customer.address), raw: true });
  return `<div><div class="detail-section-title">顾客与宠物信息</div>${buildDetailTable(rows)}</div>`;
}

function buildFoodMakingSection(order, customer) {
  if (!order.foodMakingData) {
    return '';
  }
  const data = order.foodMakingData;
  const recipe = data.recipeId ? store.recipes.find(r => r.id === data.recipeId) : null;
  const days = data.days || 1;
  const mealsPerDay = customer && customer.mealsPerDay ? customer.mealsPerDay : 1;
  const estKcal = customer && customer.estKcal ? customer.estKcal : 0;
  const recipeTotalKcal = recipe && recipe.totalKcal ? recipe.totalKcal : 0;
  const ratio = (estKcal > 0 && recipeTotalKcal > 0 && mealsPerDay > 0) ? (estKcal / recipeTotalKcal) : 0;
  const totalServings = mealsPerDay * days;
  const recipeTotalWeight = recipe && recipe.totalWeight ? recipe.totalWeight : 0;
  const servingWeight = ratio > 0 ? (recipeTotalWeight * ratio / (mealsPerDay || 1)) : 0;
  const totalWeight = servingWeight * totalServings;
  const totalKcal = recipe && ratio > 0 ? (recipe.totalKcal * ratio * days) : 0;
  const cookingLoss = recipe && recipe.cookingLoss != null ? recipe.cookingLoss : 7;

  const infoRows = [];
  if (data.recipeId) {
    if (recipe) {
      infoRows.push({ label: '食谱编号', value: recipe.code || '-' });
      infoRows.push({ label: '适用生命阶段', value: zh(recipe.lifeStage, lifeMap) });
      infoRows.push({ label: '营养参考标准', value: nutritionLabelMap[recipe.nutritionStandard] || recipe.nutritionStandard || '-' });
      infoRows.push({ label: '食谱类型', value: recipeTypeLabelMap[recipe.recipeType] || '-' });
      infoRows.push({ label: '食谱制作软件', value: recipe.software || '-' });
    } else {
      infoRows.push({ label: '食谱编号', value: `原食谱已删除（ID：${data.recipeId}）` });
    }
  }
  infoRows.push({ label: '制作天数', value: days });
  infoRows.push({ label: '每份重量', value: servingWeight > 0 ? `${formatNumber(servingWeight, 2)} g` : '-' });
  infoRows.push({ label: '总份数', value: totalServings > 0 ? totalServings : '-' });
  infoRows.push({ label: '总重量（净重）', value: totalWeight > 0 ? `${formatNumber(totalWeight, 2)} g` : '-' });
  infoRows.push({ label: '总热量', value: totalKcal > 0 ? `${formatNumber(totalKcal, 2)} kcal` : '-' });
  infoRows.push({ label: '制作损耗', value: `${formatNumber(cookingLoss, 0)}%` });

  const ingredientRows = [];
  let totalIngredientCost = 0;
  const ingredientsList = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  ingredientsList.forEach((item, idx) => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    const unit = item.unit || (ingredient ? ingredient.unit : 'g');
    const singleAmount = ratio > 0 && mealsPerDay > 0 ? (item.weight * ratio / mealsPerDay) : 0;
    const totalAmount = singleAmount * totalServings;
    const pricePer500 = ingredient ? (ingredient.ediblePricePer500 || ingredient.pricePer500 || 0) : 0;
    const totalAmountWithLoss = totalAmount * (1 + (cookingLoss || 0) / 100);
    const cost = pricePer500 > 0 ? (totalAmountWithLoss * pricePer500) / 500 : 0;
    totalIngredientCost += cost;
    const weightRatio = (unit === 'g' && totalWeight > 0) ? `${((totalAmount / totalWeight) * 100).toFixed(2)}%` : '-';
    const nameText = ingredient ? `${ingredient.name || '-'}${ingredient.description ? '-' + ingredient.description : ''}${ingredient.brand ? '（' + ingredient.brand + '）' : ''}` : '-';
    ingredientRows.push({
      index: idx + 1,
      code: ingredient ? (ingredient.code || '-') : '-',
      name: nameText,
      unit,
      totalAmount,
      weightRatio,
      pricePer500,
      cost
    });
  });

  let ingredientsTable = '<div class="detail-empty">未找到食材数据</div>';
  if (ingredientRows.length > 0) {
    const rowsHtml = ingredientRows.map(row => {
      return `<tr>
        <td>${row.index}</td>
        <td>${escapeHtml(row.code)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.unit)}</td>
        <td>${formatNumber(row.totalAmount, 2)}</td>
        <td>${row.weightRatio}</td>
        <td>${row.pricePer500 ? `¥${Number(row.pricePer500).toFixed(2)}` : '-'}</td>
        <td>${formatCurrency(row.cost)}</td>
      </tr>`;
    }).join('');
    ingredientsTable = `
      <table class="detail-table">
        <thead>
          <tr>
            <th style="width:50px;">序号</th>
            <th style="width:100px;">原料编号</th>
            <th>原料名称</th>
            <th style="width:70px;">单位</th>
            <th style="width:110px;">总用量</th>
            <th style="width:110px;">重量占比</th>
            <th style="width:130px;">单价（¥/500单位）</th>
            <th style="width:120px;">费用（含损耗）</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr>
          <th colspan="7" style="text-align:right;">食材总费用</th>
          <th>${formatCurrency(totalIngredientCost)}</th>
        </tr></tfoot>
      </table>`;
  }

  const packagingList = Array.isArray(data.packaging) ? data.packaging : [];
  const packagingRows = [];
  let packagingTotalCost = 0;
  let packagingTotalWeight = 0;
  packagingList.forEach((item, idx) => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : null;
    const cost = Number(item.cost) || 0;
    const totalWeightItem = Number(item.totalWeight) || 0;
    packagingTotalCost += cost;
    packagingTotalWeight += totalWeightItem;
    const project = ingredient ? (ingredient.name || '-') : (item.name ? item.name.split('-')[0] : '-');
    const noteParts = [];
    if (ingredient && ingredient.description) noteParts.push(ingredient.description);
    if (ingredient && ingredient.brand) noteParts.push(ingredient.brand);
    if (noteParts.length === 0 && item.name) {
      const splits = item.name.split('-');
      if (splits.length > 1) noteParts.push(splits.slice(1).join('-'));
    }
    packagingRows.push({
      index: idx + 1,
      project: project,
      note: noteParts.length ? noteParts.join(' / ') : '-',
      quantity: Number(item.quantity) || 0,
      unit: item.unit || (ingredient ? (ingredient.unit || '') : ''),
      unitPrice,
      cost,
      totalWeight: totalWeightItem
    });
  });

  let packagingTable = '<div class="detail-empty">未使用包装物料</div>';
  if (packagingRows.length > 0) {
    const rowsHtml = packagingRows.map(row => {
      const unitPriceDisplay = row.unitPrice != null ? `¥${Number(row.unitPrice).toFixed(4)}` : '-';
      return `<tr>
        <td>${row.index}</td>
        <td>${escapeHtml(row.project)}</td>
        <td>${row.note !== '-' ? escapeHtml(row.note) : '-'}</td>
        <td>${formatNumber(row.quantity, 2)}</td>
        <td>${escapeHtml(row.unit || '')}</td>
        <td>${unitPriceDisplay}</td>
        <td>${formatCurrency(row.cost)}</td>
        <td>${formatNumber(row.totalWeight, 2)}</td>
      </tr>`;
    }).join('');
    packagingTable = `
      <table class="detail-table">
        <thead>
          <tr>
            <th style="width:50px;">序号</th>
            <th style="width:120px;">包装项目</th>
            <th>说明</th>
            <th style="width:110px;">用量</th>
            <th style="width:70px;">单位</th>
            <th style="width:130px;">单价（¥）</th>
            <th style="width:120px;">总费用</th>
            <th style="width:120px;">总重量(g)</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr>
          <th colspan="6" style="text-align:right;">合计</th>
          <th>${formatCurrency(packagingTotalCost)}</th>
          <th>${formatNumber(packagingTotalWeight, 2)}</th>
        </tr></tfoot>
      </table>`;
  }

  const laborCost = totalWeight > 0 ? Math.ceil(totalWeight / 4000) * 20 : 0;
  const shippingType = data.shippingType || 'remote';
  const shippingLabelMap = { remote: '异地快递', local: '同城快递', none: '无需快递' };
  const packageTotalWeight = totalWeight * (1 + (cookingLoss || 0) / 100) + packagingTotalWeight;
  let shippingCost = 0;
  if (shippingType === 'local') {
    shippingCost = 20;
  } else if (shippingType === 'none') {
    shippingCost = 0;
  } else {
    shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
  }
  const manualPrice = data.isManualPrice && data.manualOrderTotalPrice != null ? data.manualOrderTotalPrice : null;
  const autoTotalPrice = data.autoOrderTotalPrice != null ? data.autoOrderTotalPrice : Math.round((totalIngredientCost + packagingTotalCost + laborCost + shippingCost) * 2);

  const costRows = [
    { label: '食材总费用', value: formatCurrency(totalIngredientCost) },
    { label: '包装总费用', value: formatCurrency(packagingTotalCost) },
    { label: '包装总重量', value: `${formatNumber(packagingTotalWeight, 2)} g` },
    { label: '预估人工成本', value: formatCurrency(laborCost) },
    { label: '预估快递费用', value: formatCurrency(shippingCost) },
    { label: '快递类型', value: shippingLabelMap[shippingType] || '异地快递' },
    { label: '是否手动改价', value: manualPrice != null ? '是' : '否' }
  ];
  if (manualPrice != null) {
    costRows.push({ label: '手动改价金额', value: formatCurrency(manualPrice, 0) });
  }
  costRows.push({ label: '自动计算总价（参考）', value: formatCurrency(autoTotalPrice, 0) });

  return `
    <div>
      <div class="detail-section-title">鲜食制作概况</div>
      ${buildDetailTable(infoRows)}
      <div class="detail-section-title">食材总用量</div>
      ${ingredientsTable}
      <div class="detail-section-title">包装清单</div>
      ${packagingTable}
      <div class="detail-section-title">费用汇总</div>
      ${buildDetailTable(costRows)}
    </div>
  `;
}

function buildRecipeSection(order) {
  if (!order.recipeData) {
    return '';
  }
  const data = order.recipeData;
  const infoRows = [];
  infoRows.push({ label: '食谱编号', value: data.code || '-' });
  infoRows.push({ label: '适用生命阶段', value: zh(data.lifeStage, lifeMap) });
  infoRows.push({ label: '营养参考标准', value: nutritionLabelMap[data.nutritionStandard] || data.nutritionStandard || '-' });
  infoRows.push({ label: '食谱类型', value: recipeTypeLabelMap[data.recipeType] || '-' });
  infoRows.push({ label: '食谱制作软件', value: data.software || '-' });
  infoRows.push({ label: '制作损耗', value: data.cookingLoss != null ? `${data.cookingLoss}%` : '-' });
  if (data.sellingPrice != null && data.sellingPrice !== '') {
    infoRows.push({ label: '售价', value: formatCurrency(data.sellingPrice) });
  }

  const ingredientRows = [];
  const list = Array.isArray(data.ingredients) ? data.ingredients : [];
  list.forEach((item, idx) => {
    const ingredient = store.ingredients.find(i => i.id === item.ingredientId);
    const unit = item.unit || (ingredient ? ingredient.unit : 'g');
    const nameText = ingredient ? `${ingredient.name || '-'}${ingredient.description ? '-' + ingredient.description : ''}${ingredient.brand ? '（' + ingredient.brand + '）' : ''}` : '-';
    ingredientRows.push({
      index: idx + 1,
      code: ingredient ? ingredient.code || '-' : '-',
      name: nameText,
      weight: item.weight != null ? item.weight : '-',
      unit
    });
  });
  let ingredientsTable = '<div class="detail-empty">未录入食材</div>';
  if (ingredientRows.length > 0) {
    const rowsHtml = ingredientRows.map(row => `
      <tr>
        <td>${row.index}</td>
        <td>${escapeHtml(row.code)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.weight !== '-' ? formatNumber(row.weight, 2) : '-'}</td>
        <td>${escapeHtml(row.unit || '')}</td>
      </tr>
    `).join('');
    ingredientsTable = `
      <table class="detail-table">
        <thead>
          <tr>
            <th style="width:50px;">序号</th>
            <th style="width:120px;">原料编号</th>
            <th>原料名称</th>
            <th style="width:110px;">重量</th>
            <th style="width:80px;">单位</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  }

  const nutritionRows = [];
  nutritionRows.push({ label: '蛋白质（DM）%', value: data.protein != null ? formatNumber(data.protein, 2) : '-' });
  nutritionRows.push({ label: '脂肪（DM）%', value: data.fat != null ? formatNumber(data.fat, 2) : '-' });
  nutritionRows.push({ label: '碳水化合物（DM）%', value: data.carb != null ? formatNumber(data.carb, 2) : '-' });
  nutritionRows.push({ label: '膳食纤维（DM）%', value: data.fiber != null ? formatNumber(data.fiber, 2) : '-' });
  nutritionRows.push({ label: '灰分（DM）%', value: data.ash != null ? formatNumber(data.ash, 2) : '-' });
  nutritionRows.push({ label: '水分 %', value: data.moisture != null ? formatNumber(data.moisture, 2) : '-' });
  nutritionRows.push({ label: '钙磷比', value: data.caPratio || '-' });
  nutritionRows.push({ label: '总热量', value: data.totalKcal != null ? `${formatNumber(data.totalKcal, 2)} kcal` : '-' });
  nutritionRows.push({ label: '总重量', value: data.totalWeight != null ? `${formatNumber(data.totalWeight, 2)} g` : '-' });
  nutritionRows.push({ label: '热量密度', value: data.kcalDensity != null ? `${formatNumber(data.kcalDensity, 2)} kcal/kg` : '-' });

  const steps = Array.isArray(data.cookingSteps) ? data.cookingSteps.filter(step => step && step.trim()) : [];
  const stepsHtml = steps.length ? `<table class="detail-table"><thead><tr><th style="width:60px;">步骤</th><th>制作说明</th></tr></thead><tbody>${steps.map((step, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(step)}</td></tr>`).join('')}</tbody></table>` : '<div class="detail-empty">未填写制作流程</div>';

  return `
    <div>
      <div class="detail-section-title">食谱基本信息</div>
      ${buildDetailTable(infoRows)}
      <div class="detail-section-title">食材配方</div>
      ${ingredientsTable}
      <div class="detail-section-title">营养数据</div>
      ${buildDetailTable(nutritionRows)}
      <div class="detail-section-title">制作流程</div>
      ${stepsHtml}
    </div>
  `;
}

function openOrderDetail(orderId) {
  const card = $('order-detail-card');
  const content = $('order-detail-content');
  if (!card || !content) return;
  const order = store.orders.find(o => o.id === orderId);
  if (!order) {
    alert('未找到订单信息');
    return;
  }
  const customer = store.customers.find(c => c.id === order.customerId) || null;

  const sections = [];
  sections.push(buildOrderBasicSection(order));
  sections.push(buildCustomerSection(customer));
  if (order.orderType === 'food_making' || order.orderType === 'both') {
    sections.push(buildFoodMakingSection(order, customer));
  }
  if (order.orderType === 'recipe_only' || order.orderType === 'both') {
    sections.push(buildRecipeSection(order));
  }

  content.innerHTML = sections.filter(Boolean).join('');
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeOrderDetail() {
  const card = $('order-detail-card');
  const content = $('order-detail-content');
  if (card) card.style.display = 'none';
  if (content) content.innerHTML = '';
}

function renderOrdersList() {
  const list = $('orders-list');
  if (!list) return;
  
  const estimateFoodMakingPayment = (order) => {
    try {
      if (!order || order.orderType !== 'food_making') return 0;
      const customer = store.customers.find(c => c.id === order.customerId);
      const recipeId = order.foodMakingData && order.foodMakingData.recipeId;
      const recipe = recipeId ? store.recipes.find(r => r.id === recipeId) : null;
      if (!customer || !recipe) return 0;
      const days = order.foodMakingData && order.foodMakingData.days ? order.foodMakingData.days : 1;
      const estKcal = customer.estKcal || 0;
      const recipeTotalKcal = recipe.totalKcal || 0;
      const mealsPerDay = customer.mealsPerDay || 1;
      if (!(estKcal > 0 && recipeTotalKcal > 0 && mealsPerDay > 0)) return 0;
      const ratio = estKcal / recipeTotalKcal;
      const totalServings = mealsPerDay * days;
      const servingWeight = (recipe.totalWeight || 0) * ratio / mealsPerDay;
      const totalWeight = servingWeight * totalServings;
      let totalIngredientCost = 0;
      (recipe.ingredients || []).forEach((ingItem) => {
        const ingredient = store.ingredients.find(i => i.id === ingItem.ingredientId);
        if (!ingredient) return;
        const pricePer500 = ingredient.ediblePricePer500 || ingredient.pricePer500 || 0;
        if (!(pricePer500 > 0)) return;
        const singleServingsAmount = ingItem.weight * ratio / mealsPerDay;
        const totalAmount = singleServingsAmount * totalServings;
        if (!(totalAmount > 0)) return;
        const totalAmountWithLoss = totalAmount * (1 + (recipe.cookingLoss || 7) / 100);
        const cost = ((totalAmountWithLoss * pricePer500) / 500);
        totalIngredientCost += cost;
      });
      const ingredientCost = totalIngredientCost;
      const packagingList = Array.isArray(order.foodMakingData && order.foodMakingData.packaging)
        ? order.foodMakingData.packaging
        : [];
      const packagingCost = packagingList.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
      const packagingWeight = packagingList.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0);
      const laborCost = Math.ceil(totalWeight / 4000) * 50;
      const cookingLoss = recipe.cookingLoss || 7;
      const packageTotalWeight = totalWeight * (1 + cookingLoss / 100) + packagingWeight;
      const shippingCost = 23 + ((packageTotalWeight / 1000) - 1) * 13 + 5;
      const subtotal = ingredientCost + packagingCost + laborCost + shippingCost;
      const totalPrice = Math.round(subtotal * 2);
      return Number.isFinite(totalPrice) && totalPrice > 0 ? totalPrice : 0;
    } catch (error) {
      console.warn('estimateFoodMakingPayment error:', error);
      return 0;
    }
  };
  
  const { pageItems, total, totalPages } = paginatedOrders();
  
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="muted" style="text-align:center; padding:20px">暂无订单数据</div>';
    $('orders-total').textContent = '共 0 条';
    $('orders-pageinfo').textContent = '';
    $('orders-prev').disabled = true;
    $('orders-next').disabled = true;
    return;
  }
  
  const orderTypeMap = { recipe_only: '纯食谱定制', food_making: '鲜食制作', both: '食谱+鲜食' };
  const statusMap = {
    pending: '待顾客确认',
    confirmed: '顾客已确认',
    production: '制作完成',
    shipped: '已发货',
    after_sale: '申请售后',
    completed: '已完成'
  };
  
  list.innerHTML = pageItems.map(order => {
    const customer = store.customers.find(c => c.id === order.customerId);
    const petName = customer ? (customer.petName || '') : '';
    const wechat = customer ? (customer.wechat || '') : '';
    let customerLabel = '-';
    if (petName && wechat) {
      customerLabel = `${petName}（${wechat}）`;
    } else if (petName) {
      customerLabel = petName;
    } else if (wechat) {
      customerLabel = wechat;
    }
    const orderType = orderTypeMap[order.orderType] || '-';
    const status = statusMap[order.status] || '-';
    const orderDate = order.orderDate || '-';
    let recipeName = '-';
    if (order.orderType === 'recipe_only') {
      recipeName = order.recipeData && order.recipeData.name ? order.recipeData.name : '-';
    } else if (order.orderType === 'food_making') {
      const recipeId = order.foodMakingData && order.foodMakingData.recipeId;
      const recipe = recipeId ? store.recipes.find(r => r.id === recipeId) : null;
      recipeName = recipe ? (recipe.name || '-') : '-';
    }
    const parseNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : NaN;
    };
    let totalPrice = parseNumber(order.totalSellingPrice);
    if (!(totalPrice > 0)) {
      let fallbackPrice = parseNumber(order.paymentAmount);
      if (!(fallbackPrice > 0)) {
        fallbackPrice = parseNumber(order.orderAmount);
      }
      if (!(fallbackPrice > 0) && order.orderType === 'food_making') {
        fallbackPrice = estimateFoodMakingPayment(order);
      }
      totalPrice = fallbackPrice > 0 ? fallbackPrice : 0;
    }
    const paymentDisplay = Math.round(totalPrice || 0);
    
    return `
      <div class="list-item" data-id="${order.id}">
        <div class="list-item-row" style="grid-template-columns: 1.2fr 1.4fr 1fr 1fr 1.4fr 1fr;">
          <div>${orderDate || '-'}</div>
          <div>${customerLabel}</div>
          <div>${orderType}</div>
          <div>${status}</div>
          <div>${recipeName || '-'}</div>
          <div>¥${paymentDisplay}</div>
        </div>
        <div class="item-actions">
          <button class="btn small" data-detail="${order.id}">详细信息</button>
          <button class="btn small" data-edit="${order.id}">编辑</button>
          <button class="btn small" data-del="${order.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  // 绑定操作按钮（详细信息、编辑、删除）
  list.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      openOrderDetail(btn.dataset.detail);
    });
  });
  
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      openOrderForm(btn.dataset.edit);
    });
  });
  
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('确定要删除这个订单吗？')) {
        const idx = store.orders.findIndex(x => x.id === btn.dataset.del);
        if (idx >= 0) {
          store.orders.splice(idx, 1);
          saveApp();
          renderOrdersList();
        }
      }
    });
  });
  
  $('orders-total').textContent = `共 ${total} 条`;
  $('orders-pageinfo').textContent = `第 ${store.orderPage}/${totalPages} 页`;
  $('orders-prev').disabled = store.orderPage <= 1;
  $('orders-next').disabled = store.orderPage >= totalPages;
}

// 打开订单表单
function openOrderForm(id = null) {
  const card = $('order-form-card');
  const title = $('order-form-title');
  const form = $('order-form');
  
  if (!card || !form) return;

  closeOrderDetail();
  
  // 填充顾客下拉框
  const customerSelect = $('o-customerId');
  const orderNumberField = $('order-number-field');
  if (customerSelect) {
    customerSelect.innerHTML = '<option value="">请选择宠物与主人</option>';
    store.customers.forEach(customer => {
      const option = document.createElement('option');
      option.value = customer.id;
      option.textContent = `${customer.petName || '-'} (${customer.wechat || '-'})`;
      customerSelect.appendChild(option);
    });
  }
  
  let order = null; // 在函数作用域内声明order变量
  if (id) {
    order = store.orders.find(x => x.id === id);
    if (!order) return;
    
    if (title) title.textContent = '编辑订单';
    $('order-id').value = order.id;
    $('o-orderNumber').value = order.orderNumber || '';
    if (orderNumberField) orderNumberField.style.display = order.orderType ? 'block' : 'none';
    // 订单创建日期只读，显示保存的日期
    $('o-orderDate').value = order.orderDate || new Date().toISOString().split('T')[0];
    $('o-orderDate').readOnly = true;
    $('o-customerId').value = order.customerId || '';
    $('o-orderType').value = order.orderType || 'recipe_only';
    $('o-status').value = order.status || 'pending';
    $('o-notes').value = order.notes || '';
    
    // 显示顾客信息
    renderOrderCustomerInfo(order.customerId);
    
    // 根据订单类型显示/隐藏内容
    toggleOrderTypeContent();
    const numberEl = $('o-orderNumber');
    if (numberEl) numberEl.value = order.orderNumber || '';
    
    // 如果是纯食谱定制类型，加载订单中的食谱数据
    if (order.orderType === 'recipe_only') {
      // 加载订单中的食谱数据（如果订单中保存了食谱数据）
      if (order.recipeData) {
        $('or-name').value = order.recipeData.name || '';
        $('or-lifeStage').value = order.recipeData.lifeStage || 'adult';
        $('or-nutritionStandard').value = order.recipeData.nutritionStandard || 'FEDIAF';
        $('or-software').value = order.recipeData.software || 'ADF';
        $('or-recipeType').value = order.recipeData.recipeType || 'standard';
        $('or-code').value = order.recipeData.code || '';
        $('or-cookingLoss').value = order.recipeData.cookingLoss || 7;
        $('or-sellingPrice').value = order.recipeData.sellingPrice || '';
        $('or-protein').value = order.recipeData.protein || '';
        $('or-fat').value = order.recipeData.fat || '';
        $('or-carb').value = order.recipeData.carb || '';
        $('or-fiber').value = order.recipeData.fiber || '';
        $('or-ash').value = order.recipeData.ash || '';
        $('or-moisture').value = order.recipeData.moisture || '';
        $('or-caPratio').value = order.recipeData.caPratio || '';
        $('or-totalKcal').value = order.recipeData.totalKcal || '';
        $('or-totalWeight').value = order.recipeData.totalWeight || '';
        $('or-kcalDensity').value = order.recipeData.kcalDensity || '';
        
        currentOrderRecipeIngredients = Array.isArray(order.recipeData.ingredients) ? [...order.recipeData.ingredients] : [];
        currentOrderRecipeCookingSteps = Array.isArray(order.recipeData.cookingSteps) ? [...order.recipeData.cookingSteps] : [];
      } else {
        // 如果没有保存的食谱数据，初始化空数据
        currentOrderRecipeIngredients = [];
        currentOrderRecipeCookingSteps = [];
      }
      
      renderOrderRecipeIngredientsList();
      renderOrderRecipeCookingSteps();
    } else if (order.orderType === 'food_making') {
      // 如果是鲜食制作类型，加载订单数据
      // 先填充食谱下拉框，然后再设置值
      populateFoodMakingRecipeSelect();
      
      // 延迟设置值，确保下拉框已填充
      setTimeout(() => {
        if (order.foodMakingData) {
          $('ofm-recipe-select').value = order.foodMakingData.recipeId || '';
          $('ofm-days').value = order.foodMakingData.days || 1;
          currentFoodMakingRecipeId = order.foodMakingData.recipeId;
          currentFoodMakingDays = order.foodMakingData.days || 1;
        } else {
          $('ofm-recipe-select').value = '';
          $('ofm-days').value = 1;
          currentFoodMakingRecipeId = null;
          currentFoodMakingDays = 1;
        }
        
        // 保存订单的日期信息，以便在calculateFoodMakingIngredients后恢复
        const savedProductionDate = order.productionDate || null;
        const savedShippingDate = order.shippingDate || null;
        
        // 加载包装清单、快递费用和优惠折扣
        if (order.foodMakingData) {
          currentFoodMakingPackaging = Array.isArray(order.foodMakingData.packaging) ? [...order.foodMakingData.packaging] : [];
          currentFoodMakingShippingType = order.foodMakingData.shippingType || 'remote';
          const savedManualPrice = order.foodMakingData.manualOrderTotalPrice;
          const hasManualFlag = order.foodMakingData.isManualPrice;
          if ((hasManualFlag || (typeof hasManualFlag === 'undefined' && savedManualPrice != null && savedManualPrice !== '')) && savedManualPrice != null && savedManualPrice !== '') {
            const parsedManualPrice = Number(savedManualPrice);
            manualFoodMakingOrderPrice = Number.isFinite(parsedManualPrice) ? Math.round(parsedManualPrice) : null;
          } else {
            manualFoodMakingOrderPrice = null;
          }
          const savedAutoPrice = order.foodMakingData.autoOrderTotalPrice;
          const parsedAutoPrice = Number(savedAutoPrice);
          latestFoodMakingAutoPrice = Number.isFinite(parsedAutoPrice) ? Math.round(parsedAutoPrice) : 0;
        } else {
          currentFoodMakingPackaging = [];
          currentFoodMakingShippingType = 'remote';
          manualFoodMakingOrderPrice = null;
          latestFoodMakingAutoPrice = 0;
        }
        
        // 重新计算并显示
        calculateFoodMakingIngredients();
        // 确保日期字段、快递费用和优惠折扣已加载（因为calculateFoodMakingIngredients会重新生成HTML）
        setTimeout(() => {
          const productionDateInput = document.getElementById('ofm-production-date');
          const shippingDateInput = document.getElementById('ofm-shipping-date');
          
          // 快递费用现在由系统自动计算，不需要加载额外数据
          
          if (productionDateInput && shippingDateInput) {
            // 优先使用保存的日期
            if (savedProductionDate) {
              productionDateInput.value = savedProductionDate;
            } else {
              // 如果没有保存的日期，设置默认值：订单创建日期的第二天
              const orderDate = order.orderDate || $('o-orderDate').value;
              if (orderDate) {
                // 使用本地时区避免时区问题
                const [year, month, day] = orderDate.split('-').map(Number);
                const orderDateObj = new Date(year, month - 1, day);
                orderDateObj.setDate(orderDateObj.getDate() + 1);
                const productionDate = `${orderDateObj.getFullYear()}-${String(orderDateObj.getMonth() + 1).padStart(2, '0')}-${String(orderDateObj.getDate()).padStart(2, '0')}`;
                productionDateInput.value = productionDate;
              }
            }
            
            if (savedShippingDate) {
              shippingDateInput.value = savedShippingDate;
            } else {
              // 如果没有保存的日期，根据制作日期设置默认值
              if (productionDateInput.value) {
                const [pYear, pMonth, pDay] = productionDateInput.value.split('-').map(Number);
                const productionDateObj = new Date(pYear, pMonth - 1, pDay);
                productionDateObj.setDate(productionDateObj.getDate() + 1);
                const shippingDate = `${productionDateObj.getFullYear()}-${String(productionDateObj.getMonth() + 1).padStart(2, '0')}-${String(productionDateObj.getDate()).padStart(2, '0')}`;
                shippingDateInput.value = shippingDate;
              }
            }
          }
          
          // 重新计算订单总价（因为快递费用和优惠折扣已加载）
          updateFoodMakingOrderTotalPrice();
        }, 200);
      }, 50);
    }
  } else {
    if (title) title.textContent = '新增订单';
    form.reset();
    $('order-id').value = '';
    if (orderNumberField) orderNumberField.style.display = 'none';
    // 订单创建日期自动设置为当前日期，且不可修改
    const today = new Date().toISOString().split('T')[0];
    $('o-orderDate').value = today;
    $('o-orderDate').readOnly = true;
    $('o-orderType').value = '';
    $('o-status').value = 'pending';
    $('o-notes').value = '';
    
    // 隐藏顾客信息
    renderOrderCustomerInfo('');
    
    // 隐藏所有类型的内容
    toggleOrderTypeContent();
    
    // 初始化纯食谱定制类型的数据
    currentOrderRecipeIngredients = [];
    currentOrderRecipeCookingSteps = [];
    editingOrderRecipeIngredientIndex = null;
    selectedOrderRecipeIngredientId = null;
    
    renderOrderRecipeIngredientsList();
    renderOrderRecipeCookingSteps();
    
    // 初始化鲜食制作类型的数据
    currentFoodMakingRecipeId = null;
    currentFoodMakingDays = 1;
    currentFoodMakingPackaging = [];
    currentFoodMakingShippingType = 'remote';
    manualFoodMakingOrderPrice = null;
    latestFoodMakingAutoPrice = 0;
    $('ofm-recipe-select').value = '';
    $('ofm-days').value = 1;
    $('ofm-recipe-info').style.display = 'none';
    $('ofm-ingredients-summary').style.display = 'none';
    
    // 如果订单类型是纯食谱定制，自动生成食谱编号
    if ($('o-orderType').value === 'recipe_only') {
      autoGenerateOrderRecipeCode();
    }
    
    // 填充鲜食制作的食谱下拉框（新增订单时）
    populateFoodMakingRecipeSelect();
  }
  
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// 设置订单模块
function setupOrdersModule() {
  const newBtn = $('btn-new-order');
  if (newBtn) newBtn.addEventListener('click', () => openOrderForm());
  
  const cancelBtn = $('btn-cancel-order');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const card = $('order-form-card');
      if (card) card.style.display = 'none';
    });
  }

  const closeDetailBtn = $('btn-close-order-detail');
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener('click', closeOrderDetail);
  }
  
  // 添加食谱到订单
  const addRecipeBtn = $('btn-add-recipe-to-order');
  if (addRecipeBtn) {
    addRecipeBtn.addEventListener('click', () => {
      const recipeSelect = $('o-recipe-select');
      const recipeId = recipeSelect ? recipeSelect.value : '';
      
      if (!recipeId) {
        alert('请先选择食谱');
        return;
      }
      
      const recipe = store.recipes.find(r => r.id === recipeId);
      if (!recipe) {
        alert('食谱不存在');
        return;
      }
      
      // 检查是否已添加
      const exists = currentOrderRecipes.find(r => r.recipeId === recipeId);
      if (exists) {
        exists.servings = (exists.servings || 1) + 1;
      } else {
        currentOrderRecipes.push({
          recipeId: recipeId,
          servings: 1
        });
      }
      
      renderOrderRecipesList();
      calculateOrderTotals();
      
      // 清空选择
      if (recipeSelect) recipeSelect.value = '';
    });
  }
  
  // 顾客选择变化时的处理
  const customerSelect = $('o-customerId');
  if (customerSelect) {
    customerSelect.addEventListener('change', () => {
      const customerId = customerSelect.value;
      const orderType = $('o-orderType').value;
      
      // 显示顾客信息
      renderOrderCustomerInfo(customerId);
      
      // 根据订单类型进行不同的计算
      if (orderType === 'food_making') {
        calculateFoodMakingIngredients();
      } else if (orderType === 'recipe_only') {
        // 纯食谱定制类型可能不需要在这里计算
        // calculateOrderTotals(); // 如果将来需要可以启用
      }
    });
  }
  
  // 成本字段变化时重新计算总售价（仅对需要成本计算的订单类型）
  ['o-packagingCost', 'o-laborCost', 'o-shippingCost'].forEach(fieldId => {
    const fieldEl = $(fieldId);
    if (fieldEl) {
      fieldEl.addEventListener('input', () => {
        const orderType = $('o-orderType').value;
        // 这些字段可能只在某些订单类型中使用
        // calculateOrderTotals(); // 如果将来需要可以启用
      });
    }
  });
  
  // 订单类型变化时切换显示内容并重新生成编号
  const orderTypeEl = $('o-orderType');
  if (orderTypeEl) {
    orderTypeEl.addEventListener('change', () => {
      toggleOrderTypeContent();
      if (!$('order-id').value) {
        autoGenerateOrderNumber();
      }
      
      // 如果切换到鲜食制作类型，填充食谱下拉框
      if (orderTypeEl.value === 'food_making') {
        if (!$('order-id').value) {
          currentFoodMakingShippingType = 'remote';
          manualFoodMakingOrderPrice = null;
          latestFoodMakingAutoPrice = 0;
        }
        populateFoodMakingRecipeSelect();
        // 延迟设置日期默认值，确保DOM已更新
        setTimeout(() => {
          const productionDateInput = document.getElementById('ofm-production-date');
          const shippingDateInput = document.getElementById('ofm-shipping-date');
          const orderDate = $('o-orderDate').value;
          
          if (orderDate && productionDateInput && shippingDateInput) {
            // 如果制作日期为空，设置默认值
            if (!productionDateInput.value) {
              const orderDateObj = new Date(orderDate + 'T00:00:00');
              orderDateObj.setDate(orderDateObj.getDate() + 1);
              productionDateInput.value = orderDateObj.toISOString().split('T')[0];
            }
            
            // 如果发货日期为空，根据制作日期设置默认值
            if (!shippingDateInput.value && productionDateInput.value) {
              const productionDateObj = new Date(productionDateInput.value + 'T00:00:00');
              productionDateObj.setDate(productionDateObj.getDate() + 1);
              shippingDateInput.value = productionDateObj.toISOString().split('T')[0];
            }
          }
        }, 300);
      }
      
    });
  }

  const orderFormCard = $('order-form-card');
  if (orderFormCard && !orderFormCard.dataset.costHandlers) {
    orderFormCard.addEventListener('change', (event) => {
      const target = event.target;
      if (target && target.id === 'ofm-shipping-type') {
        handleFoodMakingShippingChange(target.value);
      }
    });
    orderFormCard.addEventListener('click', (event) => {
      const editBtn = event.target && event.target.closest ? event.target.closest('#ofm-price-edit') : null;
      if (editBtn) {
        event.preventDefault();
        openFoodMakingManualPriceEditor();
        return;
      }
      const confirmBtn = event.target && event.target.closest ? event.target.closest('#ofm-price-confirm') : null;
      if (confirmBtn) {
        event.preventDefault();
        confirmFoodMakingManualPrice();
        return;
      }
      const resetBtn = event.target && event.target.closest ? event.target.closest('#ofm-price-reset') : null;
      if (resetBtn) {
        event.preventDefault();
        resetFoodMakingManualPrice();
      }
    });
    orderFormCard.dataset.costHandlers = 'true';
  }
  
  // 订单创建日期现在是只读的，不需要监听变化事件
  // 但我们需要在订单类型变化时，如果是鲜食制作类型，自动设置制作日期和发货日期
  
  // ========== 订单中食谱录入的事件监听器（纯食谱定制类型） ==========
  
  // 原料搜索
  const orderRecipeIngredientSearch = $('or-ingredient-search');
  if (orderRecipeIngredientSearch) {
    orderRecipeIngredientSearch.addEventListener('input', (e) => {
      searchIngredientsForOrderRecipe(e.target.value);
    });
    
    // 点击外部时隐藏搜索结果
    document.addEventListener('click', (e) => {
      if (!orderRecipeIngredientSearch.contains(e.target)) {
        const resultsEl = $('or-ingredient-search-results');
        if (resultsEl && !resultsEl.contains(e.target)) {
          resultsEl.style.display = 'none';
        }
      }
    });
  }
  
  // 添加食材到订单中的食谱
  const addIngredientToOrderRecipeBtn = $('btn-add-ingredient-to-order-recipe');
  if (addIngredientToOrderRecipeBtn) {
    addIngredientToOrderRecipeBtn.addEventListener('click', () => {
      addIngredientToOrderRecipe();
    });
  }
  
  // 食材重量输入框回车事件
  const orderRecipeIngredientWeight = $('or-ingredient-weight');
  if (orderRecipeIngredientWeight) {
    orderRecipeIngredientWeight.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addIngredientToOrderRecipe();
      }
    });
  }
  
  // 总热量变化时重新计算热量密度
  const orderRecipeTotalKcal = $('or-totalKcal');
  if (orderRecipeTotalKcal) {
    orderRecipeTotalKcal.addEventListener('input', () => {
      calculateOrderRecipeKcalDensity();
    });
  }
  // 适用生命阶段、营养参考标准、食谱类型变化时重新生成食谱编号
  ['or-lifeStage', 'or-nutritionStandard', 'or-recipeType'].forEach(fieldId => {
    const fieldEl = $(fieldId);
    if (fieldEl) {
      fieldEl.addEventListener('change', () => {
        autoGenerateOrderRecipeCode();
      });
    }
  });
  
  // 添加制作步骤按钮
  const addCookingStepToOrderRecipeBtn = $('btn-add-cooking-step-to-order-recipe');
  if (addCookingStepToOrderRecipeBtn) {
    addCookingStepToOrderRecipeBtn.addEventListener('click', () => {
      addCookingStepToOrderRecipe();
    });
  }
  
  // ========== 鲜食制作类型的事件监听器 ==========
  
  // 填充鲜食制作的食谱下拉框
  populateFoodMakingRecipeSelect();
  
  // 食谱选择变化时重新计算
  const foodMakingRecipeSelect = $('ofm-recipe-select');
  if (foodMakingRecipeSelect) {
    foodMakingRecipeSelect.addEventListener('change', () => {
      calculateFoodMakingIngredients();
    });
  }
  
  // 制作天数变化时重新计算
  const foodMakingDaysInput = $('ofm-days');
  if (foodMakingDaysInput) {
    foodMakingDaysInput.addEventListener('input', () => {
      calculateFoodMakingIngredients();
    });
    
    foodMakingDaysInput.addEventListener('change', () => {
      calculateFoodMakingIngredients();
    });
  }
  
  // 搜索和筛选
  const searchEl = $('order-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      store.orderPage = 1;
      renderOrdersList();
    });
  }
  
  const statusFilterEl = $('order-status-filter');
  if (statusFilterEl) {
    statusFilterEl.addEventListener('change', () => {
      store.orderPage = 1;
      renderOrdersList();
    });
  }
  
  // 分页
  const prevBtn = $('orders-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (store.orderPage > 1) {
        store.orderPage--;
        renderOrdersList();
      }
    });
  }
  
  const nextBtn = $('orders-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const { totalPages } = paginatedOrders();
      if (store.orderPage < totalPages) {
        store.orderPage++;
        renderOrdersList();
      }
    });
  }
  
  // 表单提交
  const form = $('order-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('订单表单提交事件触发');
      
      const id = $('order-id').value || genId();
      const customerId = $('o-customerId').value;
      const orderType = $('o-orderType').value;
      
      console.log('订单表单数据:', { id, customerId, orderType });
      
      if (!orderType) {
        alert('请选择订单类型');
        return;
      }
      
      if (!customerId) {
        alert('请选择顾客');
        return;
      }
      
      // 对于"纯食谱定制"类型，验证必填字段
      if (orderType === 'recipe_only') {
        const recipeNameField = $('or-name');
        if (recipeNameField && !recipeNameField.value.trim()) {
          alert('请填写食谱名称');
          recipeNameField.focus();
          return;
        }
        const cookingLossField = $('or-cookingLoss');
        if (cookingLossField && !cookingLossField.value) {
          alert('请填写制作损耗');
          cookingLossField.focus();
          return;
        }
      }
      
      // 确保订单创建日期有值
      let orderDate = $('o-orderDate').value;
      if (!orderDate) {
        orderDate = new Date().toISOString().split('T')[0];
        $('o-orderDate').value = orderDate;
      }
      
      // 自动生成订单编号
      autoGenerateOrderNumber();
      const orderNumber = $('o-orderNumber').value.trim();
      
      console.log('订单编号:', orderNumber);
      
      if (!orderNumber) {
        alert('订单编号生成失败，请检查订单类型和日期');
        return;
      }
      
      const record = {
        id,
        orderNumber,
        orderDate: $('o-orderDate').value || new Date().toISOString().split('T')[0],
        status: $('o-status').value || 'pending',
        customerId,
        orderType: orderType,
        parentOrderId: null,
        childOrders: [],
        splitInfo: {
          isSplit: false,
          isAutoSplit: false,
          splitMethod: null
        },
        productionDate: null,
        notes: $('o-notes').value.trim(),
        confirmedAt: null,
        updatedAt: Date.now()
      };
      
      let computedPaymentAmount = 0;
      
      // 根据订单类型保存不同的数据
      if (orderType === 'recipe_only') {
        // 纯食谱定制类型：保存订单中的食谱数据
        if (!currentOrderRecipeIngredients || currentOrderRecipeIngredients.length === 0) {
          alert('请至少添加一个食材');
          return;
        }
        
        // 重新计算总重量
        calculateOrderRecipeTotalWeight();
        
        // 自动生成食谱编号（如果还没有）
        if (!$('or-code').value) {
          autoGenerateOrderRecipeCode();
        }
        
        record.recipeData = {
          name: $('or-name').value.trim(),
          lifeStage: $('or-lifeStage').value || 'adult',
          nutritionStandard: $('or-nutritionStandard').value || 'FEDIAF',
          software: $('or-software').value || 'ADF',
          recipeType: $('or-recipeType').value || 'standard',
          code: $('or-code').value.trim(),
          cookingLoss: parseFloat($('or-cookingLoss').value) || 7,
          sellingPrice: parseFloat($('or-sellingPrice').value) || null,
          protein: parseFloat($('or-protein').value) || null,
          fat: parseFloat($('or-fat').value) || null,
          carb: parseFloat($('or-carb').value) || null,
          fiber: parseFloat($('or-fiber').value) || null,
          ash: parseFloat($('or-ash').value) || null,
          moisture: parseFloat($('or-moisture').value) || null,
          caPratio: $('or-caPratio').value.trim() || null,
          totalKcal: parseFloat($('or-totalKcal').value) || null,
          totalWeight: parseFloat($('or-totalWeight').value) || 0,
          kcalDensity: parseFloat($('or-kcalDensity').value) || null,
          ingredients: currentOrderRecipeIngredients.map(item => ({
            ingredientId: item.ingredientId,
            weight: item.weight,
            unit: item.unit
          })),
          cookingSteps: currentOrderRecipeCookingSteps.filter(step => step && step.trim())
        };
        
        record.orderAmount = null;
      } else if (orderType === 'food_making') {
        // 鲜食制作类型：保存选择的食谱和制作天数
        const recipeId = $('ofm-recipe-select').value;
        const days = parseInt($('ofm-days').value) || 1;
        
        if (!recipeId) {
          alert('请选择食谱');
          return;
        }
        
        if (days <= 0) {
          alert('制作天数必须大于0');
          return;
        }
        
        record.foodMakingData = {
          recipeId: recipeId,
          days: days,
          packaging: currentFoodMakingPackaging || [],
          shippingCost: parseFloat(document.getElementById('ofm-shipping-cost')?.textContent?.replace('¥', '') || document.getElementById('ofm-shipping-cost')?.value || '0') || 0,
          shippingType: (document.getElementById('ofm-shipping-type')?.value) || currentFoodMakingShippingType || 'remote',
          discount: 100,
          paymentAmount: null,
          manualOrderTotalPrice: manualFoodMakingOrderPrice != null ? manualFoodMakingOrderPrice : null,
          autoOrderTotalPrice: latestFoodMakingAutoPrice || null,
          isManualPrice: manualFoodMakingOrderPrice != null
        };
        
        // 保存制作日期和发货日期
        const productionDateInput = document.getElementById('ofm-production-date');
        const shippingDateInput = document.getElementById('ofm-shipping-date');
        if (productionDateInput && productionDateInput.value) {
          record.productionDate = productionDateInput.value;
        }
        if (shippingDateInput && shippingDateInput.value) {
          record.shippingDate = shippingDateInput.value;
        }
        
        // 重新计算确保数据是最新的，并获取总重量
        // 先获取顾客和食谱信息用于计算
        const customer = store.customers.find(c => c.id === customerId);
        const recipe = store.recipes.find(r => r.id === recipeId);
        if (customer && recipe) {
          const estKcal = customer.estKcal || 0;
          const recipeTotalKcal = recipe.totalKcal || 0;
          const ratio = (estKcal > 0 && recipeTotalKcal > 0) ? (estKcal / recipeTotalKcal) : 0;
          const mealsPerDay = customer.mealsPerDay || 1;
          const totalServings = mealsPerDay * days;
          const servingWeight = ratio > 0 ? ((recipe.totalWeight || 0) * ratio / mealsPerDay) : 0;
          const totalWeight = servingWeight * totalServings;
          record.totalWeight = totalWeight;
        } else {
          record.totalWeight = 0;
        }
        const orderTotalPriceEl = document.getElementById('ofm-order-total-price');
        if (orderTotalPriceEl) {
          const totalPriceText = orderTotalPriceEl.textContent.replace(/[^0-9.\-]/g, '').trim();
          const parsedPrice = parseFloat(totalPriceText);
          if (!Number.isNaN(parsedPrice)) {
            computedPaymentAmount = parsedPrice;
          }
        }
      } else if (orderType === 'both') {
        // 食谱定制+鲜食制作类型：后续实现
        alert('食谱定制+鲜食制作类型的功能待实现');
        return;
      }
      if (computedPaymentAmount <= 0) {
        const existingOrder = store.orders.find(o => o.id === id);
        if (existingOrder) {
          const prevPayment = existingOrder.paymentAmount != null ? Number(existingOrder.paymentAmount) : null;
          const prevTotal = existingOrder.totalSellingPrice != null ? Number(existingOrder.totalSellingPrice) : null;
          if (prevPayment && prevPayment > 0) {
            computedPaymentAmount = prevPayment;
          } else if (prevTotal && prevTotal > 0) {
            computedPaymentAmount = prevTotal;
          }
        }
      }
      record.paymentAmount = computedPaymentAmount;
      record.totalSellingPrice = computedPaymentAmount;
      if (record.foodMakingData) {
        record.foodMakingData.paymentAmount = computedPaymentAmount;
      }
      if (record.foodMakingData) {
        record.foodMakingData.paymentAmount = computedPaymentAmount;
      }
      
      const existsIdx = store.orders.findIndex(x => x.id === id);
      if (existsIdx >= 0) {
        record.createdAt = store.orders[existsIdx].createdAt;
        store.orders.splice(existsIdx, 1, record);
      } else {
        record.createdAt = Date.now();
        store.orders.unshift(record);
      }
      
      saveApp();
      const card = $('order-form-card');
      if (card) card.style.display = 'none';
      renderOrdersList();
    });
  }
  
  // 生成报价单按钮
  const generateQuotationBtn = $('btn-generate-quotation');
  if (generateQuotationBtn) {
    generateQuotationBtn.addEventListener('click', () => {
      // TODO: 实现报价单生成功能
      alert('报价单生成功能待实现');
    });
  }
  
  // 初始渲染
  renderOrdersList();
}

// 更新认证 UI
function updateAuthUI() {
  const statusEl = $('auth-status');
  const loginBtn = $('btn-open-login');
  const logoutBtn = $('btn-logout');
  
  if (backendState.token && backendState.user) {
    if (statusEl) {
      const roleMap = { admin: '管理员', employee: '员工', customer: '顾客' };
      statusEl.textContent = `已登录:${roleMap[backendState.user.role] || backendState.user.role}`;
    }
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    
    // 如果当前在品种管理视图，重新加载数据
    const breedsView = $('view-breeds');
    if (breedsView && breedsView.style.display !== 'none') {
      setTimeout(async () => {
        await loadBreeds();
        await loadBreedCategories();
        renderBreedsList();
      }, 100);
    }
    return;
  }
  if (statusEl) statusEl.textContent = '未登录';
  if (loginBtn) loginBtn.style.display = 'inline-flex';
  if (logoutBtn) logoutBtn.style.display = 'none';
}

// 品种管理状态
let breedsState = {
  breeds: [],
  categories: [],
  page: 1,
  pageSize: 10,
  total: 0
};

// 加载品种列表
async function loadBreeds() {
  if (!backendState.token) {
    breedsState.breeds = [];
    breedsState.total = 0;
    return;
  }
  
  try {
    const params = new URLSearchParams({
      page: breedsState.page,
      pageSize: breedsState.pageSize
    });
    
    const search = $('breed-search')?.value.trim();
    if (search) params.append('search', search);
    
    const category = $('breed-category-filter')?.value;
    if (category) params.append('category', category);
    
    const sizeCategory = $('breed-size-filter')?.value;
    if (sizeCategory) params.append('sizeCategory', sizeCategory);
    
    const response = await backendRequest(`/api/v1/breeds?${params.toString()}`);
    
    // 后端返回格式：{ success: true, data: [...] }
    // backendRequest 返回整个响应对象
    let breedsArray = [];
    if (response && response.data && Array.isArray(response.data)) {
      breedsArray = response.data;
    } else if (Array.isArray(response)) {
      // 如果直接是数组（兼容处理）
      breedsArray = response;
    } else {
      console.warn('无法解析品种数据格式:', response);
      breedsArray = [];
    }
    
    breedsState.breeds = breedsArray;
    breedsState.total = breedsArray.length;
  } catch (error) {
    console.error('Load breeds failed:', error);
    breedsState.breeds = [];
    breedsState.total = 0;
  }
}

// 加载品种分类
async function loadBreedCategories() {
  if (!backendState.token) return;
  
  try {
    const response = await backendRequest('/api/v1/breeds/categories');
    breedsState.categories = Array.isArray(response?.data) ? response.data : [];
    
    const filterEl = $('breed-category-filter');
    if (filterEl) {
      const currentValue = filterEl.value;
      filterEl.innerHTML = '<option value="">全部分类</option>';
      breedsState.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category;
        option.textContent = cat.category;
        filterEl.appendChild(option);
      });
      if (currentValue) filterEl.value = currentValue;
    }
  } catch (error) {
    console.error('Load breed categories failed:', error);
    breedsState.categories = [];
  }
}

// 渲染品种列表
function renderBreedsList() {
  const listEl = $('breeds-list');
  if (!listEl) return;
  
  if (breedsState.breeds.length === 0) {
    listEl.innerHTML = '<div class="list-empty">暂无品种数据</div>';
    const totalEl = $('breeds-total');
    if (totalEl) totalEl.textContent = '共 0 条';
    const pageInfoEl = $('breeds-pageinfo');
    if (pageInfoEl) pageInfoEl.textContent = '';
    return;
  }
  
  const sizeCategoryMap = {
    small: '小型',
    medium: '中型',
    large: '大型',
    xlarge: '超大型'
  };
  
  listEl.innerHTML = breedsState.breeds.map(breed => {
    const weightRange = breed.weightMin && breed.weightMax
      ? `${breed.weightMin}-${breed.weightMax}`
      : breed.weightMin
      ? `≥${breed.weightMin}`
      : breed.weightMax
      ? `≤${breed.weightMax}`
      : '-';
    
    return `
      <div class="list-item" style="display: grid; grid-template-columns: 1.5fr 1fr 0.8fr 1fr 1fr 1.2fr; gap: 12px; align-items: center;">
        <div>${escapeHtml(breed.category || '-')}</div>
        <div>${escapeHtml(breed.name || '-')}</div>
        <div>${sizeCategoryMap[breed.sizeCategory] || '-'}</div>
        <div>${weightRange}</div>
        <div>${breed.maturityMonths ? breed.maturityMonths + '个月' : '-'}</div>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btn small" onclick="editBreed(${breed.id})">编辑</button>
          <button class="btn small ghost" onclick="deleteBreed(${breed.id})">删除</button>
        </div>
      </div>
    `;
  }).join('');
  
  const totalEl = $('breeds-total');
  if (totalEl) totalEl.textContent = `共 ${breedsState.total} 条`;
  
  const totalPages = Math.ceil(breedsState.total / breedsState.pageSize);
  const pageInfoEl = $('breeds-pageinfo');
  if (pageInfoEl) pageInfoEl.textContent = `第 ${breedsState.page} / ${totalPages} 页`;
}

// 编辑品种
async function editBreed(breedId) {
  try {
    const breed = await backendRequest(`/api/v1/breeds/${breedId}`);
    if (!breed || !breed.data) {
      alert('未找到该品种信息');
      return;
    }
    
    const breedData = breed.data;
    $('breed-id').value = breedData.id;
    $('breed-form-title').textContent = '编辑品种';
    $('b-category').value = breedData.category || '';
    $('b-name').value = breedData.name || '';
    $('b-sizeCategory').value = breedData.sizeCategory || '';
    $('b-weightMin').value = breedData.weightMin || '';
    $('b-weightMax').value = breedData.weightMax || '';
    $('b-maturityMonths').value = breedData.maturityMonths || '';
    
    const formCard = $('breed-form-card');
    if (formCard) {
      formCard.style.display = 'block';
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    console.error('Load breed failed:', error);
    alert('加载品种信息失败：' + error.message);
  }
}

// 删除品种
async function deleteBreed(breedId) {
  if (!confirm('确定要删除这个品种吗？')) return;
  
  try {
    await backendRequest(`/api/v1/breeds/${breedId}`, { method: 'DELETE' });
    await loadBreeds();
    renderBreedsList();
  } catch (error) {
    console.error('Delete breed failed:', error);
    alert('删除失败：' + error.message);
  }
}

// 设置品种管理模块
function setupBreedsModule() {
  // 搜索和筛选
  const searchEl = $('breed-search');
  if (searchEl) {
    searchEl.addEventListener('input', async () => {
      breedsState.page = 1;
      await loadBreeds();
      renderBreedsList();
    });
  }
  
  const categoryFilterEl = $('breed-category-filter');
  if (categoryFilterEl) {
    categoryFilterEl.addEventListener('change', async () => {
      breedsState.page = 1;
      await loadBreeds();
      renderBreedsList();
    });
  }
  
  const sizeFilterEl = $('breed-size-filter');
  if (sizeFilterEl) {
    sizeFilterEl.addEventListener('change', async () => {
      breedsState.page = 1;
      await loadBreeds();
      renderBreedsList();
    });
  }
  
  // 新增按钮
  const newBtn = $('btn-new-breed');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      $('breed-id').value = '';
      $('breed-form-title').textContent = '新增品种';
      $('breed-form').reset();
      const formCard = $('breed-form-card');
      if (formCard) {
        formCard.style.display = 'block';
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
  
  // 取消按钮
  const cancelBtn = $('breed-form-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const formCard = $('breed-form-card');
      if (formCard) formCard.style.display = 'none';
    });
  }
  
  // 表单提交
  const formEl = $('breed-form');
  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const breedId = $('breed-id').value;
      const payload = {
        category: $('b-category').value.trim(),
        name: $('b-name').value.trim(),
        sizeCategory: $('b-sizeCategory').value,
        weightMin: $('b-weightMin').value ? parseFloat($('b-weightMin').value) : null,
        weightMax: $('b-weightMax').value ? parseFloat($('b-weightMax').value) : null,
        maturityMonths: $('b-maturityMonths').value ? parseInt($('b-maturityMonths').value, 10) : null
      };
      
      try {
        if (breedId) {
          await backendRequest(`/api/v1/breeds/${breedId}`, {
            method: 'PUT',
            body: payload
          });
        } else {
          await backendRequest('/api/v1/breeds', {
            method: 'POST',
            body: payload
          });
        }
        
        const formCard = $('breed-form-card');
        if (formCard) formCard.style.display = 'none';
        
        await loadBreeds();
        renderBreedsList();
      } catch (error) {
        console.error('Save breed failed:', error);
        alert('保存失败：' + error.message);
      }
    });
  }
  
  // 分页
  const prevBtn = $('breeds-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', async () => {
      if (breedsState.page > 1) {
        breedsState.page--;
        await loadBreeds();
        renderBreedsList();
      }
    });
  }
  
  const nextBtn = $('breeds-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      const totalPages = Math.ceil(breedsState.total / breedsState.pageSize);
      if (breedsState.page < totalPages) {
        breedsState.page++;
        await loadBreeds();
        renderBreedsList();
      }
    });
  }
  
  // 视图切换时加载数据
  const breedsView = $('view-breeds');
  if (breedsView) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const isVisible = breedsView.style.display !== 'none';
          if (isVisible && backendState.token) {
            setTimeout(async () => {
              await loadBreeds();
              await loadBreedCategories();
              renderBreedsList();
            }, 100);
          }
        }
      });
    });
    observer.observe(breedsView, { attributes: true, attributeFilter: ['style'] });
  }
}

// 暴露给全局
window.editBreed = editBreed;
window.deleteBreed = deleteBreed;

function setupSettingsModule() {
  // 导出数据
  const exportBtn = $('btn-export-json');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = {
        customers: store.customers,
        ingredients: store.ingredients,
        recipes: store.recipes,
        orders: store.orders,
        exportedAt: new Date().toISOString()
      };
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pet-food-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('数据已导出！');
    });
  }
  
  // 导入数据
  const importInput = $('import-json');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.customers || data.ingredients) {
            if (confirm('导入数据将覆盖现有数据，是否继续？\n注意：导入前会自动备份当前数据。')) {
              // 导入前先备份当前数据
              const currentData = {
                customers: store.customers,
                ingredients: store.ingredients,
                recipes: store.recipes,
                orders: store.orders
              };
              createBackup(currentData);
              
              if (data.customers && Array.isArray(data.customers)) {
                store.customers = data.customers;
              }
              if (data.ingredients && Array.isArray(data.ingredients)) {
                store.ingredients = data.ingredients;
              }
              if (data.recipes && Array.isArray(data.recipes)) {
                store.recipes = data.recipes;
              }
              if (data.orders && Array.isArray(data.orders)) {
                store.orders = data.orders;
              }
              saveAppWithoutBackup(); // 导入时不创建备份（因为已经在上面备份了）
              renderCustomersList();
              renderIngredientsList();
              renderRecipesList();
              renderBackupsList(); // 刷新备份列表
              alert('导入成功！已自动备份原数据。');
            }
          } else {
            alert('文件格式不正确');
          }
        } catch (error) {
          alert('导入失败：' + error.message);
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }
  
  // 清除缓存
  const clearCacheBtn = $('btn-clear-cache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      if (confirm('确定要清除所有缓存吗？这将不会删除localStorage中的数据。')) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          alert('缓存已清除！');
        } catch (error) {
          alert('清除缓存失败：' + error.message);
        }
      }
    });
  }
  
  // 取消注册Service Worker
  const unregisterBtn = $('btn-unregister-sw');
  if (unregisterBtn) {
    unregisterBtn.addEventListener('click', async () => {
      if (confirm('确定要取消注册Service Worker吗？这将清除所有缓存。')) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          alert('Service Worker已取消注册，请刷新页面！');
          setTimeout(() => location.reload(), 1000);
        } catch (error) {
          alert('操作失败：' + error.message);
        }
      }
    });
  }
  
  // 更新调试信息
  const updateDebugInfo = () => {
    const debugEl = $('debug-info');
    if (debugEl) {
      const info = {
        'localStorage键': Object.keys(localStorage).filter(k => k.startsWith('pff-')).join(', ') || '无',
        '顾客数量': store.customers.length,
        '原料数量': store.ingredients.length,
        '食谱数量': store.recipes.length,
        '订单数量': store.orders.length,
        'Service Worker': navigator.serviceWorker.controller ? '已注册' : '未注册'
      };
      debugEl.innerHTML = Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('<br>');
    }
  };
  
  // 定期更新调试信息
  setInterval(updateDebugInfo, 1000);
  updateDebugInfo();
  
  // 初始渲染备份列表
  renderBackupsList();
}
function init() {
  console.log('App init');
  console.log('检查localStorage中的键:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pff-')) {
      console.log('- ' + key + ':', localStorage.getItem(key) ? '有数据' : '无数据');
    }
  }
  
  loadApp();
  loadBackendAuth();
  console.log('初始化后 - 顾客数据:', store.customers.length, '条');
  console.log('初始化后 - 原料数据:', store.ingredients.length, '条');
  console.log('初始化后 - 食谱数据:', store.recipes.length, '条');
  console.log('初始化后 - 订单数据:', store.orders.length, '条');
  
  setupNav();
  setupPWA();
  setupCustomersModule();
  setupIngredientsModule();
  setupRecipesModule();
  setupOrdersModule();
  setupBreedsModule();
  setupSettingsModule();
  updateAuthUI();
  renderCustomersList();
  switchView('customers');
  const printBtn = $('btn-print'); if (printBtn) printBtn.addEventListener('click', () => window.print());
  
  // 登录按钮
  const loginBtn = $('btn-open-login');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const email = prompt('请输入邮箱:');
      if (!email) return;
      const password = prompt('请输入密码:');
      if (!password) return;
      backendLogin(email, password).then(() => {
        alert('登录成功！');
      }).catch(err => {
        alert('登录失败：' + err.message);
      });
    });
  }
  
  // 退出按钮
  const logoutBtn = $('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('确定要退出登录吗？')) {
        clearBackendAuth();
      }
    });
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}