import { request } from './utils/request';
import { getToken, setToken, clearToken } from './utils/storage';
import { API_BASE_URL } from './config';

App({
  globalData: {
    user: null,
    token: null,
    apiBaseUrl: API_BASE_URL,
    profileCompleted: false
  },

  async onLaunch() {
    const cached = getToken();
    if (cached && cached.token) {
      this.globalData.token = cached.token;
      this.globalData.user = cached.user;
      this.globalData.profileCompleted = !!cached.profileCompleted;
      await this.fetchProfile();
    } else {
      this.loginWithWeChat();
    }
  },

  loginWithWeChat() {
    wx.login({
      success: async ({ code }) => {
        if (!code) {
          wx.showToast({ title: '登录失败', icon: 'none' });
          return;
        }
        try {
          const data = await request({
            url: '/auth/wechat-login',
            method: 'POST',
            data: { code },
            skipAuth: true
          });
          if (!data || !data.token) {
            wx.showToast({ title: '登录失败', icon: 'none' });
            return;
          }
          this.globalData.token = data.token;
          this.globalData.user = data.user;
          this.globalData.profileCompleted =
            data && data.user ? !!data.user.profileCompleted : false;
          setToken({
            token: data.token,
            user: data.user,
            profileCompleted: this.globalData.profileCompleted
          });
          await this.fetchProfile();
        } catch (error) {
          console.error('login error', error);
          wx.showModal({
            title: '授权失败',
            content: '无法完成微信授权登录，请点击重试或稍后再试。',
            showCancel: false
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  logout() {
    clearToken();
    this.globalData.token = null;
    this.globalData.user = null;
    this.globalData.profileCompleted = false;
    this.loginWithWeChat();
  },

  async fetchProfile() {
    if (!this.globalData.token) {
      return;
    }
    try {
      const profile = await request({
        url: '/customer/profile',
        method: 'GET'
      });
      if (profile) {
        this.globalData.profileCompleted = !!profile.profileCompleted;
        const cached = getToken();
        if (cached) {
          setToken({
            ...cached,
            profileCompleted: this.globalData.profileCompleted
          });
        }
      }
      
      // 检查幼年期爱犬的15天提醒
      await this.checkPuppyReminder();
    } catch (error) {
      console.warn('fetch profile failed', error);
    }
  },

  async checkPuppyReminder() {
    try {
      // 获取爱犬列表
      const pets = await request({
        url: '/customer/pets',
        method: 'GET'
      });
      
      if (!pets || !Array.isArray(pets) || pets.length === 0) {
        return;
      }
      
      // 计算月龄的函数（复制自编辑页面）
      const calculateAgeMonths = (birthdate) => {
        if (!birthdate) return null;
        const birth = new Date(birthdate);
        if (isNaN(birth.getTime())) return null;
        const now = new Date();
        const years = now.getFullYear() - birth.getFullYear();
        const months = now.getMonth() - birth.getMonth();
        return years * 12 + months;
      };
      
      // 获取品种数据以判断成熟月龄
      let breedsData = [];
      try {
        const breedsResponse = await request({
          url: '/breeds',
          method: 'GET'
        });
        breedsData = Array.isArray(breedsResponse) ? breedsResponse : (breedsResponse.items || []);
      } catch (error) {
        console.warn('load breeds for reminder failed', error);
      }
      
      // 检查是否有幼年期的爱犬
      const puppyPets = pets.filter(pet => {
        if (!pet.birthdate) {
          return false;
        }
        
        // 如果明确标记为幼年期
        if (pet.lifeStage === 'puppy') {
          return true;
        }
        
        // 如果没有生命阶段数据，尝试根据生日和品种计算
        if (pet.breed && breedsData.length > 0) {
          const breedData = breedsData.find(b => b.name === pet.breed);
          if (breedData && breedData.maturityMonths) {
            const ageMonths = calculateAgeMonths(pet.birthdate);
            if (ageMonths !== null && ageMonths < breedData.maturityMonths) {
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (puppyPets.length === 0) {
        return;
      }
      
      // 检查上次提醒时间（每个爱犬单独记录）
      const now = Date.now();
      const fifteenDays = 15 * 24 * 60 * 60 * 1000; // 15天的毫秒数
      
      // 找出需要提醒的爱犬（距离上次提醒超过15天）
      const petsToRemind = puppyPets.filter(pet => {
        const lastReminderKey = `puppy_reminder_${pet.id}`;
        const lastReminderTime = wx.getStorageSync(lastReminderKey);
        
        // 如果从未提醒过，或者距离上次提醒超过15天
        return !lastReminderTime || (now - lastReminderTime) >= fifteenDays;
      });
      
      if (petsToRemind.length === 0) {
        return;
      }
      
      // 显示提醒
      const petNames = petsToRemind.map(p => p.name || '爱犬').join('、');
      wx.showModal({
        title: '成长提醒',
        content: `小家伙又长大了，需要更新${petNames}的体重等信息吗？`,
        confirmText: '去更新',
        cancelText: '稍后',
        success: (res) => {
          // 更新每个爱犬的提醒时间
          petsToRemind.forEach(pet => {
            const lastReminderKey = `puppy_reminder_${pet.id}`;
            wx.setStorageSync(lastReminderKey, now);
          });
          
          if (res.confirm) {
            // 跳转到我的爱犬页面
            wx.switchTab({
              url: '/pages/profile/index'
            });
          }
        }
      });
    } catch (error) {
      console.warn('check puppy reminder failed', error);
    }
  }
});

