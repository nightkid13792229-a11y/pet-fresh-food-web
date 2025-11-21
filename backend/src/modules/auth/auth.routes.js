const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { register, login, loginWithWeChat, profile } = require('./auth.controller');

const router = express.Router();

// 公开路由：注册、登录、微信登录
router.post('/register', register);
router.post('/login', login);
router.post('/wechat-login', loginWithWeChat);

// 需要认证的路由：获取当前用户信息
router.get('/me', authenticate, profile);

module.exports = router;
