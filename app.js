const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const axios = require('axios');
const config = require('./utils/config');
const { logger } = require('./utils/logger');
const middleware = require('./utils/middleware');
const moviesRouter = require('./controllers/movies');
const authRouter = require('./controllers/auth');
const usersRouter = require('./controllers/users');
const passport = require('./utils/passport');

const app = express();

(async function () {
  mongoose.set('strictQuery', false);
  let sessionStore;
  await mongoose.connect(config.MONGODB_URI)
    .then((res) => {
      const { client } = res.connection;
      sessionStore = MongoStore.create({ client });
      logger.info('connected to MongoDB');
    })
    .catch((error) => {
      logger.info('error connecting to MongoDB:', error.message);
    });

  const corsOptions = {
    origin: [process.env.ORIGIN_FRONTEND],
    credentials: true, // access-control-allow-credentials:true
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    // Equals 1 day (1 day * 24 hr / 1 day * 60 min/ 1 hr * 60 sec/ 1 min * 1000 ms / 1 sec)
    },
    store: sessionStore,
  }));

  app.use(morgan('dev', { stream: logger.stream }));
  app.use(helmet());
  app.use(compression()); // Compress all routes
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(middleware.rateLimiter());
  // Security checks with reCAPTCHA. Comment this middleware to run rest client tests
  app.use(async (req, res, next) => {
    try {
      logger.http(req.ip);
      logger.http(req.headers.referer);
      if (!req.headers?.referer
        || req.headers?.referer !== `${process.env.ORIGIN_FRONTEND}/`) return res.status(401).end();
      if (!req.headers?.recaptcha || typeof req.headers?.recaptcha !== 'string') return res.status(401).end();
      const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.SECRET_KEY}&response=${req.headers.recaptcha}`;
      const response = await axios.post(url);
      logger.http('🚀 ~ file: app.js:65 ~ app.use ~ response.data: %O', response.data);
      if (response.data?.success === false) return res.status(401).end();
      return next();
    } catch (error) {
      return next(error);
    }
  });

  app.use('/api/v1.0/movies', moviesRouter);
  app.use('/api/v1.0/auth', authRouter);
  app.use('/api/v1.0/users', usersRouter);

  app.use(middleware.unknownEndpoint);
  app.use(middleware.errorHandler);
}());

module.exports = app;
