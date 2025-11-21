import { success } from '../../utils/response.js';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddress,
  listCustomerAddresses,
  updateCustomerAddress
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



