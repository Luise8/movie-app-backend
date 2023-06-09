require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const request = require('supertest');
const session = require('express-session');
const app = require('./app-helper');

const { dbDisconnect, initializeMongoServer } = require('./mongo-config-testing');
const {
  initialUsers,
  initialRates,
  initialReviews,
  addInitialUsers,
  addInitialLists,
  addInitialWatchlists,
  addInitialRates,
  addInitialProfilePhotos,
  addInitialMovies,
  addInitialReviews,
} = require('./test-db-helper');
const authRouter = require('../controllers/auth');
const usersRouter = require('../controllers/users');
const User = require('../models/user');
const List = require('../models/list');
const Watchlist = require('../models/watchlist');
const ProfilePhoto = require('../models/profilePhoto');
const Review = require('../models/review');
const Rate = require('../models/rate');
const Movie = require('../models/movie');
const passport = require('../utils/passport');
const middleware = require('../utils/middleware');

beforeAll(async () => {
  const sessionStore = await initializeMongoServer();
  app.use(session({
    secret: 'secretTest',
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    // Equals 1 day (1 day * 24 hr / 1 day * 60 min/ 1 hr * 60 sec/ 1 min * 1000 ms / 1 sec)
    },
    store: sessionStore,
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  app.use('/api/v1.0/auth', authRouter);
  app.use('/api/v1.0/users', usersRouter);
  app.use(middleware.unknownEndpoint);
  app.use(middleware.errorHandler);
});
const api = request.agent(app);

beforeEach(async () => {
  // To remove the session after every test
  await api
    .post('/api/v1.0/auth/logout').send();
});

describe('when there is initially some users saved in db', () => {
  describe('users routes', () => {
    beforeAll(async () => {
      await addInitialMovies();
      await addInitialReviews();
      await addInitialRates();
    });

    beforeEach(async () => {
      await addInitialUsers();
      await addInitialProfilePhotos();
      await addInitialLists();
      await addInitialWatchlists();
    });

    describe('get user', () => {
      it('succeeds with existing user that is returned as json', async () => {
        await api
          .get(`/api/v1.0/users/${initialUsers[0]._id}`)
          .expect(200)
          .expect('Content-Type', /application\/json/);
      });

      it('returned right data of user', async () => {
        // Add one rate, review and list,
        // these must be the first elements
        // of arrays reviews, lists and rates.

        const resNotOwner = await api
          .get(`/api/v1.0/users/${initialUsers[0]._id}`)
          .expect(200)
          .expect('Content-Type', /application\/json/);

        const {
          _id, passwordHash, lists, ...user
        } = initialUsers[0];

        expect(resNotOwner.body).toMatchObject({
          id: _id,
          ...user,
          photo: null,
          watchlist: null,
        });

        // Limit to each array to max 2 items
        expect(resNotOwner.body.lists.length).toBeLessThan(3);
        expect(resNotOwner.body.rates.length).toBeLessThan(3);
        expect(resNotOwner.body.reviews.length).toBeLessThan(3);

        // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[0].username,
            password: initialUsers[0].username, // The password is the same that username
          });

        // Getting his own user
        const resOwner = await api
          .get(`/api/v1.0/users/${initialUsers[0]._id}`)
          .expect(200)
          .expect('Content-Type', /application\/json/);

        // watchlist is showing to owner
        expect(resOwner.body).toMatchObject({
          id: _id,
          ...user,
          photo: null,
        });
      });

      it('fails with statuscode 404 if user does not exist', async () => {
        const newUser = new User({
          username: `userNumber${initialUsers.length}`,
          bio: '',
          date: new Date().toISOString(),
          passwordHash: bcrypt.hashSync(`userNumber${initialUsers.length}`, Number(process.env.saltRounds)),
          watchlist: new mongoose.Types.ObjectId().toString(),
          photo: new mongoose.Types.ObjectId().toString(),
        });

        await newUser.save();
        await newUser.deleteOne({});

        await api
          .post(`/api/v1.0/users/${newUser.id}`).expect(404);
      });
    });

    describe('create user', () => {
      it('succeeds with valid data', async () => {
        const res = await api
          .post('/api/v1.0/users')
          .send({
            username: `userNumber${initialUsers.length}`,
            password: `userNumber${initialUsers.length}`, // The password is the same that username
          })
          .expect(201)
          .expect('Content-Type', /application\/json/);

        // The info of the new user
        expect(res.body).toMatchObject({ username: `userNumber${initialUsers.length}` });
        const newUserCount = await User.find().count();
        expect(newUserCount).toBe(initialUsers.length + 1);
      });

      it('fails with status 400 and errors prop with errors if data is invalid', async () => {
        const res = await api
          .post('/api/v1.0/users')
          .send({
            username: 'u',
            password: `userNu  mber${initialUsers.length}`,
          })
          .expect(400);

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors.length).toBeGreaterThan(0);

        const newUserCount = await User.find().count();
        expect(newUserCount).toBe(initialUsers.length);
      });
    });

    describe('edit user', () => {
      it('successful with return of new user data', async () => {
      // To check the initial photo is null
        const resFirstCheck = await api.get(`/api/v1.0/users/${initialUsers[0]._id}`);

        // The photo was retrurned as null when there is not an image uploaded
        expect(resFirstCheck.body).toMatchObject({
          photo: null,
        });

        // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[0].username,
            password: initialUsers[0].username, // The password is the same that username
          });

        const newUserData = {
          username: 'userNumber0Change1',
          password: 'passwordChanged',
          bio: 'Bio of the user 0     remove unnecessary spaces',
          correctedBio: 'Bio of the user 0 remove unnecessary spaces',
        };
        const resUpdate = await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', 'userNumber0Change1')
          .field('password', 'passwordChanged')
          .field('bio', 'Bio of the user 0     remove unnecessary spaces')
          .attach('photo', `${__dirname}/1.jpg`)
          .expect(200);

        // Right response with new data
        expect(resUpdate.body).toMatchObject({
          username: newUserData.username,
          bio: newUserData.correctedBio,
          id: initialUsers[0]._id,
        });

        // To check the data was update in db
        const resUserUpdate = await api.get(`/api/v1.0/users/${initialUsers[0]._id}`);

        // The photo was retrurned as a string of image in base64
        // and the photo was correctly converted in jpeg
        expect(resUserUpdate.body).toMatchObject({
          username: newUserData.username,
          bio: newUserData.correctedBio,
          id: initialUsers[0]._id,
          photo: expect.any(String),
        });
        expect(resUserUpdate.body.photo).toMatch('data:image/jpeg;base64');

        // Logout
        await api
          .post('/api/v1.0/auth/logout');

        // To check the password was changed
        // Login
        const resCheckPassword = await api
          .post('/api/v1.0/auth/login')
          .send({
            username: newUserData.username, // new username
            password: newUserData.password, // new password
          }).expect(200);

        // Successful login, that mean right password, so password was changed
        expect(resCheckPassword.body).toEqual({
          currentSession: {
            isAuth: true,
            userId: initialUsers[0]._id,
          },
        });
      });

      it('fails with status code 400 if the inputs are invalids', async () => {
      // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[0].username,
            password: initialUsers[0].username, // The password is the same that username
          });

        // To check for no changes later
        const resInitialUser = await api.get(`/api/v1.0/users/${initialUsers[0]._id}`);

        const newUserData = {
          username: 'userNumber0Change1',
          password: 'passwordChanged',
          bio: 'Bio of the user 0     remove unnecessary spaces',
          correctedBio: 'Bio of the user 0 remove unnecessary spaces',
        };

        // Fail - missing field
        await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', newUserData.username)
          .attach('photo', `${__dirname}/1.jpg`)
          .expect(400)
          .expect({
            error: 'missing fields',
          });

        // Fail - file too large
        await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', newUserData.username)
          .field('password', newUserData.password)
          .field('bio', newUserData.bio)
          .attach('photo', `${__dirname}/3.jpg`)
          .expect(400)
          .expect({
            error: 'File too large',
          });

        // Fail - wrong file type extension (name)
        await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', newUserData.username)
          .field('password', newUserData.password)
          .field('bio', newUserData.bio)
          .attach('photo', `${__dirname}/4.svg`)
          .expect(400)
          .expect({
            error: 'Invalid file. Must be an image jpeg|jpg|png|gif. Make sure the file have the correct name extension and the Content-Type is correct',
          });

        // Fail - validation - password too short
        const resValidation = await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', newUserData.username)
          .field('password', '1')
          .field('bio', newUserData.bio)
          .attach('photo', `${__dirname}/1.jpg`)
          .expect(400);

        expect(resValidation.body.errors).toBeDefined();
        expect(resValidation.body.errors.length).toBeGreaterThan(0);

        // Fail - wrong file type (pdf with valid name extension 5.png)
        await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', newUserData.username)
          .field('password', newUserData.password)
          .field('bio', newUserData.bio)
          .attach('photo', `${__dirname}/5.png`)
          .expect(400)
          .expect({
            error: 'Invalid file. Must be an image jpeg|jpg|png|gif',
          });

        // Fail - username taken
        await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', initialUsers[1].username)
          .field('password', newUserData.password)
          .field('bio', newUserData.bio)
          .attach('photo', `${__dirname}/5.png`)
          .expect(400)
          .expect({
            error: `Validation failed: username: User validation failed, the username \`${initialUsers[1].username}\` is taken`,
          });

        // To check the data is the same in db after all the failed attempts
        const resUser = await api.get(`/api/v1.0/users/${initialUsers[0]._id}`);
        expect(resUser.body).toMatchObject(resInitialUser.body);
      });

      it('fails with status code 401 if the user is not the owner of the account', async () => {
        const resInitialUser = await api.get(`/api/v1.0/users/${initialUsers[0]._id}`);

        // Another user
        // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[1].username,
            password: initialUsers[1].username, // The password is the same that username
          });

        const newUserData = {
          username: 'userNumber0Change1',
          password: 'passwordChanged',
          bio: 'Bio of the user 0     remove unnecessary spaces',
          correctedBio: 'Bio of the user 0 remove unnecessary spaces',
        };

        // Check not authorize user
        await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', 'userNumber0Change1')
          .field('password', 'passwordChanged')
          .field('bio', 'Bio of the user 0     remove unnecessary spaces')
          .attach('photo', `${__dirname}/1.jpg`)
          .expect(401);

        // To check the data is the same in db after all the failed attempts
        const resUser = await api.get(`/api/v1.0/users/${initialUsers[0]._id}`);
        expect(resUser.body).toMatchObject(resInitialUser.body);
      });

      it('fails with status code 401 if the user is not logged in', async () => {
      // Initial user data
        const resInitialUser = await api.get(`/api/v1.0/users/${initialUsers[0]._id}`);

        const newUserData = {
          username: 'userNumber0Change1',
          password: 'passwordChanged',
          bio: 'Bio of the user 0     remove unnecessary spaces',
          correctedBio: 'Bio of the user 0 remove unnecessary spaces',
        };

        // Check user not logged in
        await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}`)
          .field('username', 'userNumber0Change1')
          .field('password', 'passwordChanged')
          .field('bio', 'Bio of the user 0     remove unnecessary spaces')
          .attach('photo', `${__dirname}/1.jpg`)
          .expect(401)
          .expect({
            msg: 'You are not authorized to view this resource',
          });

        // To check the data is the same in db after all the failed attempts
        const resUser = await api.get(`/api/v1.0/users/${initialUsers[0]._id}`);
        expect(resUser.body).toMatchObject(resInitialUser.body);
      });
    });

    describe('delete user', () => {
      it('successful with return of status code 204 with user logged in who is the owner of the account', async () => {
      // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[0].username,
            password: initialUsers[0].username, // The password is the same that username
          });

        // Initial data
        // ProfilePhoto that will be deleted from db
        const photoUser = await ProfilePhoto.findById(
          initialUsers[0].photo,
        );

        // Watchlist that will be deleted from db
        const watchlist = await Watchlist.findById(
          initialUsers[0].watchlist,
        );

        expect(photoUser && watchlist).not.toBeNull();

        // Reveiews that will be deleted from db
        const reviews = await Review.find({ userId: initialUsers[0]._id });

        // Lists that will be deleted from db
        const lists = await List.find({ userId: initialUsers[0]._id });

        // Rates that will be deleted from db
        const rates = await Rate.find({ userId: initialUsers[0]._id }).populate('movieId', {
          rateValue: 1, rateAverage: 1, rateCount: 1,
        });

        expect(reviews && lists && rates).not.toHaveLength(0);

        // Delete user
        await api
          .delete(`/api/v1.0/users/${initialUsers[0]._id}`)
          .expect(204);

        // To check the data was updated in db

        // User not found
        await api.get(`/api/v1.0/users/${initialUsers[0]._id}`).expect(404);

        const users = await User.find().count();

        // One user was removed
        expect(users).toBe(initialUsers.length - 1);

        // ProfilePhoto deleted from db
        const currentPhotoUser = await ProfilePhoto.findById(
          initialUsers[0].photo,
        );
        expect(currentPhotoUser).toBeNull();

        // Watchlist deleted from db
        const currentWatchlist = await Watchlist.findById(
          initialUsers[0].watchlist,
        );
        expect(currentWatchlist).toBeNull();

        // Reveiews deleted from db
        const currentReviews = await Review.find({ userId: initialUsers[0]._id });

        expect(currentReviews).toHaveLength(0);

        // Lists deleted from db
        const currentLists = await List.find({ userId: initialUsers[0]._id });
        expect(currentLists).toHaveLength(0);

        // Rates deleted from db
        const currentRates = await Rate.find({ userId: initialUsers[0]._id });
        expect(currentRates).toHaveLength(0);

        rates.forEach(async (rate) => {
          const movie = await Movie.findById(rate.movieId);
          const rateCount = rate.movieId.rateCount - 1;
          const rateValue = rate.movieId.rateValue - rate.value;
          const rateAverage = Math.round(rateValue / rateCount);
          expect(movie).toMatchObject({
            rateValue,
            rateCount,
            rateAverage,
          });
        });
        // Now the user is not logged in
        await api.get('/api/v1.0/auth/status').expect({
          currentSession: { isAuth: false, userId: null },
        });
      });

      it('fails with status code 404 if the user does not exist', async () => {
        const newUser = new User({
          username: `userNumber${initialUsers.length}`,
          bio: '',
          date: new Date().toISOString(),
          passwordHash: bcrypt.hashSync(`userNumber${initialUsers.length}`, Number(process.env.saltRounds)),
          watchlist: new mongoose.Types.ObjectId().toString(),
          photo: new mongoose.Types.ObjectId().toString(),
        });

        await newUser.save();
        await newUser.deleteOne({});

        // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[1].username,
            password: initialUsers[1].username, // The password is the same that username
          });

        // Trying to delete user
        await api
          .delete(`/api/v1.0/users/${newUser.id}`).expect(404);

        const users = await User.find().count();

        // No user was removed
        expect(users).toBe(initialUsers.length);
      });

      it('fails with status code 401 if the user is not the owner of the account', async () => {
      // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[1].username,
            password: initialUsers[1].username, // The password is the same that username
          });

        // Check not authorize user
        await api
          .delete(`/api/v1.0/users/${initialUsers[0]._id}`).expect(401);

        const users = await User.find().count();

        // No user was removed
        expect(users).toBe(initialUsers.length);
      });

      it('fails with status code 401 if the user is not logged in', async () => {
      // Check user not logged in
        await api
          .delete(`/api/v1.0/users/${initialUsers[0]._id}`)
          .expect(401)
          .expect({
            msg: 'You are not authorized to view this resource',
          });

        const users = await User.find().count();

        // No user was removed
        expect(users).toBe(initialUsers.length);
      });
    });
  });
  describe('users/:id/reviews routes', () => {
    beforeAll(async () => {
      await addInitialMovies();
      await addInitialReviews();
      await addInitialRates();
      await addInitialUsers();
      await addInitialProfilePhotos();
      await addInitialLists();
      await addInitialWatchlists();
    });

    it('reviews are returned as json', async () => {
      await api.get(`/api/v1.0/users/${initialUsers[0]._id}/reviews`).expect(200).expect('Content-Type', /application\/json/);
    });

    it('the amount of all reviews of one user is returned in the total property', async () => {
      const response = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/reviews`);

      // Reviews added by this user.
      const amountReviews = initialReviews
        .filter((review) => review.userId === initialUsers[0]._id).length;
      expect(response.body.total).toBe(amountReviews);
    });

    it('return the number of reviews and data according to the result and query parameters page and pageSize', async () => {
      const page = 1;
      const pageSize = 1;

      const initialResponse = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/reviews/?page=${0}&pageSize=${pageSize}`);

      const secondResponse = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/reviews/?page=${page}&pageSize=${pageSize}`);

      // To check each review item is only in one response
      //  according to query parameters page and pageSize
      initialResponse.body.results.forEach((reviewFirstResponse) => {
        expect(secondResponse.body.results).not.toContainEqual(reviewFirstResponse);
      });
      const {
        _id, photo, watchlist, passwordHash, ...userSelected
      } = initialUsers[0];
      expect(secondResponse.body.results).toHaveLength(pageSize);
      expect(secondResponse.body.page).toBe(page);
      expect(secondResponse.body.prev_page).toContain(`page=${page - 1}`);
      expect(secondResponse.body.next_page).toContain('');
      expect(secondResponse.body.results[0]).toMatchObject({
        date: expect.any(String),
        body: expect.any(String),
        title: expect.any(String),
      });
      expect(secondResponse.body.results[0].movieId.photo).toBeDefined();
      expect(secondResponse.body.results[0].movieId.name).toBeDefined();
      expect(secondResponse.body.results[0].movieId.release_date).toBeDefined();
      expect(secondResponse.body.results[0].movieId.idTMDB).toBeDefined();
      expect(secondResponse.body.results[0].movieId.rateAverage).toBeDefined();
      expect(secondResponse.body.user_details).toEqual({
        ...userSelected,
        photo: null,
        watchlist: null,
        id: _id,
      });
    });

    it('fails with statuscode 400 if the query parameters are invalid and return array with validator errors', async () => {
      const page = 'one';
      const pageSize = -5;
      const response = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/reviews/?page=${page}&pageSize=${pageSize}`).expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('users/:id/rates routes', () => {
    beforeAll(async () => {
      await addInitialMovies();
      await addInitialReviews();
      await addInitialRates();
      await addInitialUsers();
      await addInitialProfilePhotos();
      await addInitialLists();
      await addInitialWatchlists();
    });

    it('rates are returned as json', async () => {
      await api.get(`/api/v1.0/users/${initialUsers[0]._id}/rates`).expect(200).expect('Content-Type', /application\/json/);
    });

    it('the amount of all rates of one user is returned in the total property', async () => {
      const response = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/rates`);

      console.log('🚀 ~ file: users.test.js:653 ~ it ~ response:', response.body);
      // Reviews added by this user.
      const amountRates = initialRates
        .filter((rate) => rate.userId === initialUsers[0]._id).length;
      expect(response.body.total).toBe(amountRates);
    });

    it('return the number of rates and data according to the result and query parameters page and pageSize', async () => {
      const page = 1;
      const pageSize = 1;

      const initialResponse = await api.get(`/api/v1.0/users/${initialUsers[1]._id}/rates/?page=${0}&pageSize=${pageSize}`);

      const secondResponse = await api.get(`/api/v1.0/users/${initialUsers[1]._id}/rates/?page=${page}&pageSize=${pageSize}`);

      // To check each rate item is only in one response
      //  according to query parameters page and pageSize
      initialResponse.body.results.forEach((rateFirstResponse) => {
        expect(secondResponse.body.results).not.toContainEqual(rateFirstResponse);
      });
      const {
        _id, photo, watchlist, passwordHash, ...userSelected
      } = initialUsers[1];
      expect(secondResponse.body.results).toHaveLength(pageSize);
      expect(secondResponse.body.page).toBe(page);
      expect(secondResponse.body.prev_page).toContain(`page=${page - 1}`);
      expect(secondResponse.body.next_page).toContain('');
      expect(secondResponse.body.results[0]).toMatchObject({
        date: expect.any(String),
        value: expect.any(Number),
      });
      expect(secondResponse.body.results[0].movieId.photo).toBeDefined();
      expect(secondResponse.body.results[0].movieId.name).toBeDefined();
      expect(secondResponse.body.results[0].movieId.release_date).toBeDefined();
      expect(secondResponse.body.results[0].movieId.idTMDB).toBeDefined();
      expect(secondResponse.body.results[0].movieId.rateAverage).toBeDefined();
      expect(secondResponse.body.results[0].movieId.description).toBeDefined();
      expect(secondResponse.body.user_details).toEqual({
        ...userSelected,
        photo: null,
        watchlist: null,
        id: _id,
      });
    });

    it('fails with statuscode 400 if the query parameters are invalid and return array with validator errors', async () => {
      const page = 'one';
      const pageSize = -5;
      const response = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/rates/?page=${page}&pageSize=${pageSize}`).expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });
});

afterAll(async () => {
  await dbDisconnect();
  console.log('Disconected from MongoDB');
});
