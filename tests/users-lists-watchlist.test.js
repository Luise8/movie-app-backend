require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const request = require('supertest');
const session = require('express-session');
const app = require('./app-helper');

const { dbDisconnect, initializeMongoServer } = require('./mongo-config-testing');
const {
  initialUsers,
  initialLists,
  initialRates,
  initialWatchlists,
  initialMovies,
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
  describe('lists routes', () => {
    beforeAll(async () => {
      await addInitialMovies();
      await addInitialReviews();
      await addInitialRates();
      await addInitialUsers();
      await addInitialProfilePhotos();
      await addInitialWatchlists();
    });

    describe('get lists', () => {
      beforeAll(async () => {
        await addInitialLists();
      });
      it('lists are returned as json', async () => {
        await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists`).expect(200).expect('Content-Type', /application\/json/);
      });

      it('the amount of all lists of one user is returned in the total property', async () => {
        const response = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists`);

        // Lists added by this user.
        const amountLists = initialLists
          .filter((list) => list.userId === initialUsers[0]._id).length;
        expect(response.body.total).toBe(amountLists);
      });

      it('return the number of lists and data according to the result and query parameters page and pageSize', async () => {
        const page = 1;
        const pageSize = 1;

        const initialResponse = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/?page=${0}&pageSize=${pageSize}`);

        const secondResponse = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/?page=${page}&pageSize=${pageSize}`);

        // To check each list item is only in one response
        //  according to query parameters page and pageSize
        initialResponse.body.results.forEach((listFirstResponse) => {
          expect(secondResponse.body.results).not.toContainEqual(listFirstResponse);
        });
        const {
          _id, photo, watchlist, passwordHash, ...userSelected
        } = initialUsers[0];
        expect(secondResponse.body.results.length).toBeLessThan(pageSize + 1);
        expect(secondResponse.body.page).toBe(page);
        expect(secondResponse.body.prev_page).toContain(`page=${page - 1}`);

        const next_page = (pageSize * (page + 1)) >= secondResponse.body.total ? '' : `page=${page + 1}`;

        expect(secondResponse.body.next_page).toContain(next_page);

        expect(secondResponse.body.results[0]).toMatchObject({
          date: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          movies: expect.any(Array),
        });

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
        const response = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/?page=${page}&pageSize=${pageSize}`).expect(400);

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });
    });

    describe('get one list', () => {
      beforeAll(async () => {
        await addInitialLists();
      });
      it('list is returned as json', async () => {
        await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`).expect(200).expect('Content-Type', /application\/json/);
      });

      it('the amount of all movies of one list is returned in the total property', async () => {
        const response = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);

        // Lists added by this user.
        const amountMovies = initialLists
          .filter((list) => list._id === initialUsers[0].lists[0]);
        expect(response.body.total).toBe(amountMovies[0].movies.length);
      });

      it('return the number of movies and data according to the result and query parameters page and pageSize and light=false', async () => {
        const page = 1;
        const pageSize = 1;

        const initialResponse = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}?page=${0}&pageSize=${pageSize}`);

        const secondResponse = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}?page=${page}&pageSize=${pageSize}`);

        // To check each list item is only in one response
        //  according to query parameters page and pageSize
        initialResponse.body.results.forEach((listFirstResponse) => {
          expect(secondResponse.body.results).not.toContainEqual(listFirstResponse);
        });

        const {
          _id, photo, watchlist, passwordHash, ...userSelected
        } = initialUsers[0];
        expect(secondResponse.body.results.length).toBeLessThan(pageSize + 1);
        expect(secondResponse.body.page).toBe(page);
        expect(secondResponse.body.prev_page).toContain(`page=${page - 1}`);

        const next_page = (pageSize * (page + 1)) >= secondResponse.body.total ? '' : `page=${page + 1}`;

        expect(secondResponse.body.next_page).toContain(next_page);

        expect(secondResponse.body.results[0]).toMatchObject({
          name: expect.any(String),
          release_date: expect.any(String || undefined),
          description: expect.any(String || undefined),
          photo: expect.any(String || null),
          rateAverage: expect.any(Number),
          idTMDB: expect.any(String),
        });

        // Movie populate
        expect(secondResponse.body.results[0].photo).toBeDefined();
        expect(secondResponse.body.results[0].name).toBeDefined();
        expect(secondResponse.body.results[0].release_date).toBeDefined();
        expect(secondResponse.body.results[0].idTMDB).toBeDefined();
        expect(secondResponse.body.results[0].rateAverage).toBeDefined();
        expect(secondResponse.body.results[0].description).toBeDefined();
        expect(secondResponse.body.results[0].rateCount).toBeDefined();
        expect(secondResponse.body.results[0].rateValue).toBeDefined();
        expect(secondResponse.body.results[0].date).toBeDefined();

        expect(secondResponse.body.user_details).toEqual({
          ...userSelected,
          photo: null,
          watchlist: null,
          id: _id,
        });
      });

      it('return the number of movies and data according to the result and query parameters page and pageSize and light=true', async () => {
        const page = 1;
        const pageSize = 1;

        const initialResponse = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}?page=${0}&pageSize=${pageSize}&light=true`);

        const secondResponse = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}?page=${page}&pageSize=${pageSize}&light=true`);

        const {
          _id, photo, watchlist, passwordHash, ...userSelected
        } = initialUsers[0];

        expect(secondResponse.body.results).toHaveLength(secondResponse.body.total);
        expect(secondResponse.body.page).not.toBeDefined();
        expect(secondResponse.body.prev_page).not.toBeDefined();
        expect(secondResponse.body.next_page).not.toBeDefined();
        expect(secondResponse.body.page_size).not.toBeDefined();

        // Movie populate light
        expect(secondResponse.body.results[0].photo).toBeDefined();
        expect(secondResponse.body.results[0].name).toBeDefined();
        expect(secondResponse.body.results[0].release_date).toBeDefined();
        expect(secondResponse.body.results[0].idTMDB).toBeDefined();
        expect(secondResponse.body.results[0].rateAverage).toBeDefined();
        expect(secondResponse.body.results[0].description).not.toBeDefined();
        expect(secondResponse.body.results[0].rateCount).not.toBeDefined();
        expect(secondResponse.body.results[0].rateValue).not.toBeDefined();
        expect(secondResponse.body.results[0].date).not.toBeDefined();

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
        const light = 'yes';
        const response = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}?page=${page}&pageSize=${pageSize}&light=${light}`).expect(400);

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });
    });

    describe('create lists', () => {
      beforeEach(async () => {
        await addInitialLists();
      });

      it('succeeds with valid data', async () => {
        // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[0].username,
            password: initialUsers[0].username, // The password is the same that username
          });

        const newlist = {
          name: `userNumber${initialUsers.length}`,
          description: `A new list made by ${initialUsers[0].username}`,
        };
        const res = await api
          .post(`/api/v1.0/users/${initialUsers[0]._id}/lists`)
          .send({
            name: newlist.name,
            description: newlist.description,
          })
          .expect(201)
          .expect('Content-Type', /application\/json/);

        // The info of the new list
        expect(res.body).toMatchObject({
          userId: `${initialUsers[0]._id}`,
          movies: expect.any(Array),
          date: expect.any(String),
          name: newlist.name,
          description: newlist.description,
        });

        // A new list was added to the lists collection
        const newListCount = await List.find().count();
        expect(newListCount).toBe(initialLists.length + 1);

        const listUser = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists`);

        // The list was added to the user lists
        expect(listUser.body.total).toBe(initialUsers[0].lists.length + 1);
        expect(listUser.body.results).toContainEqual(expect.objectContaining({
          name: newlist.name,
          description: newlist.description,
        }));
      });

      it('fails with status 400 and errors prop with errors if data is invalid', async () => {
        // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[0].username,
            password: initialUsers[0].username, // The password is the same that username
          });

        const newlist = {
          name: 'too short',
          description: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque asperiores possimus ex obcaecati corrupti nihil! Eum quam dolor voluptate placeat, excepturi incidunt deserunt itaque nulla magnam commodi, molestias repellat ipsam.
          Illum aperiam voluptatum enim? Maiores sapiente quidem rerum omnis saepe quaerat quod laborum quos. Voluptate eligendi error enim ea, magnam, architecto dolores delectus doloribus corporis eveniet facere quo placeat sunt?
          Odit vitae amet facilis quidem porro nihil repellat quis eos perspiciatis! Tempora doloremque voluptate maxime obcaecati ullam excepturi asperiores facilis, deleniti voluptatum nostrum! Doloribus culpa quis labore ut adipisci nisi.`,
        };
        const res = await api
          .post(`/api/v1.0/users/${initialUsers[0]._id}/lists`)
          .send({
            name: newlist.name,
            description: newlist.description,
          })
          .expect(400);

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors.length).toBeGreaterThan(0);

        // The list was not added to the list collection
        const listCount = await List.find().count();
        expect(listCount).toBe(initialLists.length);
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
        const newlist = {
          name: `userNumber${initialUsers.length}`,
          description: `A new list made by ${initialUsers[0].username}`,
        };
        await api
          .post(`/api/v1.0/users/${initialUsers[0]._id}/lists`)
          .send({
            name: newlist.name,
            description: newlist.description,
          }).expect(401);

        // The list was not added to the list collection
        const listCount = await List.find().count();
        expect(listCount).toBe(initialLists.length);
      });

      it('fails with status code 401 if the user is not logged in', async () => {
        // Check user not logged in
        const newlist = {
          name: `userNumber${initialUsers.length}`,
          description: `A new list made by ${initialUsers[0].username}`,
        };
        await api
          .post(`/api/v1.0/users/${initialUsers[0]._id}/lists`)
          .send({
            name: newlist.name,
            description: newlist.description,
          }).expect(401).expect({
            msg: 'You are not authorized to view this resource',
          });

        // The list was not added to the list collection
        const listCount = await List.find().count();
        expect(listCount).toBe(initialLists.length);
      });
    });

    describe('edit lists', () => {
      beforeEach(async () => {
        await addInitialLists();
      });
      it('successful with return of new list data', async () => {
        // Get the initial data of lists[0]
        const resFirst = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);

        // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[0].username,
            password: initialUsers[0].username, // The password is the same that username
          });

        const newlist = {
          name: `userNumber${initialUsers.length}`,
          description: `A new list made by ${initialUsers[0].username}`,
          movies: [
            initialMovies[0].idTMDB,
            initialMovies[1].idTMDB,
          ],
        };
        const resUpdate = await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`)
          .send({
            name: newlist.name,
            description: newlist.description,
            movies: newlist.movies,

          })
          .expect(200);

        // Right response with new data
        expect(resUpdate.body).toMatchObject({
          name: newlist.name,
          description: newlist.description,
          id: resFirst.body.id,
          movies: [
            initialMovies[0]._id,
            initialMovies[1]._id,
          ],
        });

        // To check the data was update in db
        const resListUpdated = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);

        expect(resListUpdated.body).toMatchObject({
          name: newlist.name,
          description: newlist.description,
          id: resFirst.body.id,
          total: newlist.movies.length,
          listTotalIds: [
            initialMovies[0]._id,
            initialMovies[1]._id,
          ],
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

        // Get the initial data of lists[0]
        const resFirst = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);

        const newlist = {
          name: 'l', // Too short name
          description: `A new list made by ${initialUsers[0].username}`,
          movies: ['casa'],
        };
        const resUpdate = await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`)
          .send({
            name: newlist.name,
            description: newlist.description,
            movies: newlist.movies,
          }).expect(400);

        expect(resUpdate.body.errors).toBeDefined();
        expect(resUpdate.body.errors.length).toBeGreaterThan(0);

        // To check the data is the same in db after all the failed attempts
        const resSecond = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);
        expect(resFirst.body).toMatchObject(resSecond.body);
      });

      it('fails with status code 401 if the user is not the owner of the account', async () => {
        // Get the initial data of lists[0]
        const resFirst = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);

        // Another user
        // Login
        await api
          .post('/api/v1.0/auth/login')
          .send({
            username: initialUsers[1].username,
            password: initialUsers[1].username, // The password is the same that username
          });

        const newlist = {
          name: `userNumber${initialUsers.length}`,
          description: `A new list made by ${initialUsers[0].username}`,
        };

        // Check not authorize user
        const resUpdate = await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`)
          .send({
            name: newlist.name,
            description: newlist.description,
          }).expect(401);

        // To check the data is the same in db after all the failed attempts
        const resSecond = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);
        expect(resFirst.body).toMatchObject(resSecond.body);
      });

      it('fails with status code 401 if the user is not logged in', async () => {
        // Get the initial data of lists[0]
        const resFirst = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);

        const newlist = {
          name: `userNumber${initialUsers.length}`,
          description: `A new list made by ${initialUsers[0].username}`,
        };

        // Check not logged in user
        await api
          .put(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`)
          .send({
            name: newlist.name,
            description: newlist.description,
          }).expect(401)
          .expect({
            msg: 'You are not authorized to view this resource',
          });

        // To check the data is the same in db after all the failed attempts
        const resSecond = await api.get(`/api/v1.0/users/${initialUsers[0]._id}/lists/${initialUsers[0].lists[0]}`);
        expect(resFirst.body).toMatchObject(resSecond.body);
      });
    });

});

afterAll(async () => {
  await dbDisconnect();
  console.log('Disconected from MongoDB');
});
