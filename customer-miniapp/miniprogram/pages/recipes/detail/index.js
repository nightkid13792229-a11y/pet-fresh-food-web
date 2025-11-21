import { request } from '../../../utils/request';

Page({
  data: {
    recipeId: null,
    recipe: null,
    loading: true,
    error: ''
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      this.setData({ loading: false, error: '缺少食谱 ID' });
      return;
    }
    this.setData({ recipeId: id });
    this.loadRecipe(id);
  },

  async loadRecipe(id) {
    this.setData({ loading: true, error: '' });
    try {
      const recipe = await request({
        url: `/recipes/${id}`,
        method: 'GET'
      });
      this.setData({ recipe, loading: false });
    } catch (error) {
      console.error('load recipe error', error);
      this.setData({ error: error.message || '加载失败', loading: false });
    }
  }
});


