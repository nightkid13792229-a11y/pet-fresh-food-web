import { request } from '../../../utils/request';

const DEFAULT_FORM = {
  petId: '',
  recipeId: '',
  productionDate: '',
  totalServings: 1,
  totalPrice: '',
  addressId: ''
};

const formatAddressLabel = (addr) => {
  if (!addr) return '';
  const region = addr.region ? `${addr.region} ` : '';
  return `${region}${addr.detail}`;
};

Page({
  data: {
    form: { ...DEFAULT_FORM },
    petIndex: 0,
    recipeIndex: 0,
    addressIndex: 0,
    pets: [],
    recipes: [],
    addresses: [],
    loading: false,
    submitting: false,
    error: '',
    profileCompleted: true
  },

  onLoad() {
    const app = getApp();
    const completed =
      (app && app.globalData && app.globalData.profileCompleted) || false;
    this.setData({ profileCompleted: completed });
    if (!completed) {
      this.setData({
        loading: false,
        error: '请先完善爱犬信息，完成后即可查看饭量与价格'
      });
      return;
    }
    this.loadInitialData();
  },

  async loadInitialData() {
    this.setData({ loading: true, error: '' });
    try {
      const [pets, recipes, addresses] = await Promise.all([
        request({ url: '/customer/pets', method: 'GET' }).catch(() => []),
        request({ url: '/recipes', method: 'GET' }).catch(() => []),
        request({ url: '/customer/addresses', method: 'GET' }).catch(() => [])
      ]);

      const addressList = (addresses || []).map((addr) => ({
        ...addr,
        isDefault: !!addr.isDefault,
        label: formatAddressLabel(addr)
      }));

      const defaultAddressIndex = addressList.findIndex((addr) => addr.isDefault);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const defaultDate = `${yyyy}-${mm}-${dd}`;

      this.setData({
        pets,
        recipes,
        addresses: addressList,
        loading: false,
        petIndex: pets.length ? 0 : -1,
        recipeIndex: recipes.length ? 0 : -1,
        addressIndex: addressList.length
          ? defaultAddressIndex >= 0
            ? defaultAddressIndex
            : 0
          : -1,
        form: {
          ...DEFAULT_FORM,
          petId: pets.length ? pets[0].id : '',
          recipeId: recipes.length ? recipes[0].id : '',
          productionDate: defaultDate,
          addressId:
            addressList.length && (defaultAddressIndex >= 0 ? addressList[defaultAddressIndex].id : addressList[0].id)
        }
      });
    } catch (error) {
      console.error('load initial data failed', error);
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    let value = event.detail.value;
    if (field === 'totalServings') {
      value = Number(value) || 1;
      if (value < 1) value = 1;
      value = Math.floor(value);
    }
    this.setData({
      form: {
        ...this.data.form,
        [field]: value
      }
    });
  },

  handlePickerChangePet(event) {
    if (!this.data.pets.length) return;
    const index = Number(event.detail.value);
    const pet = this.data.pets[index];
    if (!pet) return;
    this.setData({
      petIndex: index,
      form: {
        ...this.data.form,
        petId: pet.id
      }
    });
  },

  handlePickerChangeRecipe(event) {
    if (!this.data.recipes.length) return;
    const index = Number(event.detail.value);
    const recipe = this.data.recipes[index];
    if (!recipe) return;
    this.setData({
      recipeIndex: index,
      form: {
        ...this.data.form,
        recipeId: recipe.id
      }
    });
  },

  handlePickerChangeAddress(event) {
    if (!this.data.addresses.length) return;
    const index = Number(event.detail.value);
    const address = this.data.addresses[index];
    if (!address) return;
    this.setData({
      addressIndex: index,
      form: {
        ...this.data.form,
        addressId: address.id
      }
    });
  },

  handlePickerChangeDate(event) {
    const value = event.detail.value;
    this.setData({
      form: {
        ...this.data.form,
        productionDate: value
      }
    });
  },

  async submitOrder() {
    const { petId, recipeId, productionDate, totalServings, totalPrice, addressId } = this.data.form;
    if (!petId || !recipeId || !productionDate || !totalPrice) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    const priceNumber = Number(totalPrice);
    if (!(priceNumber > 0)) {
      wx.showToast({ title: '金额需大于0', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await request({
        url: '/customer/orders',
        method: 'POST',
        data: {
          petId: Number(petId),
          recipeId: Number(recipeId),
          productionDate,
          totalServings: Number(totalServings),
          totalPrice: priceNumber,
          addressId: addressId ? Number(addressId) : undefined
        }
      });
      wx.showToast({ title: '订单已创建', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 800);
    } catch (error) {
      console.error('create order failed', error);
      wx.showToast({ title: error.message || '创建失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});

