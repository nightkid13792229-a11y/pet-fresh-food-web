import createError from 'http-errors';
import { getRecipeById } from '../recipes/recipes.repository.js';
import { findPetById } from '../pets/pets.repository.js';
import {
  createOrder,
  findOrders,
  getOrderById,
  replaceOrderItems,
  updateOrder,
  updateOrderStatus
} from './orders.repository.js';

export const fetchOrders = async ({ page = 1, pageSize = 20, status, paymentStatus, keyword, customerId }) => {
  const { rows, total, limit, offset, page: currentPage } = await findOrders({
    page,
    pageSize,
    status,
    paymentStatus,
    keyword,
    customerId
  });
  return {
    items: rows,
    pagination: {
      page: currentPage,
      pageSize: limit,
      offset,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

export const fetchOrder = async (id) => {
  const order = await getOrderById(id);
  if (!order) {
    throw createError(404, 'Order not found');
  }
  return order;
};

export const createNewOrder = async (payload) => {
  const orderNumber =
    payload.orderNumber ?? `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { items = [], ...rest } = payload;
  const order = await createOrder({ ...rest, orderNumber });
  if (items.length) {
    await replaceOrderItems(order.id, items);
  }
  return fetchOrder(order.id);
};

export const replaceOrderDetails = async (id, payload) => {
  const existing = await getOrderById(id);
  if (!existing) {
    throw createError(404, 'Order not found');
  }

  const updated = await updateOrder(id, payload);
  if (payload.items) {
    await replaceOrderItems(id, payload.items);
  }

  if (!updated && !payload.items) {
    throw createError(400, 'No changes provided');
  }

  return fetchOrder(id);
};

export const updateOrderStatusById = async (id, changes) => {
  const updated = await updateOrderStatus(id, changes);
  if (!updated) {
    throw createError(404, 'Order not found or nothing to update');
  }
  return fetchOrder(id);
};

export const fetchCustomerOrders = async (customerId, { page = 1, pageSize = 20, status }) => {
  return fetchOrders({ page, pageSize, status, customerId });
};

export const fetchCustomerOrder = async (customerId, orderId) => {
  const order = await getOrderById(orderId);
  if (!order || order.customerId !== customerId) {
    throw createError(404, 'Order not found');
  }
  return order;
};

export const createCustomerOrder = async (customerId, payload) => {
  const pet = await findPetById(payload.petId);
  if (!pet || pet.userId !== customerId) {
    throw createError(400, 'Invalid pet selection');
  }
  const recipe = await getRecipeById(payload.recipeId);
  if (!recipe) {
    throw createError(400, 'Recipe not found');
  }
  const productionDate = new Date(payload.productionDate);
  if (Number.isNaN(productionDate.getTime())) {
    throw createError(400, 'Invalid production date');
  }
  if (!(payload.totalServings > 0) || !Number.isFinite(Number(payload.totalServings))) {
    throw createError(400, 'Invalid servings');
  }
  if (!(payload.totalPrice > 0) || !Number.isFinite(Number(payload.totalPrice))) {
    throw createError(400, 'Invalid price');
  }

  const orderPayload = {
    customerId,
    petId: payload.petId,
    recipeId: payload.recipeId,
    productionDate: productionDate.toISOString().split('T')[0],
    totalServings: Number(payload.totalServings),
    totalPrice: Number(payload.totalPrice),
    status: 'pending',
    paymentStatus: 'unpaid',
    items: payload.items || []
  };

  const order = await createNewOrder(orderPayload);
  if (order.customerId !== customerId) {
    throw createError(500, 'Order ownership mismatch');
  }
  return order;
};

