import { request } from '../../../utils/request';

Page({
  data: {
    addressId: null,
    form: {
      contactName: '',
      contactPhone: '',
      region: '',
      detail: '',
      isDefault: false
    },
    regionValue: [],
    loading: false,
    submitting: false,
    error: ''
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ addressId: id });
      this.loadAddress(id);
    }
  },

  async loadAddress(id) {
    this.setData({ loading: true, error: '' });
    try {
      const address = await request({
        url: `/customer/addresses/${id}`,
        method: 'GET'
      });
      const regionArray = address.region ? address.region.split(' ') : [];
      this.setData({
        form: {
          contactName: address.contactName || '',
          contactPhone: address.contactPhone || '',
          region: address.region || '',
          detail: address.detail || '',
          isDefault: !!address.isDefault
        },
        regionValue: regionArray,
        loading: false
      });
    } catch (error) {
      console.error('load address error', error);
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    this.setData({
      form: {
        ...this.data.form,
        [field]: value
      }
    });
  },

  handleRegionChange(event) {
    const value = event.detail.value;
    const region = value.join(' ');
    this.setData({
      regionValue: value,
      form: {
        ...this.data.form,
        region
      }
    });
  },

  handleSwitchChange(event) {
    const value = event.detail.value;
    this.setData({
      form: {
        ...this.data.form,
        isDefault: value
      }
    });
  },

  async handleSubmit() {
    const { contactName, contactPhone, detail } = this.data.form;
    if (!contactName || contactName.trim() === '') {
      wx.showToast({ title: '请输入联系人姓名', icon: 'none' });
      return;
    }
    if (!contactPhone || contactPhone.trim() === '') {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    if (!detail || detail.trim() === '') {
      wx.showToast({ title: '请输入详细地址', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const data = {
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        region: this.data.form.region || '',
        detail: detail.trim(),
        isDefault: this.data.form.isDefault
      };

      if (this.data.addressId) {
        await request({
          url: `/customer/addresses/${this.data.addressId}`,
          method: 'PUT',
          data
        });
        wx.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await request({
          url: '/customer/addresses',
          method: 'POST',
          data
        });
        wx.showToast({ title: '添加成功', icon: 'success' });
      }

      // 通知地址列表页刷新
      const pages = getCurrentPages();
      if (pages.length > 1) {
        const prevPage = pages[pages.length - 2];
        if (prevPage && typeof prevPage.loadAddresses === 'function') {
          prevPage.loadAddresses();
        }
        // 如果地址列表页的上上一页是"我的爱犬"页面，也通知它刷新
        if (pages.length > 2) {
          const profilePage = pages[pages.length - 3];
          if (profilePage && typeof profilePage.loadProfileData === 'function') {
            profilePage.loadProfileData();
          }
        }
      }
      setTimeout(() => {
        wx.navigateBack();
      }, 800);
    } catch (error) {
      console.error('save address error', error);
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});

