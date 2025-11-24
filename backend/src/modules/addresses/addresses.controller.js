import { success } from '../../utils/response.js';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddress,
  listCustomerAddresses,
  updateCustomerAddress,
  // 管理员专用
  listAddressesByCustomerIdAdmin,
  createAddressForCustomerAdmin,
  updateAddressForCustomerAdmin,
  deleteAddressForCustomerAdmin,
  getAddressForCustomerAdmin
} from './addresses.service.js';

export const listAddresses = async (req, res) => {
  const addresses = await listCustomerAddresses(req.user.id);
  return success(res, addresses);
};

export const createAddressHandler = async (req, res) => {
  const address = await createCustomerAddress(req.user.id, req.body);
  return success(res, address, 201);
};

export const updateAddressHandler = async (req, res) => {
  const address = await updateCustomerAddress(req.user.id, Number(req.params.id), req.body);
  return success(res, address);
};

export const deleteAddressHandler = async (req, res) => {
  await deleteCustomerAddress(req.user.id, Number(req.params.id));
  return success(res, true);
};

export const getAddressHandler = async (req, res) => {
  const address = await getCustomerAddress(req.user.id, Number(req.params.id));
  return success(res, address);
};

// 管理员专用：获取指定用户的所有地址
export const listAddressesByCustomerId = async (req, res) => {
  const customerId = Number(req.params.customerId);
  const addresses = await listAddressesByCustomerIdAdmin(customerId);
  return success(res, addresses);
};

// 管理员专用：为用户创建地址
export const createAddressForCustomer = async (req, res) => {
  const customerId = Number(req.params.customerId);
  const address = await createAddressForCustomerAdmin(customerId, req.body);
  return success(res, address, 201);
};

// 管理员专用：更新用户地址
export const updateAddressForCustomer = async (req, res) => {
  const addressId = Number(req.params.id);
  const address = await updateAddressForCustomerAdmin(addressId, req.body);
  return success(res, address);
};

// 管理员专用：删除用户地址
export const deleteAddressForCustomer = async (req, res) => {
  const addressId = Number(req.params.id);
  await deleteAddressForCustomerAdmin(addressId);
  return success(res, true);
};

// 管理员专用：获取地址详情
export const getAddressForCustomer = async (req, res) => {
  const addressId = Number(req.params.id);
  const address = await getAddressForCustomerAdmin(addressId);
  return success(res, address);
};




