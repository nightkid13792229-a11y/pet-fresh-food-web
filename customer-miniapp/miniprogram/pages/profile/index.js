import { request } from '../../utils/request';

const formatAddressLabel = (addr) => {
  if (!addr) return '';
  const region = addr.region ? `${addr.region} ` : '';
  return `${addr.contactName} ${addr.contactPhone} · ${region}${addr.detail}`;
};

Page({
  data: {
    user: null,
    pets: [],
    addresses: [],
    defaultAddress: null,
    loading: false,
    error: '',
    profileCompleted: false,
    editingUser: {},
    editingName: false,
    editingContactInfo: false
  },

  onShow() {
    const app = getApp();
    this.setData({
      user: app.globalData.user,
      profileCompleted: app.globalData.profileCompleted
    });
    this.loadProfileData();
    this.loadUserProfile();
  },

  async loadUserProfile() {
    try {
      const profile = await request({ url: '/customer/profile', method: 'GET' });
      this.setData({
        user: profile,
        editingUser: {
          name: profile.name || '',
          contactInfo: profile.contactInfo || ''
        }
      });
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.user = { ...app.globalData.user, ...profile };
      }
    } catch (error) {
      console.warn('load user profile failed', error);
    }
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    this.setData({
      editingUser: {
        ...this.data.editingUser,
        [field]: value
      }
    });
  },

  handleStartEdit(event) {
    const { field } = event.currentTarget.dataset;
    const editingKey = `editing${field.charAt(0).toUpperCase() + field.slice(1)}`;
    this.setData({
      [editingKey]: true,
      editingUser: {
        ...this.data.editingUser,
        [field]: this.data.user[field] || ''
      }
    });
  },

  handleCancelEdit(event) {
    const { field } = event.currentTarget.dataset;
    const editingKey = `editing${field.charAt(0).toUpperCase() + field.slice(1)}`;
    this.setData({
      [editingKey]: false,
      editingUser: {
        ...this.data.editingUser,
        [field]: this.data.user[field] || ''
      }
    });
  },

  async handleSaveField(event) {
    const { field } = event.currentTarget.dataset;
    const value = this.data.editingUser[field];
    
    if (field === 'name' && (!value || value.trim() === '')) {
      wx.showToast({ title: '请输入主人昵称', icon: 'none' });
      return;
    }

    try {
      const updateData = {
        [field]: value ? value.trim() : ''
      };
      const profile = await request({
        url: '/customer/profile',
        method: 'PUT',
        data: updateData
      });
      
      const editingKey = `editing${field.charAt(0).toUpperCase() + field.slice(1)}`;
      this.setData({
        user: profile,
        [editingKey]: false,
        editingUser: {
          ...this.data.editingUser,
          [field]: profile[field] || ''
        }
      });
      
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.user = { ...app.globalData.user, ...profile };
      }
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (error) {
      console.error('save field failed', error);
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    }
  },

  async loadProfileData() {
    this.setData({ loading: true, error: '' });
    try {
      const [pets, addresses] = await Promise.all([
        request({ url: '/customer/pets', method: 'GET' }).catch(() => []),
        request({ url: '/customer/addresses', method: 'GET' }).catch(() => [])
      ]);
      const mappedAddresses = (addresses || []).map((item) => ({
        ...item,
        isDefault: !!item.isDefault,
        label: formatAddressLabel(item)
      }));
      // 只显示默认地址
      const defaultAddr = mappedAddresses.find(addr => addr.isDefault) || null;
      this.setData({ pets, addresses: mappedAddresses, defaultAddress: defaultAddr, loading: false });
      const app = getApp();
      if (app && typeof app.fetchProfile === 'function') {
        await app.fetchProfile();
        this.setData({
          profileCompleted: app.globalData
            ? app.globalData.profileCompleted
            : false
        });
      }
    } catch (error) {
      console.warn('load profile data failed', error);
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  },


  openAddressForm() {
    wx.navigateTo({
      url: '/pages/addresses/list/index',
      events: {
        refreshAddresses: () => this.loadProfileData()
      }
    });
  },

  handleCreatePet() {
    wx.navigateTo({
      url: '/pages/pets/edit/index',
      events: {
        refreshPets: () => this.loadProfileData()
      }
    });
  },

  handleEditPet(event) {
    const pet = event.currentTarget.dataset.pet;
    const dataParam = encodeURIComponent(JSON.stringify(pet));
    wx.navigateTo({
      url: `/pages/pets/edit/index?data=${dataParam}`,
      events: {
        refreshPets: () => this.loadProfileData()
      }
    });
  },

  async handleDeletePet(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) return;
    const confirm = await wx.showModal({
      title: '删除爱犬',
      content: '确定要删除这条爱犬信息吗？',
      confirmColor: '#10B981'
    });
    if (!confirm.confirm) return;
    try {
      await request({
        url: `/customer/pets/${id}`,
        method: 'DELETE'
      });
      wx.showToast({ title: '已删除', icon: 'success' });
      const app = getApp();
      if (app && typeof app.fetchProfile === 'function') {
        await app.fetchProfile();
        this.setData({
          profileCompleted: app.globalData
            ? app.globalData.profileCompleted
            : false
        });
      }
      this.loadProfileData();
    } catch (error) {
      wx.showToast({ title: error.message || '删除失败', icon: 'none' });
    }
  }
});

