import { success } from '../../utils/response.js';
import { getCustomerProfile, updateCustomerProfile } from './profile.service.js';

export const getProfile = async (req, res) => {
  const profile = await getCustomerProfile(req.user.id);
  return success(res, profile);
};

export const updateProfile = async (req, res) => {
  const profile = await updateCustomerProfile(req.user.id, req.body);
  return success(res, profile);
};


