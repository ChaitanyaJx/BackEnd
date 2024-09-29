const express = require('express');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET_KEY || 'fallback_secret_key';
const FRONTEND_URLS = ['http://localhost:5173', 'https://skillmetric.netlify.app'];

// Middleware
app.use(express.json());
app.use(passport.initialize());

const corsOptions = {
  origin: function (origin, callback) {
    if (FRONTEND_URLS.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Ensure the db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir);
}

// Read user credentials from JSON file
const getUsersFromFile = () => {
  try {
    const filePath = path.join(__dirname, 'db', 'usersCred.json');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]');
      return [];
    }
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading user credentials file:', error);
    return [];
  }
};

// Write user credentials to JSON file
const writeUsersToFile = (users) => {
  try {
    const filePath = path.join(__dirname, 'db', 'usersCred.json');
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing user credentials file:', error);
    throw new Error('Failed to save user data');
  }
};

// Token blacklist
const tokenBlacklist = new Set();

// Passport JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: SECRET_KEY,
};

passport.use(
  new JwtStrategy(jwtOptions, (payload, done) => {
    try {
      const users = getUsersFromFile();
      const user = users.find((u) => u.id === payload.id);
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);

// Routes
app.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const users = getUsersFromFile();

    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
    };

    users.push(newUser);
    writeUsersToFile(users);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
});

app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const users = getUsersFromFile();
    const user = users.find((u) => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

app.post('/logout', passport.authenticate('jwt', { session: false }), (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  tokenBlacklist.add(token);
  res.json({ message: 'Logged out successfully' });
});

app.get('/protected', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ message: 'You have access to this protected route', user: req.user });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Allowed origins: ${FRONTEND_URLS.join(', ')}`);

});