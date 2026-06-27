const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'shelf_life_system_jwt_secret_key_987654321';

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization token, access denied' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token format is invalid' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Validate user existence to prevent ghost login / database foreign key constraint violations
    const userExists = await db.getUserById(decoded.id);
    if (!userExists) {
      return res.status(401).json({ message: 'User account no longer exists, please re-authenticate' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
};
