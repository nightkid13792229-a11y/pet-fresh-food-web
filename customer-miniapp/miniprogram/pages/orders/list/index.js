import { request } from '../../../utils/request';

const STATUS_MAP = {
  pending: '待处理',
  paid: '已付款',
  in_production: '制作中',
  ready: '待发货',
  shipped: '运输中',
  completed: '已完成',
  cancelled: '已取消'
};

const PAYMENT_STATUS_MAP = {
  unpaid: '未支付',
  paid: '已支付',
  refunding: '退款中',
  refunded: '已退款'
};

Page({
  data: {
    orders: [],
    loading: false,
    error: '',
    page: 1,
    pageSize: 20,
    totalPages: 1,
    profileCompleted: true
  },

  onShow() {
    const app = getApp();
    const completed =
      (app && app.globalData && app.globalData.profileCompleted) || false;
    this.setData({ profileCompleted: completed });
    if (app && typeof app.fetchProfile === 'function') {
      app.fetchProfile().finally(() => {
        this.setData({
          profileCompleted: app.globalData
            ? app.globalData.profileCompleted
            : false
        });
      });
    }
    this.loadOrders(1);
  },

  async loadOrders(page) {
    if (this.data.loading) return;
    this.setData({ loading: true, error: '' });
    try {
      const result = await request({
        url: '/customer/orders',
        method: 'GET',
        data: { page, pageSize: this.data.pageSize }
      });
      const items = (result.items || []).map((order) => ({
        ...order,
        statusLabel: STATUS_MAP[order.status] || order.status,
        paymentStatusLabel: PAYMENT_STATUS_MAP[order.paymentStatus] || order.paymentStatus,
        showMetrics: this.data.profileCompleted
      }));
      this.setData({
        orders: page === 1 ? items : [...this.data.orders, ...items],
        page: result.pagination.page,
        totalPages: result.pagination.totalPages,
        loading: false
      });
    } catch (error) {
      console.error('load orders error', error);
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  },

  onReachBottom() {
    if (this.data.page < this.data.totalPages) {
      this.loadOrders(this.data.page + 1);
    }
  },

  goDetail(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/orders/detail/index?id=${id}`
    });
  },

  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/index'
    });
  }
});

