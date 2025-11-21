const TOKEN_KEY = 'pf_token_v1';

export const setToken = (payload) => {
  try {
    wx.setStorageSync(TOKEN_KEY, payload);
  } catch (error) {
    console.warn('set token failed', error);
  }
};

export const getToken = () => {
  try {
    return wx.getStorageSync(TOKEN_KEY);
  } catch (error) {
    console.warn('get token failed', error);
    return null;
  }
};

export const clearToken = () => {
  try {
    wx.removeStorageSync(TOKEN_KEY);
  } catch (error) {
    console.warn('clear token failed', error);
  }
};



