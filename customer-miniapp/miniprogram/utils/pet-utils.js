/**
 * 宠物信息管理共享工具库
 * 供小程序端和Web端共同使用
 */

// ==================== 配置选项 ====================

export const SEX_OPTIONS = [
  { label: '公', value: 'male' },
  { label: '母', value: 'female' },
  { label: '未知', value: 'unknown' }
];

export const LIFE_STAGE_OPTIONS = [
  { label: '幼年期', value: 'puppy', multiplier: 3 },
  { label: '成年期', value: 'adult', multiplier: 1.8 }
];

export const ACTIVITY_OPTIONS = [
  { 
    label: '低运动量', 
    value: 'low', 
    description: '＜1小时/天，例如牵绳散步',
    energyMultiplier: 95
  },
  { 
    label: '中等运动量', 
    value: 'medium', 
    description: '1-3小时/天，例如散步+室内玩耍',
    energyMultiplier: 110
  },
  { 
    label: '较高运动量', 
    value: 'high', 
    description: '1-3小时/天，例如跑跳、追逐等',
    energyMultiplier: 125
  },
  { 
    label: '高运动量', 
    value: 'very_high', 
    description: '3-6小时/天，例如牧羊等工作',
    energyMultiplier: 150
  }
];

export const SNACK_CALORIE_OPTIONS = [
  { label: '几乎不吃', value: 'none' },
  { label: '少量（比如：2块鸡肉干）', value: 'low' },
  { label: '中等（2块鸡肉干+1根奶酪棒）', value: 'medium' },
  { label: '大量（鸡肉干+奶酪棒+半颗苹果）', value: 'high' }
];

export const MEALS_PER_DAY_OPTIONS = [1, 2, 3, 4, 5];

export const BODY_CONDITION_SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ==================== 计算函数 ====================

/**
 * 计算月龄
 * @param {string|Date} birthdate - 生日（YYYY-MM-DD格式或Date对象）
 * @returns {number|null} 月龄，如果无效返回null
 */
export const calculateAgeMonths = (birthdate) => {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  return years * 12 + months;
};

/**
 * 计算年龄（岁，整数，不四舍五入）
 * @param {string|Date} birthdate - 生日（YYYY-MM-DD格式或Date对象）
 * @returns {number|null} 年龄（岁），如果无效返回null
 */
export const calculateAgeYears = (birthdate) => {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  const dayDiff = now.getDate() - birth.getDate();
  
  // 如果还没到今年的生日，年龄减1
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years--;
  }
  
  return Math.floor(years); // 确保是整数，不四舍五入
};

/**
 * 格式化年龄显示
 * @param {string|Date} birthdate - 生日
 * @returns {string} 格式化后的年龄（如"2岁"或"6个月"）
 */
export const formatAge = (birthdate) => {
  if (!birthdate) return '-';
  const ageMonths = calculateAgeMonths(birthdate);
  if (ageMonths === null) return '-';
  
  if (ageMonths < 12) {
    return `${ageMonths}个月`;
  } else {
    const ageYears = calculateAgeYears(birthdate);
    if (ageYears !== null && ageYears >= 0) {
      return `${ageYears}岁`;
    }
    return `${ageMonths}个月`;
  }
};

/**
 * 根据月龄计算K值（幼年期使用）
 * @param {number} ageMonths - 月龄
 * @returns {number} K值
 */
export const calculateKValue = (ageMonths) => {
  if (ageMonths === null || ageMonths === undefined) {
    return 1;
  }
  if (ageMonths < 2) {
    return 2;
  } else if (ageMonths === 2) {
    return 1.8;
  } else if (ageMonths === 3) {
    return 1.6;
  } else if (ageMonths === 4) {
    return 1.5;
  } else if (ageMonths === 5) {
    return 1.4;
  } else if (ageMonths === 6) {
    return 1.3;
  } else if (ageMonths === 7) {
    return 1.2;
  } else if (ageMonths === 8) {
    return 1.1;
  } else {
    // 月龄 > 8
    return 1;
  }
};

/**
 * 计算每日能量估算
 * @param {number|string} weight - 体重（kg）
 * @param {number|string} multiplier - 运动-能量系数
 * @param {string} lifeStage - 生命阶段（'puppy' 或 'adult'）
 * @param {number|null} ageMonths - 月龄（幼年期需要）
 * @returns {number|string} 每日能量估算（kcal），如果参数无效返回空字符串
 */
