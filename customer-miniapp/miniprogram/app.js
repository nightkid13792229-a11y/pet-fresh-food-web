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
    } catch (error) {
      console.warn('fetch profile failed', error);
    }
  }
});

