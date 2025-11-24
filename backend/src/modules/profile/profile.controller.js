import { success } from '../../utils/response.js';
import { getCustomerProfile, updateCustomerProfile } from './profile.service.js';

export const getProfile = async (req, res, next) => {
  try {
    const profile = await getCustomerProfile(req.user.id);
    return success(res, profile);
  } catch (error) {
    console.error('getProfile error:', error);
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const profile = await updateCustomerProfile(req.user.id, req.body);
    return success(res, profile);
  } catch (error) {
    console.error('updateProfile error:', error);
    next(error);
  }
};