export const calculateEnergy = (weight, multiplier, lifeStage, ageMonths) => {
  const w = Number(weight);
  const m = Number(multiplier);
  if (!(w > 0) || !(m > 0)) {
    return '';
  }
  
  // 基础公式：体重的0.75次方 * 运动-能量系数
  const baseEnergy = Math.pow(w, 0.75) * m;
  
  // 如果是幼年期，需要乘以K值
  if (lifeStage === 'puppy' && ageMonths !== null) {
    const k = calculateKValue(ageMonths);
    return Math.round(baseEnergy * k);
  } else {
    // 成年期直接使用基础公式
    return Math.round(baseEnergy);
  }
};

/**
 * 根据活动水平获取能量系数
 * @param {string} activityLevel - 活动水平值（'low', 'medium', 'high', 'very_high'）
 * @returns {number|null} 能量系数，如果未找到返回null
 */
export const getEnergyMultiplierByActivity = (activityLevel) => {
  const option = ACTIVITY_OPTIONS.find(opt => opt.value === activityLevel);
  return option ? option.energyMultiplier : null;
};

/**
 * 根据生日和品种成熟月龄自动判断生命阶段
 * @param {string|Date} birthdate - 生日
 * @param {number|null} maturityMonths - 品种成熟月龄
 * @returns {string} 生命阶段（'puppy' 或 'adult'）
 */
export const determineLifeStage = (birthdate, maturityMonths) => {
  if (!birthdate) return 'adult';
  
  const ageMonths = calculateAgeMonths(birthdate);
  if (ageMonths === null) return 'adult';
  
  // 如果品种成熟月龄未设置，默认12个月
  const maturity = maturityMonths || 12;
  
  // 如果月龄小于成熟月龄，则为幼年期
  if (ageMonths < maturity) {
    return 'puppy';
  } else {
    return 'adult';
  }
};

/**
 * 生成生命阶段描述文字
 * @param {string} petName - 宠物昵称
 * @param {string} breed - 品种名称
 * @param {number|null} maturityMonths - 成熟月龄
 * @param {string|Date} birthdate - 生日
 * @param {string} lifeStage - 生命阶段
 * @returns {string} 描述文字
 */
export const generateLifeStageDescription = (petName, breed, maturityMonths, birthdate, lifeStage) => {
  if (!petName || !breed || !birthdate) {
    return '';
  }
  
  const ageMonths = calculateAgeMonths(birthdate);
  const ageYears = calculateAgeYears(birthdate);
  
  if (lifeStage === 'puppy' && ageMonths !== null) {
    return `${petName}是${breed}，现在${ageMonths}个月大，属于幼年期`;
  } else if (lifeStage === 'adult' && ageYears !== null) {
    const maturity = maturityMonths || 12;
    return `${petName}是${breed}，现在${ageYears}岁了，属于成年期，成熟期是${maturity}个月`;
  }
  
  return '';
};

/**
 * 验证必填字段
 * @param {Object} form - 表单数据
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validatePetForm = (form) => {
  const errors = [];
  
  if (!form.name || form.name.trim() === '') {
    errors.push('爱犬昵称不能为空');
  }
  
  if (!form.breed || form.breed.trim() === '') {
    errors.push('品种不能为空');
  }
  
  if (!form.birthdate) {
    errors.push('生日不能为空（至少需要选择年月）');
  }
  
  if (!form.weightKg || form.weightKg === '' || Number(form.weightKg) <= 0) {
    errors.push('体重不能为空且必须大于0');
  }
  
  if (!form.activityLevel || form.activityLevel === '') {
    errors.push('活动水平不能为空');
  }
  
  if (!form.bodyConditionScore || form.bodyConditionScore === '') {
    errors.push('体况评分不能为空');
  }
  
  if (!form.mealsPerDay || form.mealsPerDay === '') {
    errors.push('每日进餐数不能为空');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// ==================== 默认表单数据 ====================

export const DEFAULT_PET_FORM = {
  name: '',
  breed: '',
  birthdate: '',
  weightKg: '',
  sex: 'unknown',
  neutered: false,
  lifeStage: '',
  activityLevel: '',
  energyMultiplier: '',
  dailyEnergyKcal: '',
  bodyConditionScore: '',
  mealsPerDay: '2',
  snackCalorie: '',
  dietaryNote: '',
  allergyNote: '',
  symptomNote: '',
  notes: ''
};

