import createError from 'http-errors';
import {
  clearDefaultFlag,
  createAddress,
  deleteAddress,
  findAddressById,
  findAddressesByCustomer,
  findLatestAddressByCustomer,
  updateAddress
} from './addresses.repository.js';

export const listCustomerAddresses = async (customerId) => {
  return findAddressesByCustomer(customerId);
};

export const createCustomerAddress = async (customerId, payload) => {
  if (payload.isDefault) {
    await clearDefaultFlag(customerId);
  }
  const { id } = await createAddress({ customerId, ...payload });
  return findAddressById(id);
};

export const updateCustomerAddress = async (customerId, addressId, payload) => {
  const address = await findAddressById(addressId);
  if (!address || address.customerId !== customerId) {
    throw createError(404, 'Address not found');
  }

  if (payload.isDefault) {
    await clearDefaultFlag(customerId, addressId);
  }

  const updated = await updateAddress(addressId, payload);
  if (!updated && !payload.isDefault) {
    throw createError(400, 'No changes provided');
  }

  return findAddressById(addressId);
};

export const deleteCustomerAddress = async (customerId, addressId) => {
  const address = await findAddressById(addressId);
  if (!address || address.customerId !== customerId) {
    throw createError(404, 'Address not found');
  }

  const wasDefault = address.isDefault;
  const removed = await deleteAddress(addressId);
  if (!removed) {
    throw createError(500, 'Failed to delete address');
  }

  // 如果删除的是默认地址，且还有其他地址，将最近添加的地址设为默认
  if (wasDefault) {
    const latestAddress = await findLatestAddressByCustomer(customerId, addressId);
    if (latestAddress) {
      await updateAddress(latestAddress.id, { isDefault: true });
    }
  }

  return true;
};

export const getCustomerAddress = async (customerId, addressId) => {
  const address = await findAddressById(addressId);
  if (!address || address.customerId !== customerId) {
    throw createError(404, 'Address not found');
  }
  return address;
};

// 管理员专用：获取指定用户的所有地址（不检查customerId匹配）
export const listAddressesByCustomerIdAdmin = async (customerId) => {
  return findAddressesByCustomer(customerId);
};

// 管理员专用：为用户创建地址
export const createAddressForCustomerAdmin = async (customerId, payload) => {
  if (payload.isDefault) {
    await clearDefaultFlag(customerId);
  }
  const { id } = await createAddress({ customerId, ...payload });
  return findAddressById(id);
};

// 管理员专用：更新用户地址（不检查customerId匹配）
export const updateAddressForCustomerAdmin = async (addressId, payload) => {
  const address = await findAddressById(addressId);
  if (!address) {
    throw createError(404, 'Address not found');
  }

  if (payload.isDefault) {
    await clearDefaultFlag(address.customerId, addressId);
  }

  const updated = await updateAddress(addressId, payload);
  if (!updated && !payload.isDefault) {
    throw createError(400, 'No changes provided');
  }

  return findAddressById(addressId);
};

// 管理员专用：删除用户地址（不检查customerId匹配）
export const deleteAddressForCustomerAdmin = async (addressId) => {
  const address = await findAddressById(addressId);
  if (!address) {
    throw createError(404, 'Address not found');
  }

  const wasDefault = address.isDefault;
  const customerId = address.customerId;
  const removed = await deleteAddress(addressId);
  if (!removed) {
    throw createError(500, 'Failed to delete address');
  }

  // 如果删除的是默认地址，且还有其他地址，将最近添加的地址设为默认
  if (wasDefault) {
    const latestAddress = await findLatestAddressByCustomer(customerId, addressId);
    if (latestAddress) {
      await updateAddress(latestAddress.id, { isDefault: true });
    }
  }

  return true;
};

// 管理员专用：获取地址详情（不检查customerId匹配）
export const getAddressForCustomerAdmin = async (addressId) => {
  const address = await findAddressById(addressId);
  if (!address) {
    throw createError(404, 'Address not found');
  }
  return address;
};


