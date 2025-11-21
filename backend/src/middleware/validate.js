// 简化版验证中间件，暂时跳过验证（因为我们在 controller 中已经做了验证）
export default (schema, source = 'body') => {
  return (req, res, next) => {
    next();
  };
};
