const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data: data
  });
};

module.exports = { success };
