import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { register, login, loginWithWeChat, profile } from './auth.controller.js';

const router = Router();

// 公开路由：注册、登录、微信登录
router.post('/register', register);
router.post('/login', login);
router.post('/wechat-login', loginWithWeChat);

// 需要认证的路由：获取当前用户信息
router.get('/me', authenticate, profile);

export default router;
