import { success } from '../../utils/response.js';
import {
  createCustomerOrder as createCustomerOrderService,
  createNewOrder,
  fetchCustomerOrder,
  fetchCustomerOrders,
  fetchOrder,
  fetchOrders,
  replaceOrderDetails,
  updateOrderStatusById
} from './orders.service.js';

export const listOrders = async (req, res) => {
  const filters = {
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    status: req.query.status,
    paymentStatus: req.query.paymentStatus,
    keyword: req.query.keyword
  };
  const result = await fetchOrders(filters);
  return success(res, result);
};

export const getOrder = async (req, res) => {
  const order = await fetchOrder(Number(req.params.id));
  return success(res, order);
};

export const createOrder = async (req, res) => {
  const order = await createNewOrder(req.body);
  return success(res, order, 201);
};

export const updateOrder = async (req, res) => {
  const order = await replaceOrderDetails(Number(req.params.id), req.body);
  return success(res, order);
};

export const updateOrderStatus = async (req, res) => {
  const order = await updateOrderStatusById(Number(req.params.id), req.body);
  return success(res, order);
};

export const listCustomerOrders = async (req, res) => {
  const filters = {
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    status: req.query.status
  };
  const result = await fetchCustomerOrders(req.user.id, filters);
  return success(res, result);
};

export const getCustomerOrder = async (req, res) => {
  const order = await fetchCustomerOrder(req.user.id, Number(req.params.id));
  return success(res, order);
};

export const createCustomerOrder = async (req, res) => {
  const order = await createCustomerOrderService(req.user.id, req.body);
  return success(res, order, 201);
};

