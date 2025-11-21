const notFound = (_req, res, _next) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
};

export default notFound;



