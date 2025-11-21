import { request } from '../../../utils/request';

const SEX_OPTIONS = [
  { label: '公', value: 'male' },
  { label: '母', value: 'female' },
  { label: '未知', value: 'unknown' }
];

const LIFE_STAGE_OPTIONS = [
  { label: '幼犬', value: 'puppy', multiplier: 3 },
  { label: '成犬', value: 'adult', multiplier: 1.8 },
  { label: '老年犬', value: 'senior', multiplier: 1.6 },
  { label: '妊娠期', value: 'pregnancy', multiplier: 2.5 },
  { label: '哺乳期', value: 'lactation', multiplier: 3.5 },
  { label: '其他', value: 'other', multiplier: 1.8 }
];

const ACTIVITY_OPTIONS = [
  { label: '较少运动', value: 'low' },
  { label: '适中运动', value: 'medium' },
  { label: '高强度运动', value: 'high' }
];

const DEFAULT_FORM = {
  name: '',
  breed: '',
  city: '',
  birthdate: '',
  weightKg: '',
  sex: 'unknown',
  neutered: false,
  lifeStage: '',
  activityLevel: '',
  energyMultiplier: '',
  dailyEnergyKcal: '',
  bodyConditionScore: '',
  mealsPerDay: '',
  snackAmount: '',
  dietaryNote: '',
  allergyNote: '',
  symptomNote: '',
  notes: ''
};

const calculateEnergy = (weight, multiplier) => {
  const w = Number(weight);
  const m = Number(multiplier);
  if (!(w > 0) || !(m > 0)) {
    return '';
  }
  const rer = 70 * Math.pow(w, 0.75);
  const mer = rer * m;
  return Math.round(mer);
};

Page({
  data: {
    form: { ...DEFAULT_FORM },
    petId: null,
    isEditing: false,
    region: [],
    sexOptions: SEX_OPTIONS,
    lifeStageOptions: LIFE_STAGE_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS,
    sexIndex: 2,
    lifeStageIndex: -1,
    activityIndex: -1,
    submitting: false,
    breedOptions: ['其它品种'],
    breedIndex: -1,
    showOtherBreedInput: false
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
      const breeds = await request({ url: '/breeds', method: 'GET' });
      const breedNames = breeds.map(b => b.name);
      const breedOptions = ['其它品种', ...breedNames];
      this.setData({ breedOptions });
      
      // If editing and breed exists, set the index
      if (this.data.isEditing && this.data.form.breed) {
        const breedIndex = breedOptions.findIndex(b => b === this.data.form.breed);
        if (breedIndex >= 0) {
          this.setData({ breedIndex });
        } else {
          // Breed not in list, set to "其它品种" and show input
          this.setData({ 
            breedIndex: 0,
            showOtherBreedInput: true
          });
        }
      }
    } catch (error) {
      console.warn('load breeds failed', error);
      // Keep default "其它品种" option
    }
  },

  handleBreedChange(event) {
    const index = Number(event.detail.value);
    const selectedBreed = this.data.breedOptions[index];
    const isOtherBreed = index === 0; // First item is "其它品种"
    
    this.setData({
      breedIndex: index,
      showOtherBreedInput: isOtherBreed,
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
  },

  populateForm(pet) {
    const form = {
      ...DEFAULT_FORM,
      ...pet,
      weightKg: pet.weightKg || '',
      energyMultiplier: pet.energyMultiplier || '',
      dailyEnergyKcal: pet.dailyEnergyKcal || '',
      mealsPerDay: pet.mealsPerDay || '',
      snackAmount: pet.snackAmount || '',
      bodyConditionScore: pet.bodyConditionScore || ''
    };
    const sexIndex = SEX_OPTIONS.findIndex((item) => item.value === form.sex);
    const lifeStageIndex = LIFE_STAGE_OPTIONS.findIndex((item) => item.value === form.lifeStage);
    const activityIndex = ACTIVITY_OPTIONS.findIndex((item) => item.value === form.activityLevel);
    
    // Set breed index
    let breedIndex = -1;
    let showOtherBreedInput = false;
    if (form.breed) {
      breedIndex = this.data.breedOptions.findIndex(b => b === form.breed);
      if (breedIndex < 0) {
        // Breed not in list, use "其它品种"
        breedIndex = 0;
        showOtherBreedInput = true;
      }
    }
    
    this.setData({
      form,
      petId: pet.id,
      isEditing: true,
      region: pet.city ? pet.city.split(' ') : [],
      sexIndex: sexIndex >= 0 ? sexIndex : 2,
      lifeStageIndex,
      activityIndex,
      breedIndex,
      showOtherBreedInput
    });
    wx.setNavigationBarTitle({
      title: `编辑${pet.name || '爱犬'}`
    });
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    let value = event.detail.value;
    if (field === 'neutered') {
      value = event.detail.value;
    }
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
      }
    );
  },

  handleSwitch(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      form: {
        ...this.data.form,
        [field]: event.detail.value
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

  handleActivityChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      form: {
        ...this.data.form,
        activityLevel: ACTIVITY_OPTIONS[index].value
      },
      activityIndex: index
    });
  },

  handleRegionChange(event) {
    const region = event.detail.value;
    this.setData({
      region,
      form: {
        ...this.data.form,
        city: region.join(' ')
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
  },

  updateEnergyEstimate() {
    const { weightKg, energyMultiplier } = this.data.form;
    const kcal = calculateEnergy(weightKg, energyMultiplier);
    this.setData({
      form: {
        ...this.data.form,
        dailyEnergyKcal: kcal || ''
      }
    });
  },

  async submitForm() {
    if (!this.data.form.name) {
      wx.showToast({ title: '请填写爱犬昵称', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const payload = { ...this.data.form };
    if (payload.weightKg === '') payload.weightKg = null;
    if (payload.energyMultiplier === '') payload.energyMultiplier = null;
    if (payload.dailyEnergyKcal === '') payload.dailyEnergyKcal = null;
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

