function errorHandler(err, req, res, next) {
  console.error(err.stack)

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Email already registered',
    })
  }

  const status  = err.status || 500
  const message = err.message || 'Internal server error'

  res.status(status).json({ success: false, message })
}

module.exports = { errorHandler }
