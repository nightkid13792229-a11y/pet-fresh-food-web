/**
 * 宠物信息管理共享工具库 - Web版本
 * 供Web端使用（UMD格式，可在浏览器中直接使用）
 */

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser globals
    root.PetUtils = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // ==================== 配置选项 ====================

  const SEX_OPTIONS = [
    { label: '公', value: 'male' },
    { label: '母', value: 'female' },
    { label: '未知', value: 'unknown' }
  ];

  const LIFE_STAGE_OPTIONS = [
    { label: '幼年期', value: 'puppy', multiplier: 3 },
    { label: '成年期', value: 'adult', multiplier: 1.8 }
  ];

  const ACTIVITY_OPTIONS = [
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

  const SNACK_CALORIE_OPTIONS = [
    { label: '几乎不吃', value: 'none' },
    { label: '少量（比如：2块鸡肉干）', value: 'low' },
    { label: '中等（2块鸡肉干+1根奶酪棒）', value: 'medium' },
    { label: '大量（鸡肉干+奶酪棒+半颗苹果）', value: 'high' }
  ];

  const MEALS_PER_DAY_OPTIONS = [1, 2, 3, 4, 5];

  const BODY_CONDITION_SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // ==================== 计算函数 ====================

  /**
   * 计算月龄
   */
  function calculateAgeMonths(birthdate) {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    return years * 12 + months;
  }

  /**
   * 计算年龄（岁，整数，不四舍五入）
   */
  function calculateAgeYears(birthdate) {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    const dayDiff = now.getDate() - birth.getDate();
    
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years--;
    }
    
    return Math.floor(years);
  }

  /**
   * 格式化年龄显示
   */
  function formatAge(birthdate) {
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
  }

  /**
   * 根据月龄计算K值（幼年期使用）
   */
  function calculateKValue(ageMonths) {
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
      return 1;
    }
  }

  /**
   * 计算每日能量估算
   */
  function calculateEnergy(weight, multiplier, lifeStage, ageMonths) {
    const w = Number(weight);
    const m = Number(multiplier);
    if (!(w > 0) || !(m > 0)) {
      return '';
    }
    
    const baseEnergy = Math.pow(w, 0.75) * m;
    
    if (lifeStage === 'puppy' && ageMonths !== null) {
      const k = calculateKValue(ageMonths);
      return Math.round(baseEnergy * k);
    } else {
      return Math.round(baseEnergy);
    }
  }

  /**
   * 根据活动水平获取能量系数
   */
  function getEnergyMultiplierByActivity(activityLevel) {
    const option = ACTIVITY_OPTIONS.find(opt => opt.value === activityLevel);
    return option ? option.energyMultiplier : null;
  }

  /**
   * 根据生日和品种成熟月龄自动判断生命阶段
   */
  function determineLifeStage(birthdate, maturityMonths) {
    if (!birthdate) return 'adult';
    
    const ageMonths = calculateAgeMonths(birthdate);
    if (ageMonths === null) return 'adult';
    
    const maturity = maturityMonths || 12;
    
    if (ageMonths < maturity) {
      return 'puppy';
    } else {
      return 'adult';
    }
  }

  /**
   * 生成生命阶段描述文字
   */
  function generateLifeStageDescription(petName, breed, maturityMonths, birthdate, lifeStage) {
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
  }

  /**
   * 验证必填字段
   */
  function validatePetForm(form) {
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
  }

  // 导出
  return {
    // 配置
    SEX_OPTIONS,
    LIFE_STAGE_OPTIONS,
    ACTIVITY_OPTIONS,
    SNACK_CALORIE_OPTIONS,
    MEALS_PER_DAY_OPTIONS,
    BODY_CONDITION_SCORE_OPTIONS,
    
    // 函数
    calculateAgeMonths,
    calculateAgeYears,
    formatAge,
    calculateKValue,
    calculateEnergy,
    getEnergyMultiplierByActivity,
    determineLifeStage,
    generateLifeStageDescription,
    validatePetForm
  };
}));


