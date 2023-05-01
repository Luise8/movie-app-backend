const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('./utils/config');
const { logger } = require('./utils/logger');
const middleware = require('./utils/middleware');
const moviesRouter = require('./controllers/movies');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  app.use('/api/v1.0/movies', moviesRouter);

  app.use(middleware.unknownEndpoint);
  app.use(middleware.errorHandler);
}());

module.exports = app;
