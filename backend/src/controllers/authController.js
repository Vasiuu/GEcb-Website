const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'gecb_super_secure_jwt_secret_key_12345';

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password' });
    }

    // Find user and relations
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        department: true,
        student: {
          include: {
            semester: true,
            division: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Build session token payload
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        departmentId: user.departmentId,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Format user details for client
    const responseUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department ? user.department.name : 'N/A',
      semester: (user.student && user.student.semester) ? user.student.semester.name : 'N/A',
      division: (user.student && user.student.division) ? user.student.division.name : 'N/A',
      enrollment: user.student ? user.student.enrollment : null,
    };

    return res.status(200).json({
      success: true,
      token,
      user: responseUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        student: {
          include: {
            semester: true,
            division: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const responseUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department ? user.department.name : 'N/A',
      semester: (user.student && user.student.semester) ? user.student.semester.name : 'N/A',
      division: (user.student && user.student.division) ? user.student.division.name : 'N/A',
      enrollment: user.student ? user.student.enrollment : null,
    };

    return res.status(200).json({ success: true, user: responseUser });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  login,
  getProfile,
};
