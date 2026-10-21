export const errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    status = 400;
    message = 'Please check the supplied details.';
  }
  if (err.code === 11000) {
    status = 409;
    message = 'This record already exists. Refresh and try again.';
  }
  if (status >= 500) {
    console.error('[API]', req.method, req.path, err.name);
    message = 'Service temporarily unavailable. Please try again shortly.';
  }
  res.status(status).json({ success: false, message });
};
export const notFoundHandler = (req, res) =>
  res.status(404).json({ success: false, message: 'This API endpoint does not exist.' });
