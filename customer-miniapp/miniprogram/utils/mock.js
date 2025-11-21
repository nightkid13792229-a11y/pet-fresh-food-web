// Mock data for local development without backend

export const mockAddresses = [
  {
    id: 1,
    contactName: '张三',
    contactPhone: '13800000000',
    region: '上海市 徐汇区',
    detail: '漕溪北路 88 号 1201 室',
    isDefault: 1
  },
  {
    id: 2,
    contactName: '李四',
    contactPhone: '13611112222',
    region: '北京市 朝阳区',
    detail: '望京 SOHO T2-501',
    isDefault: 0
  }
];

export const mockPets = [
  {
    id: 101,
    name: 'Lucky',
    breed: '金毛犬',
    weightKg: 25
  }
];

export const mockRecipes = [
  {
    id: 301,
    name: '牛肉鲜食套餐'
  },
  {
    id: 302,
    name: '三文鱼营养餐'
  }
];

export const mockOrders = [
  {
    id: 501,
    orderNumber: 'ORD-20240101-0001',
    status: 'pending',
    statusLabel: '待处理',
    paymentStatus: 'unpaid',
    paymentStatusLabel: '未支付',
    productionDate: '2025-01-05',
    totalServings: 14,
    totalPrice: 299,
    petName: 'Lucky',
    recipeName: '牛肉鲜食套餐'
  }
];



