import { request } from '../../../utils/request';

const formatAddressLabel = (addr) => {
  if (!addr) return '';
  const region = addr.region ? `${addr.region} ` : '';
  return `${addr.contactName} ${addr.contactPhone} · ${region}${addr.detail}`;
};

Page({
  data: {
    addresses: [],
    loading: false,
    error: ''
  },

  onShow() {
    this.loadAddresses();
  },

  onUnload() {
    // 页面卸载时通知上一页刷新
    this.notifyPrevPageRefresh();
  },

  async loadAddresses() {
    this.setData({ loading: true, error: '' });
    try {
      const addresses = await request({
        url: '/customer/addresses',
        method: 'GET'
      });
      const mappedAddresses = (addresses || []).map((item) => ({
        ...item,
        isDefault: !!item.isDefault,
        label: formatAddressLabel(item)
      }));
      this.setData({ addresses: mappedAddresses, loading: false });
    } catch (error) {
      console.error('load addresses error', error);
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  },

  handleAddAddress() {
    wx.navigateTo({
      url: '/pages/addresses/edit/index'
    });
  },

  handleEditAddress(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/addresses/edit/index?id=${id}`
    });
  },

  async handleSetDefault(event) {
    const { id } = event.currentTarget.dataset;
    try {
      await request({
        url: `/customer/addresses/${id}`,
        method: 'PUT',
        data: { isDefault: true }
      });
      wx.showToast({ title: '已设为默认地址', icon: 'success' });
      this.loadAddresses();
      // 立即通知上一页刷新
      this.notifyPrevPageRefresh();
    } catch (error) {
      console.error('set default address error', error);
      wx.showToast({ title: error.message || '设置失败', icon: 'none' });
    }
  },

  notifyPrevPageRefresh() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      if (prevPage && typeof prevPage.loadProfileData === 'function') {
        prevPage.loadProfileData();
      }
    }
  },

  async handleDeleteAddress(event) {
    const { id } = event.currentTarget.dataset;
    const confirm = await wx.showModal({
      title: '删除地址',
      content: '确定要删除这个地址吗？',
      confirmColor: '#10B981'
    });
    if (!confirm.confirm) return;

    try {
      await request({
        url: `/customer/addresses/${id}`,
        method: 'DELETE'
      });
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadAddresses();
      // 通知上一页刷新
      this.notifyPrevPageRefresh();
    } catch (error) {
      console.error('delete address error', error);
      wx.showToast({ title: error.message || '删除失败', icon: 'none' });
    }
  }
});

