const request = require('supertest');
const app = require('./app-helper');
const { dbDisconnect, initializeMongoServer } = require('./mongo-config-testing');

const {
  initialMovies,
  addInitialMovies,
  nonExistingId,
  addInitialRates,
  initialRates,
} = require('./test-db-helper');
const Movie = require('../models/movie');
const moviesRouter = require('../controllers/movies');

app.use('/api/v1.0/movies', moviesRouter);
const api = request(app);

beforeAll(async () => {
  await initializeMongoServer();
});

describe('when there is initially some movies saved in db', () => {
  beforeAll(async () => {
    await addInitialMovies(); // Add 16 movies
  });

  it('movies are returned as json', async () => {
    await api.get('/api/v1.0/movies').expect(200).expect('Content-Type', /application\/json/);
  });

  it('the amount of all movies is returned in the total property', async () => {
    const response = await api.get('/api/v1.0/movies');
    expect(response.body.total).toBe(initialMovies.length);
  });

  it('by default, a maximum of 10 movies are returned in the results property', async () => {
    const response = await api.get('/api/v1.0/movies');
    expect(response.body.results).toHaveLength(10);
  });

  it('return the number of movies and data according to the result and query parameters page and pageSize', async () => {
    const page = 2;
    const pageSize = 5;
    const initialResponse = await api.get(`/api/v1.0/movies?page=${1}&pageSize=${pageSize}`);
    const secondResponse = await api.get(`/api/v1.0/movies?page=${page}&pageSize=${pageSize}`);

    // To check each movie item is only in one response
    //  according to query parameters page and pageSize
    initialResponse.body.results.forEach((movieFirstResponse) => {
      expect(secondResponse.body.results).not.toContainEqual(movieFirstResponse);
    });

    expect(secondResponse.body.results).toHaveLength(pageSize);
    expect(secondResponse.body.page).toBe(page);
    expect(secondResponse.body.prev_page).toContain(`page=${page - 1}`);
    expect(secondResponse.body.next_page).toContain(`page=${page + 1}`);
  });

  it('fails with statuscode 400 if query parameters are invalid', async () => {
    const page = 'one';
    const pageSize = 5;
    await api.get(`/api/v1.0/movies?page=${page}&pageSize=${pageSize}`).expect(400);
  });

  describe('checking the sort', () => {
    let newMovie;
    beforeAll(async () => {
      newMovie = new Movie({
        name: 'Movie that must be first by rateAverage 1 over 0 of the rest of movies in initialMovies',
        description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore, iste quis facilis beatae eius mollitia libero assumenda cupiditate illo. Nulla, adipisci omnis corrupti non magnam consequatur beatae ipsum asperiores officiis',
        idTMDB: await nonExistingId('movie'),
        date: initialMovies[0].date,
        rateAverage: 1,
      });
      await newMovie.save();
    });

    it('movies are sorted by rateAverage first, then date and then idTMDB', async () => {
      const response = await api.get('/api/v1.0/movies');
      expect(response.body.results[0].name).toContain(newMovie.name);
    });
    afterAll(async () => {
      newMovie.deleteOne({});
    });
  });

  it('the unique identifier property of the movies is named id', async () => {
    const response = await api.get('/api/v1.0/movies');

    expect(response.body.results[0].id).toBeDefined();
    expect(response.body.results[0]._id).not.toBeDefined();
  });

  describe('viewing a specific movie general info', () => {
    it('succeeds with a valid id', async () => {
      const response = await api
        .get(`/api/v1.0/movies/${initialMovies[0].idTMDB}`)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      const {
        _id, ...formatedMovieSelected
      } = initialMovies[0];

      expect(response.body).toMatchObject({
        id: _id,
        ...formatedMovieSelected,
      });
    });

    it('fails with statuscode 404 if movie does not exist', async () => {
      const validNonexistingIdTMDB = await nonExistingId('movie');
      console.log(validNonexistingIdTMDB);
      await api
        .get(`/api/v1.0/movies/${validNonexistingIdTMDB}`)
        .expect(404);
    });
  });

  describe('viewing a specific movie details', () => {
    it('succeeds with a valid id', async () => {
      const response = await api
        .get(`/api/v1.0/movies/${initialMovies[0].idTMDB}/detail`)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      // Check if the response has the most relevant properties
      expect(response.body.id).toBe(Number(initialMovies[0].idTMDB));
      expect(response.body.similar).toBeDefined();
      expect(response.body.images).toBeDefined();
      expect(response.body.videos).toBeDefined();
      expect(response.body.movieDB).toBeDefined();
      expect(response.body.title).toBeDefined();
      expect(response.body.release_date).toBeDefined();
      expect(response.body.popularity).toBeDefined();
      expect(response.body.genres).toBeDefined();
      expect(response.body.adult).toBeDefined();
      expect(response.body.production_companies).toBeDefined();

      // Check is the movie document is in the movieDB property
      const {
        _id, ...formatedMovieSelected
      } = initialMovies[0];

      expect(response.body.movieDB).toMatchObject({
        id: _id,
        ...formatedMovieSelected,
      });
    });

    it('fails with statuscode 404 if the movie does not exist', async () => {
      const validNonexistingIdTMDB = await nonExistingId('movie');
      await api
        .get(`/api/v1.0/movies/${validNonexistingIdTMDB}/detail`)
        .expect(404);
    });
  });
  describe('viewing a specific movie only tmdb data', () => {
    it('succeeds with a valid id', async () => {
      const response = await api
        .get(`/api/v1.0/movies/${initialMovies[0].idTMDB}/tmdb`)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      // Check if the response has the most relevant properties of tmdb data
      expect(response.body.id).toBe(Number(initialMovies[0].idTMDB));
      expect(response.body.title).toBeDefined();
      expect(response.body.release_date).toBeDefined();
      expect(response.body.popularity).toBeDefined();
      expect(response.body.genres).toBeDefined();
      expect(response.body.adult).toBeDefined();
      expect(response.body.production_companies).toBeDefined();
    });

    it('fails with statuscode 404 if the movie does not exist', async () => {
      const validNonexistingIdTMDB = await nonExistingId('movie');
      await api
        .get(`/api/v1.0/movies/${validNonexistingIdTMDB}/tmdb`)
        .expect(404).expect({ error: 'Movie not found in TMDB' });
    });
  });

  describe('getting rated movies', () => {
    beforeAll(async () => {
      await addInitialRates();
    });
    const pageSize = 20;
    const baseUrl = '/api/v1.0/movies/rated';

    it('return right data with valid queries', async () => {
      const page = 1;

      const response = await api.get(`${baseUrl}?page=${page}`).expect(200).expect('Content-Type', /application\/json/);
      const moviesIdRated = initialRates
        .filter((rate, index, array) => index === array
          .findIndex((other) => other.movieId === rate.movieId)).map((rate) => rate.movieId);

      expect(response.body.results).toBeDefined();
      expect(response.body.page).toBeDefined();
      expect(response.body.page_size).toBeDefined();
      expect(response.body.prev_page).toBeDefined();
      expect(response.body.next_page).toBeDefined();
      expect(response.body.total_pages).toBeDefined();
      expect(response.body.total_results).toBeDefined();
      console.log('🚀 ~ file: movies.test.js:207 ~ it.only ~ response.body.results:', response.body.results);

      expect(Array.isArray(response.body.results)).toBeTruthy();
      expect(response.body.results.length).toBe(moviesIdRated.length);
      expect(response.body.total_results).toBe(moviesIdRated.length);

      expect(response.body.page_size).toBe(pageSize);

      response.body.results.forEach((movie) => expect(moviesIdRated
        .includes(movie.id)).toBeTruthy());
    });

    it('set default page to 1', async () => {
      const response = await api.get(`${baseUrl}`).expect(200);
      expect(response.body.page).toBe(1);
    });

    it('fails with status code 400 and array of errors if page is not valid', async () => {
      const page = 'one';
      const response = await api.get(`${baseUrl}?page=${page}`).expect(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('when there are not movies in db', () => {
  beforeAll(async () => {
    await Movie.deleteMany({});
  });
  it('return the number of movies and data according to the result', async () => {
    const response = await api.get('/api/v1.0/movies').expect(200).expect('Content-Type', /application\/json/);
    expect(response.body.results).toHaveLength(0);
  });
});

afterAll(async () => {
  await dbDisconnect();
  console.log('Disconected from MongoDB');
});
