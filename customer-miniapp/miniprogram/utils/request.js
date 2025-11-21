import { API_BASE_URL, REQUEST_TIMEOUT } from '../config';
import { getToken } from './storage';
import { mockAddresses, mockOrders, mockPets, mockRecipes } from './mock';

const ENABLE_MOCK = false;

const handleMockRequest = ({ url, method, data }) => {
  if (url === '/customer/orders' && method === 'GET') {
    return Promise.resolve({
      items: mockOrders,
      pagination: {
        page: 1,
        pageSize: mockOrders.length,
        total: mockOrders.length,
        totalPages: 1
      }
    });
  }
  if (url === '/customer/orders' && method === 'POST') {
    return Promise.resolve({
      ...data,
      id: Math.floor(Math.random() * 10000),
      status: 'pending',
      paymentStatus: 'unpaid'
    });
  }
  if (url.startsWith('/customer/orders/') && method === 'GET') {
    const id = Number(url.split('/').pop());
    const order = mockOrders.find((o) => o.id === id) || mockOrders[0];
    return Promise.resolve(order);
  }
  if (url === '/customer/pets') {
    return Promise.resolve(mockPets);
  }
  if (url === '/recipes') {
    return Promise.resolve(mockRecipes);
  }
  if (url === '/customer/addresses') {
    return Promise.resolve(mockAddresses);
  }
  return Promise.resolve({});
};

export const request = ({ url, method = 'GET', data = {}, skipAuth = false }) => {
  const app = getApp();
  const cached = getToken();
  const appToken = app && app.globalData ? app.globalData.token : null;
  const token = appToken || (cached && cached.token ? cached.token : null);

  if (ENABLE_MOCK) {
    return handleMockRequest({ url, method, data });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`,
      method,
      data,
      timeout: REQUEST_TIMEOUT,
      header: {
        'Content-Type': 'application/json',
        ...(skipAuth
          ? {}
          : token
            ? { Authorization: `Bearer ${token}` }
            : {})
      },
      success: (res) => {
        if (res.statusCode === 401) {
          if (!skipAuth && app && typeof app.logout === 'function') {
            app.logout();
          }
          reject(new Error('未授权，请重新登录'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (res.data && Object.prototype.hasOwnProperty.call(res.data, 'data')) {
            resolve(res.data.data);
          } else {
            resolve(res.data);
          }
        } else {
          const message =
            res.data && res.data.message ? res.data.message : '请求失败';
          reject(new Error(message));
        }
      },
      fail: (err) => reject(err)
    });
  });
};


