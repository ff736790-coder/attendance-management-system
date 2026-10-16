function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email address is required' });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  next();
}

function validateCreateUser(req, res, next) {
  const { email, password, role, firstName, lastName } = req.body;

  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email address is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
  }

  const validRoles = ['admin', 'faculty', 'student'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be admin, faculty, or student' });
  }

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'First name is required' });
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Last name is required' });
  }

  next();
}

module.exports = {
  validateLogin,
  validateCreateUser
};
