import { request } from '../../../utils/request';

Page({
  data: {
    recipes: [],
    loading: false,
    error: ''
  },

  onLoad() {
    this.loadRecipes();
  },

  onShow() {
    this.loadRecipes();
  },

  async loadRecipes() {
    this.setData({ loading: true, error: '' });
    try {
      const recipes = await request({
        url: '/recipes',
        method: 'GET'
      });
      this.setData({ recipes: recipes || [], loading: false });
    } catch (error) {
      console.error('load recipes error', error);
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  },

  goToRecipeDetail(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/recipes/detail/index?id=${id}`
    });
  }
});


