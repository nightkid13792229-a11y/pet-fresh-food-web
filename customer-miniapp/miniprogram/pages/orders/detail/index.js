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
    orderId: null,
    order: null,
    loading: true,
    error: '',
    profileCompleted: true
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      this.setData({ loading: false, error: '缺少订单 ID' });
      return;
    }
    const app = getApp();
    const completed =
      (app && app.globalData && app.globalData.profileCompleted) || false;
    this.setData({ orderId: id, profileCompleted: completed });
    if (app && typeof app.fetchProfile === 'function') {
      app.fetchProfile().finally(() => {
        this.setData({
          profileCompleted: app.globalData
            ? app.globalData.profileCompleted
            : false
        });
      });
    }
    this.loadOrder(id);
  },

  async loadOrder(id) {
    this.setData({ loading: true, error: '' });
    try {
      const order = await request({
        url: `/customer/orders/${id}`,
        method: 'GET'
      });
      this.setData({
        order: {
          ...order,
          statusLabel: STATUS_MAP[order.status] || order.status,
          paymentStatusLabel: PAYMENT_STATUS_MAP[order.paymentStatus] || order.paymentStatus,
          showMetrics: this.data.profileCompleted
        },
        loading: false
      });
    } catch (error) {
      console.error('order detail error', error);
      this.setData({ error: error.message || '加载失败', loading: false });
    }
  }
});

