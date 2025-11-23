import { request } from '../../../utils/request';
import {
  SEX_OPTIONS,
  LIFE_STAGE_OPTIONS,
  ACTIVITY_OPTIONS,
  SNACK_CALORIE_OPTIONS,
  MEALS_PER_DAY_OPTIONS,
  BODY_CONDITION_SCORE_OPTIONS,
  DEFAULT_PET_FORM as DEFAULT_FORM,
  calculateKValue,
  calculateEnergy,
  calculateAgeMonths,
  calculateAgeYears,
  getEnergyMultiplierByActivity,
  determineLifeStage,
  generateLifeStageDescription
} from '../../../utils/pet-utils';

Page({
  data: {
    form: { ...DEFAULT_FORM },
    petId: null,
    isEditing: false,
    sexOptions: SEX_OPTIONS,
    lifeStageOptions: LIFE_STAGE_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS,
    snackCalorieOptions: SNACK_CALORIE_OPTIONS,
    sexIndex: 2,
    lifeStageIndex: -1,
    activityIndex: -1,
    snackCalorieIndex: -1,
    bodyConditionScoreOptions: BODY_CONDITION_SCORE_OPTIONS,
    bodyConditionScoreIndex: -1,
    mealsPerDayOptions: MEALS_PER_DAY_OPTIONS,
    mealsPerDayIndex: 1, // 默认选择2（索引1）
    submitting: false,
    breedOptions: ['其它品种'],
    breedIndex: -1,
    showOtherBreedInput: false,
    breedsData: [], // 保存完整的品种数据
    selectedBreedData: null, // 当前选中的品种数据
    lifeStageDescription: '' // 生命阶段说明文字
  },

  onLoad(options) {
    this.loadBreeds();
    if (options.data) {
      try {
        const pet = JSON.parse(decodeURIComponent(options.data));
        this.populateForm(pet);
      } catch (error) {
        console.warn('parse pet data failed', error);
      }
    }
  },

  async loadBreeds() {
    try {
      const response = await request({ url: '/breeds', method: 'GET' });
      // 后端返回格式可能是 { items: [...], total: X } 或直接是数组
      const breedsArray = Array.isArray(response) ? response : (response.items || []);
      const breedNames = breedsArray.map(b => b.name);
      const breedOptions = ['其它品种', ...breedNames];
      
      // 保存完整的品种数据
      this.setData({ 
        breedOptions,
        breedsData: breedsArray
      });
      
      // 如果已经在编辑模式且有品种，更新品种数据
      if (this.data.isEditing && this.data.form.breed) {
        const breedIndex = breedOptions.findIndex(b => b === this.data.form.breed);
        if (breedIndex > 0) {
          // 找到对应的品种数据（breedIndex 0 是"其它品种"）
          const breedData = breedsArray.find(b => b.name === this.data.form.breed);
          this.setData({ 
            selectedBreedData: breedData || null
          }, () => {
            // 更新生命阶段和说明
            this.updateLifeStage();
            this.updateLifeStageDescription();
            // 确保能量系数已设置（如果活动水平已选择）
            const { form } = this.data;
            if (form.activityLevel && (!form.energyMultiplier || form.energyMultiplier === '' || form.energyMultiplier === 0)) {
              // 尝试多种匹配方式
              let activityOption = ACTIVITY_OPTIONS.find(opt => opt.value === form.activityLevel);
              if (!activityOption && typeof form.activityLevel === 'string') {
                activityOption = ACTIVITY_OPTIONS.find(opt => opt.label === form.activityLevel);
              }
              if (!activityOption && typeof form.activityLevel === 'string') {
                activityOption = ACTIVITY_OPTIONS.find(opt => 
                  opt.value.toLowerCase() === form.activityLevel.toLowerCase()
                );
              }
              if (activityOption) {
                this.setData({
                  form: {
                    ...this.data.form,
                    energyMultiplier: Math.round(activityOption.energyMultiplier)
                  }
                });
              }
            }
          });
        } else {
          this.setData({ 
            selectedBreedData: null
          }, () => {
            // 更新生命阶段和说明
            this.updateLifeStage();
            this.updateLifeStageDescription();
            // 确保能量系数已设置（如果活动水平已选择）
            const { form } = this.data;
            if (form.activityLevel && (!form.energyMultiplier || form.energyMultiplier === '' || form.energyMultiplier === 0)) {
              // 尝试多种匹配方式
              let activityOption = ACTIVITY_OPTIONS.find(opt => opt.value === form.activityLevel);
              if (!activityOption && typeof form.activityLevel === 'string') {
                activityOption = ACTIVITY_OPTIONS.find(opt => opt.label === form.activityLevel);
              }
              if (!activityOption && typeof form.activityLevel === 'string') {
                activityOption = ACTIVITY_OPTIONS.find(opt => 
                  opt.value.toLowerCase() === form.activityLevel.toLowerCase()
                );
              }
              if (activityOption) {
                this.setData({
                  form: {
                    ...this.data.form,
                    energyMultiplier: Math.round(activityOption.energyMultiplier)
                  }
                });
              }
            }
          });
        }
      }
    } catch (error) {
      // 静默处理错误，避免在控制台显示过多错误信息
      // 如果加载失败，保持默认的"其它品种"选项
      console.warn('load breeds failed, using default option only');
    }
  },

  handleBreedChange(event) {
    const index = Number(event.detail.value);
    const selectedBreed = this.data.breedOptions[index];
    const isOtherBreed = index === 0; // First item is "其它品种"
    
    // 获取品种数据
    let breedData = null;
    if (!isOtherBreed) {
      breedData = this.data.breedsData.find(b => b.name === selectedBreed) || null;
    }
    
    this.setData({
      breedIndex: index,
      showOtherBreedInput: isOtherBreed,
      selectedBreedData: breedData,
      form: {
        ...this.data.form,
        breed: isOtherBreed ? this.data.form.breed : selectedBreed
      }
    });
    
    // Clear breed if not "其它品种" and input was shown
    if (!isOtherBreed && this.data.showOtherBreedInput) {
      this.setData({
        form: {
          ...this.data.form,
          breed: selectedBreed
        }
      });
    }
    
    // 更新生命阶段和说明
    this.updateLifeStage();
    this.updateLifeStageDescription();
  },

  populateForm(pet) {
    // 先处理能量系数：如果活动水平已选择但能量系数为空，根据活动水平设置
    let energyMultiplier = pet.energyMultiplier !== null && pet.energyMultiplier !== undefined ? pet.energyMultiplier : '';
    
    // 调试信息
    console.log('[populateForm] pet.activityLevel:', pet.activityLevel);
    console.log('[populateForm] pet.energyMultiplier:', pet.energyMultiplier);
    console.log('[populateForm] ACTIVITY_OPTIONS:', ACTIVITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label, multiplier: opt.energyMultiplier })));
    
    // 如果活动水平存在，但能量系数为空或0，尝试匹配
    if (pet.activityLevel && (!energyMultiplier || energyMultiplier === '' || energyMultiplier === 0)) {
      // 尝试精确匹配
      let activityOption = ACTIVITY_OPTIONS.find(opt => opt.value === pet.activityLevel);
      
      // 如果精确匹配失败，尝试通过 label 匹配（可能数据库存储的是中文）
      if (!activityOption && typeof pet.activityLevel === 'string') {
        activityOption = ACTIVITY_OPTIONS.find(opt => opt.label === pet.activityLevel);
      }
      
      // 如果还是失败，尝试不区分大小写的匹配
      if (!activityOption && typeof pet.activityLevel === 'string') {
        activityOption = ACTIVITY_OPTIONS.find(opt => 
          opt.value.toLowerCase() === pet.activityLevel.toLowerCase()
        );
      }
      
      if (activityOption) {
        energyMultiplier = Math.round(activityOption.energyMultiplier);
        console.log('[populateForm] 匹配成功，设置能量系数为:', energyMultiplier);
      } else {
        console.warn('[populateForm] 未找到匹配的活动水平:', pet.activityLevel);
      }
    }
    
    const form = {
      ...DEFAULT_FORM,
      ...pet,
      weightKg: pet.weightKg !== null && pet.weightKg !== undefined ? pet.weightKg : '',
      // 能量系数：如果存在则保留，如果为空则根据活动水平设置
      energyMultiplier: energyMultiplier,
      dailyEnergyKcal: pet.dailyEnergyKcal !== null && pet.dailyEnergyKcal !== undefined ? pet.dailyEnergyKcal : '',
      mealsPerDay: pet.mealsPerDay !== null && pet.mealsPerDay !== undefined ? pet.mealsPerDay : '2', // 默认值为2
      snackCalorie: pet.snackAmount !== null && pet.snackAmount !== undefined ? pet.snackAmount : '', // 后端返回的是 snackAmount，映射到前端的 snackCalorie
      bodyConditionScore: pet.bodyConditionScore !== null && pet.bodyConditionScore !== undefined ? pet.bodyConditionScore : '',
      // 处理绝育状态：数据库可能返回 0/1，需要转换为 true/false
      neutered: pet.neutered !== undefined && pet.neutered !== null 
        ? (pet.neutered === true || pet.neutered === 1 || pet.neutered === '1')
        : false
    };
    const sexIndex = SEX_OPTIONS.findIndex((item) => item.value === form.sex);
    const lifeStageIndex = LIFE_STAGE_OPTIONS.findIndex((item) => item.value === form.lifeStage);
    const activityIndex = ACTIVITY_OPTIONS.findIndex((item) => item.value === form.activityLevel);
    const snackCalorieIndex = SNACK_CALORIE_OPTIONS.findIndex((item) => item.value === form.snackCalorie);
    const bodyConditionScoreIndex = form.bodyConditionScore 
      ? this.data.bodyConditionScoreOptions.findIndex(score => score === Number(form.bodyConditionScore))
      : -1;
    const mealsPerDayIndex = form.mealsPerDay 
      ? this.data.mealsPerDayOptions.findIndex(meals => meals === Number(form.mealsPerDay))
      : 1; // 默认选择2（索引1）
    
    // Set breed index and breed data
    let breedIndex = -1;
    let showOtherBreedInput = false;
    let selectedBreedData = null;
    if (form.breed) {
      // 在 breedOptions 中查找（排除"其它品种"，因为它是索引0）
      // breedOptions[0] 是"其它品种"，从索引1开始才是真正的品种
      const actualBreedIndex = this.data.breedOptions.findIndex((b, idx) => idx > 0 && b === form.breed);
      if (actualBreedIndex >= 0) {
        breedIndex = actualBreedIndex;
        showOtherBreedInput = false;
        // 如果 breedsData 已加载，查找品种数据
        if (this.data.breedsData && this.data.breedsData.length > 0) {
          selectedBreedData = this.data.breedsData.find(b => b.name === form.breed) || null;
        }
      } else {
        // Breed not in list, 显示为"其它品种"输入框
        breedIndex = -1; // 不选中任何选项
        showOtherBreedInput = true;
      }
    }
    
    // 格式化生日：只显示年月日（YYYY-MM-DD）
    if (form.birthdate) {
      const date = new Date(form.birthdate);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        form.birthdate = `${year}-${month}-${day}`;
      }
    }
    
    // 格式化能量系数：确保是数字类型
    // 如果能量系数为空或无效，但活动水平已选择，使用活动水平对应的能量系数
    const findActivityOption = (activityLevel) => {
      if (!activityLevel) return null;
      // 尝试精确匹配
      let option = ACTIVITY_OPTIONS.find(opt => opt.value === activityLevel);
      // 如果失败，尝试通过 label 匹配
      if (!option && typeof activityLevel === 'string') {
        option = ACTIVITY_OPTIONS.find(opt => opt.label === activityLevel);
      }
      // 如果还是失败，尝试不区分大小写匹配
      if (!option && typeof activityLevel === 'string') {
        option = ACTIVITY_OPTIONS.find(opt => 
          opt.value.toLowerCase() === activityLevel.toLowerCase()
        );
      }
      return option;
    };
    
    // 格式化能量系数：确保是数字类型
    // 如果能量系数为空或无效，但活动水平已选择，使用活动水平对应的能量系数
    const currentEnergyMultiplier = form.energyMultiplier;
    console.log('[populateForm] 格式化前 energyMultiplier:', currentEnergyMultiplier, 'type:', typeof currentEnergyMultiplier);
    
    // 检查能量系数是否有效（不为 null、undefined、空字符串、0）
    const isValidEnergyMultiplier = currentEnergyMultiplier !== null && 
                                    currentEnergyMultiplier !== undefined && 
                                    currentEnergyMultiplier !== '' && 
                                    currentEnergyMultiplier !== 0;
    
    if (isValidEnergyMultiplier) {
      // 能量系数有值，转换为数字类型
      const multiplier = Number(currentEnergyMultiplier);
      if (!isNaN(multiplier) && multiplier > 0) {
        form.energyMultiplier = Math.round(multiplier); // 四舍五入为整数
        console.log('[populateForm] 格式化后 energyMultiplier (有效值):', form.energyMultiplier);
      } else {
        // 如果转换失败或为0，但活动水平已选择，使用活动水平对应的能量系数
        if (form.activityLevel) {
          const activityOption = findActivityOption(form.activityLevel);
          form.energyMultiplier = activityOption ? Math.round(activityOption.energyMultiplier) : '';
          console.log('[populateForm] 转换失败，根据活动水平设置 energyMultiplier:', form.energyMultiplier);
        } else {
          form.energyMultiplier = '';
          console.log('[populateForm] 转换失败且无活动水平，设置为空');
        }
      }
    } else {
      // 能量系数为空或0，如果活动水平已选择，使用活动水平对应的能量系数
      if (form.activityLevel) {
        const activityOption = findActivityOption(form.activityLevel);
        form.energyMultiplier = activityOption ? Math.round(activityOption.energyMultiplier) : '';
        console.log('[populateForm] 能量系数无效，根据活动水平设置 energyMultiplier:', form.energyMultiplier);
      } else {
        form.energyMultiplier = '';
        console.log('[populateForm] 能量系数无效且无活动水平，设置为空');
      }
    }
    
    console.log('[populateForm] setData 前 form.energyMultiplier:', form.energyMultiplier, 'type:', typeof form.energyMultiplier);
    
    this.setData({
      form,
      petId: pet.id,
      isEditing: true,
      sexIndex: sexIndex >= 0 ? sexIndex : 2,
      lifeStageIndex,
      activityIndex,
      snackCalorieIndex,
      bodyConditionScoreIndex,
      mealsPerDayIndex,
      breedIndex,
      showOtherBreedInput,
      selectedBreedData
    }, () => {
      console.log('[populateForm] setData 后 this.data.form.energyMultiplier:', this.data.form.energyMultiplier, 'type:', typeof this.data.form.energyMultiplier);
      console.log('[populateForm] setData 后 this.data.form.activityLevel:', this.data.form.activityLevel);
      // 自动匹配生命阶段（如果品种数据已加载）
      if (selectedBreedData && form.birthdate) {
        this.updateLifeStage();
      }
      // 更新生命阶段说明
      this.updateLifeStageDescription();
      // 确保能量系数已设置（如果活动水平已选择）
      const currentForm = this.data.form;
      const needsEnergyMultiplier = currentForm.activityLevel && 
                                    (!currentForm.energyMultiplier || 
                                     currentForm.energyMultiplier === '' || 
                                     currentForm.energyMultiplier === 0 ||
                                     currentForm.energyMultiplier === null ||
                                     currentForm.energyMultiplier === undefined);
      
      if (needsEnergyMultiplier) {
        console.log('[populateForm callback] 需要设置能量系数，当前值:', currentForm.energyMultiplier);
        // 尝试多种匹配方式
        let activityOption = ACTIVITY_OPTIONS.find(opt => opt.value === currentForm.activityLevel);
        if (!activityOption && typeof currentForm.activityLevel === 'string') {
          activityOption = ACTIVITY_OPTIONS.find(opt => opt.label === currentForm.activityLevel);
        }
        if (!activityOption && typeof currentForm.activityLevel === 'string') {
          activityOption = ACTIVITY_OPTIONS.find(opt => 
            opt.value.toLowerCase() === currentForm.activityLevel.toLowerCase()
          );
        }
        if (activityOption) {
          const roundedMultiplier = Math.round(activityOption.energyMultiplier);
          console.log('[populateForm callback] 找到匹配，设置能量系数为:', roundedMultiplier);
          this.setData({
            'form.energyMultiplier': roundedMultiplier
          }, () => {
            console.log('[populateForm callback] 设置后 this.data.form.energyMultiplier:', this.data.form.energyMultiplier);
          });
        } else {
          console.warn('[populateForm callback] 未找到匹配的活动水平:', currentForm.activityLevel);
        }
      } else {
        console.log('[populateForm callback] 能量系数已存在，无需设置:', currentForm.energyMultiplier);
      }
    });
    wx.setNavigationBarTitle({
      title: `编辑${pet.name || '爱犬'}`
    });
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    let value = event.detail.value;
    if (field === 'weightKg') {
      value = value.replace(/[^\d.]/g, '');
    }
    this.setData(
      {
        form: {
          ...this.data.form,
          [field]: value
        }
      },
      () => {
        if (field === 'weightKg' || field === 'energyMultiplier') {
          this.updateEnergyEstimate();
        }
        // 如果昵称改变，更新生命阶段说明
        if (field === 'name') {
          this.updateLifeStageDescription();
        }
      }
    );
  },

  handleNeuteredSelect(event) {
    const value = event.currentTarget.dataset.value === 'true';
    this.setData({
      form: {
        ...this.data.form,
        neutered: value
      }
    });
  },

  handleLifeStageChange(event) {
    const index = Number(event.detail.value);
    const option = LIFE_STAGE_OPTIONS[index];
    const updates = {
      lifeStage: option.value
    };
    if (option.multiplier && !this.data.isEditing) {
      updates.energyMultiplier = option.multiplier;
    }
    this.setData(
      {
        form: {
          ...this.data.form,
          ...updates
        },
        lifeStageIndex: index
      },
      () => {
        if (updates.energyMultiplier) {
          this.updateEnergyEstimate();
        }
        // 用户手动选择后，仍然更新说明文字
        this.updateLifeStageDescription();
      }
    );
  },

  handleSexChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      form: {
        ...this.data.form,
        sex: SEX_OPTIONS[index].value
      },
      sexIndex: index
    });
  },

  handleActivitySelect(event) {
    const index = Number(event.currentTarget.dataset.index);
    const option = ACTIVITY_OPTIONS[index];
    
    this.setData({
      form: {
        ...this.data.form,
        activityLevel: option.value,
        energyMultiplier: Math.round(option.energyMultiplier)
      },
      activityIndex: index
    }, () => {
      // 更新能量估算
      this.updateEnergyEstimate();
    });
  },

  handleSnackCalorieChange(event) {
    const index = Number(event.detail.value);
    const option = SNACK_CALORIE_OPTIONS[index];
    this.setData({
      form: {
        ...this.data.form,
        snackCalorie: option.value
      },
      snackCalorieIndex: index
    });
  },

  handleBodyConditionScoreChange(event) {
    const index = Number(event.detail.value);
    const score = this.data.bodyConditionScoreOptions[index];
    this.setData({
      form: {
        ...this.data.form,
        bodyConditionScore: score
      },
      bodyConditionScoreIndex: index
    });
  },

  handleMealsPerDayChange(event) {
    const index = Number(event.detail.value);
    const meals = this.data.mealsPerDayOptions[index];
    this.setData({
      form: {
        ...this.data.form,
        mealsPerDay: String(meals) // 转换为字符串以保持一致性
      },
      mealsPerDayIndex: index
    });
  },

  showBCSChart() {
    // 显示 BCS 图表
    this.previewBCSImage();
  },

  previewBCSImage() {
    // 在微信小程序中，尝试多种路径格式
    // 方式1：绝对路径（从项目根目录）
    let imagePath = '/images/bcs-chart.png';
    
    // 如果绝对路径不行，尝试相对路径（从当前页面到 images 目录）
    // imagePath = '../../images/bcs-chart.png';
    
    wx.previewImage({
      urls: [imagePath],
      current: imagePath,
      success: () => {
        console.log('图片预览成功');
      },
      fail: (err) => {
        console.error('预览图片失败:', err);
        console.error('图片路径:', imagePath);
        // 如果预览失败，显示错误信息
        wx.showModal({
          title: '无法打开图片',
          content: '请检查图片文件是否存在：' + imagePath + '\n错误信息：' + (err.errMsg || '未知错误'),
          showCancel: false,
          confirmText: '确定'
        });
      }
    });
  },


  handleDateChange(event) {
    this.setData({
      form: {
        ...this.data.form,
        birthdate: event.detail.value
      }
    });
    // 生日改变时，重新计算生命阶段
    this.updateLifeStage();
    this.updateLifeStageDescription();
    // 生日改变时，重新计算能量估算
    this.updateEnergyEstimate();
  },

  updateEnergyEstimate() {
    const { weightKg, energyMultiplier, lifeStage, birthdate } = this.data.form;
    
    // 计算月龄（用于幼年期的K值计算）
    let ageMonths = null;
    if (birthdate && lifeStage === 'puppy') {
      ageMonths = calculateAgeMonths(birthdate);
    }
    
    const kcal = calculateEnergy(weightKg, energyMultiplier, lifeStage, ageMonths);
    this.setData({
      form: {
        ...this.data.form,
        dailyEnergyKcal: kcal || ''
      }
    });
  },

  // 根据月龄和成熟月龄自动选择生命阶段
  updateLifeStage() {
    const { birthdate } = this.data.form;
    const { selectedBreedData } = this.data;
    
    // 如果没有生日或品种数据，不自动选择
    if (!birthdate || !selectedBreedData || !selectedBreedData.maturityMonths) {
      return;
    }
    
    // 使用共享工具库判断生命阶段
    const maturityMonths = selectedBreedData.maturityMonths;
    const newLifeStage = determineLifeStage(birthdate, maturityMonths);
    const lifeStageIndex = LIFE_STAGE_OPTIONS.findIndex(opt => opt.value === newLifeStage);
    
    if (lifeStageIndex >= 0) {
      const option = LIFE_STAGE_OPTIONS[lifeStageIndex];
      const updates = {
        form: {
          ...this.data.form,
          lifeStage: newLifeStage
        },
        lifeStageIndex
      };
      
      // 如果是新建且没有手动设置过能量系数，自动设置
      if (option.multiplier && !this.data.isEditing && !this.data.form.energyMultiplier) {
        updates.form.energyMultiplier = option.multiplier;
      }
      
      this.setData(updates, () => {
        if (option.multiplier && !this.data.isEditing && !this.data.form.energyMultiplier) {
          this.updateEnergyEstimate();
        } else {
          // 生命阶段改变时，也需要更新能量估算（因为计算公式不同）
          this.updateEnergyEstimate();
        }
      });
    }
  },

  // 更新生命阶段说明文字
  updateLifeStageDescription() {
    const { form, selectedBreedData } = this.data;
    let description = '';
    
    // 需要昵称、品种和生日才能计算
    if (form.name && form.breed && form.birthdate) {
      if (selectedBreedData && selectedBreedData.maturityMonths) {
        // 使用共享工具库计算生命阶段
        const lifeStage = determineLifeStage(form.birthdate, selectedBreedData.maturityMonths);
        // 使用共享工具库生成描述
        description = generateLifeStageDescription(
          form.name, 
          form.breed, 
          selectedBreedData.maturityMonths, 
          form.birthdate, 
          lifeStage
        );
      } else {
        // 如果没有品种数据，使用简化版本
        const ageMonths = calculateAgeMonths(form.birthdate);
        if (ageMonths !== null) {
          const lifeStage = ageMonths < 12 ? 'puppy' : 'adult';
          const lifeStageLabel = lifeStage === 'puppy' ? '幼年期' : '成年期';
          
          if (lifeStage === 'adult') {
            // 成年期：显示年龄（岁）
            const ageYears = calculateAgeYears(form.birthdate);
            if (ageYears !== null && ageYears >= 0) {
              description = `${form.name}现在${ageYears}岁了，属于${lifeStageLabel}`;
            } else {
              description = `${form.name}现在${ageMonths}个月大，属于${lifeStageLabel}`;
            }
          } else {
            // 幼年期：显示月龄
            description = `${form.name}现在${ageMonths}个月大，属于${lifeStageLabel}`;
          }
        } else {
          // 生日格式错误
          description = '';
        }
      }
    }
    
    this.setData({ lifeStageDescription: description });
  },

  async submitForm() {
    const { form } = this.data;
    
    // 验证必填项
    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: '请填写爱犬昵称', icon: 'none' });
      return;
    }
    
    if (!form.breed || !form.breed.trim()) {
      wx.showToast({ title: '请选择品种', icon: 'none' });
      return;
    }
    
    if (!form.birthdate) {
      wx.showToast({ title: '请选择生日（至少选择年月）', icon: 'none' });
      return;
    }
    
    // 验证生日至少包含年月
    const birthdateParts = form.birthdate.split('-');
    if (birthdateParts.length < 2 || !birthdateParts[0] || !birthdateParts[1]) {
      wx.showToast({ title: '请至少选择生日的年月', icon: 'none' });
      return;
    }
    
    if (!form.weightKg || !form.weightKg.toString().trim()) {
      wx.showToast({ title: '请填写体重', icon: 'none' });
      return;
    }
    
    if (!form.activityLevel) {
      wx.showToast({ title: '请选择活动水平', icon: 'none' });
      return;
    }
    
    if (!form.bodyConditionScore) {
      wx.showToast({ title: '请选择体况评分', icon: 'none' });
      return;
    }
    
    if (!form.mealsPerDay) {
      wx.showToast({ title: '请选择每日进餐数', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const payload = { ...this.data.form };
    
    // 移除不需要的字段
    delete payload.city; // 已移除常驻城市字段
    delete payload.region; // 确保移除 region
    
    // 字段映射：前端使用 snackCalorie，后端使用 snackAmount
    if (payload.snackCalorie !== undefined) {
      payload.snackAmount = payload.snackCalorie || null;
      delete payload.snackCalorie;
    }
    
    // 处理空值和类型转换
    if (payload.weightKg === '' || payload.weightKg === undefined) {
      payload.weightKg = null;
    } else {
      const weight = Number(payload.weightKg);
      payload.weightKg = isNaN(weight) ? null : weight;
    }
    
    if (payload.energyMultiplier === '' || payload.energyMultiplier === undefined) {
      payload.energyMultiplier = null;
    } else {
      const multiplier = Number(payload.energyMultiplier);
      payload.energyMultiplier = isNaN(multiplier) ? null : Math.round(multiplier * 100) / 100; // 保留2位小数
    }
    
    if (payload.dailyEnergyKcal === '' || payload.dailyEnergyKcal === undefined) {
      payload.dailyEnergyKcal = null;
    } else {
      const kcal = Number(payload.dailyEnergyKcal);
      payload.dailyEnergyKcal = isNaN(kcal) ? null : Math.round(kcal);
    }
    
    if (payload.bodyConditionScore === '' || payload.bodyConditionScore === undefined) {
      payload.bodyConditionScore = null;
    } else {
      const bcs = Number(payload.bodyConditionScore);
      payload.bodyConditionScore = isNaN(bcs) ? null : Math.round(bcs);
    }
    
    if (payload.mealsPerDay === '' || payload.mealsPerDay === undefined) {
      payload.mealsPerDay = null;
    } else {
      const meals = Number(payload.mealsPerDay);
      payload.mealsPerDay = isNaN(meals) ? null : Math.round(meals);
    }
    
    if (payload.snackAmount === '' || payload.snackAmount === undefined) {
      payload.snackAmount = null;
    }
    
    // 确保字符串字段处理空值
    if (payload.breed === '') payload.breed = null;
    if (payload.lifeStage === '') payload.lifeStage = null;
    if (payload.activityLevel === '') payload.activityLevel = null;
    if (payload.dietaryNote === '') payload.dietaryNote = null;
    if (payload.allergyNote === '') payload.allergyNote = null;
    if (payload.symptomNote === '') payload.symptomNote = null;
    if (payload.notes === '') payload.notes = null;
    
    // 确保布尔值正确
    if (payload.neutered === undefined) payload.neutered = false;
    payload.neutered = Boolean(payload.neutered);
    
    // 确保性别有默认值
    if (!payload.sex) payload.sex = 'unknown';
    try {
      const method = this.data.isEditing ? 'PUT' : 'POST';
      const url = this.data.isEditing ? `/customer/pets/${this.data.petId}` : '/customer/pets';
      const result = await request({
        url,
        method,
        data: payload
      });
      const app = getApp();
      if (app && typeof app.fetchProfile === 'function') {
        await app.fetchProfile();
      }
      wx.showToast({ title: '已保存', icon: 'success' });
      const eventChannel = this.getOpenerEventChannel();
      if (eventChannel) {
        eventChannel.emit('refreshPets');
      }
      if (result && result.profileCompleted !== undefined && app && app.globalData) {
        app.globalData.profileCompleted = result.profileCompleted;
      }
      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});

