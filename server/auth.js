import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function requireConfig() {
  if (!process.env.JWT_SECRET || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH) {
    const error = new Error('Admin authentication is not configured');
    error.status = 503;
    throw error;
  }
}

export async function loginAdmin(email, password) {
  requireConfig();
  const validEmail = email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  const validPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!validEmail || !validPassword) {
    const error = new Error('Invalid admin credentials');
    error.status = 401;
    throw error;
  }
  return jwt.sign({ role: 'admin', email: process.env.ADMIN_EMAIL }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export function requireAdmin(req, _res, next) {
  try {
    requireConfig();
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next(Object.assign(new Error('Authentication required'), { status: 401 }));
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return next(Object.assign(new Error('Invalid or expired admin session'), { status: 401, cause: error }));
  }
}
