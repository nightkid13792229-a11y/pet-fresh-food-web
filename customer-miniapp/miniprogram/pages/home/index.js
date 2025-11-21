Page({
  data: {
    profileCompleted: false
  },

  onShow() {
    const app = getApp();
    this.setData({
      profileCompleted: app.globalData.profileCompleted || false
    });
  },

  goToRecipes() {
    wx.switchTab({
      url: '/pages/recipes/list/index'
    });
  },

  goToOrders() {
    wx.switchTab({
      url: '/pages/orders/list/index'
    });
  },

  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/index'
    });
  }
});


