require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Movie = require('./models/movie');
const Review = require('./models/review');
const User = require('./models/user');
const List = require('./models/list');
const Watchlist = require('./models/watchlist');
const ProfilePhoto = require('./models/profilePhoto');
const Rate = require('./models/rate');

console.log(
  'This script populates some test movies, users, reviews, rates, lists and watchlists to your database. Specified database URI below variable. To run just: node populatedb',
);

'e.g.: mongodb+srv://<user>:<password>@cluster.44q9kcx.mongodb.net/database_name?retryWrites=true&w=majority';
const URI = process.env.DEV_MONGODB_URI;

mongoose.set('strictQuery', false); // Prepare for Mongoose 7

main().catch((err) => console.log(err));

async function main() {
  console.log('Debug: About to connect');
  await mongoose.connect(URI);
  console.log('Debug: Should be connected?');
  await addInitialUsers();
  await addInitialProfilePhotos();
  await addInitialMovies();
  await addInitialReviews();
  await addInitialLists();
  await addInitialWatchlists();
  await addInitialRates();
  console.log('Debug: Closing mongoose');
  mongoose.connection.close();
}

// USERS 13
const thirteenUsersId = [
  '64501354c41b5db06e01c5a4',
  '64501354c41b5db06e01c5a5',
  '64501354c41b5db06e01c5a6',
  '64501354c41b5db06e01c5a7',
  '64501354c41b5db06e01c5a8',
  '64501354c41b5db06e01c5a9',
  '64501354c41b5db06e01c5aa',
  '64501354c41b5db06e01c5ab',
  '64501354c41b5db06e01c5ac',
  '64501354c41b5db06e01c5ad',
  '64501354c41b5db06e01c5ae',
  '64501354c41b5db06e01c5af',
  '64501354c41b5db06e01c5b0',
];
function createThirteenUsers() {
  const users = [];
  for (let i = 0; i < thirteenUsersId.length; i += 1) {
    users.push(
      {
        _id: thirteenUsersId[i],
        username: `userNumber${i}`,
        photo: new mongoose.Types.ObjectId().toString(),
        bio: '',
        date: new Date().toISOString(),
        passwordHash: bcrypt.hashSync(`userNumber${i}`, Number(process.env.saltRounds)),
        watchlist: new mongoose.Types.ObjectId().toString(),
      },
    );
  }
  return users;
}

const initialUsers = createThirteenUsers();

async function addInitialUsers() {
  await User.deleteMany({});

  const userObjects = initialUsers.map((user) => new User(user));
  const promiseArray = userObjects.map((user) => user.save());
  await Promise.all(promiseArray);
  console.log('Added users');
}
async function addInitialProfilePhotos() {
  await ProfilePhoto.deleteMany({});

  const profilePhotoObjects = initialUsers.map((user) => new ProfilePhoto({
    _id: user.photo,
  }));
  const promiseArray = profilePhotoObjects.map((profilePhoto) => profilePhoto.save());
  await Promise.all(promiseArray);
  console.log('Added ProfilePhotos');
}

// MOVIES 16
const sixteenMoviesId = [
  '6447e80aa1f0cd363649d594',
  '6447e80aa1f0cd363649d595',
  '6448e80aa1f0cd363649d596',
  '6447e80aa1f0cd363649d596',
  '6450287ee765c993b600122b',
  '6450287ee765c993b600122c',
  '6450287ee765c993b600122d',
  '6450287ee765c993b600122e',
  '6450287ee765c993b600122f',
  '6450287ee765c993b6001230',
  '6450287ee765c993b6001231',
  '6450287ee765c993b6001232',
  '6450287ee765c993b6001233',
  '6450287ee765c993b6001234',
  '6450287ee765c993b6001235',
  '6450287ee765c993b6001236',
];
const sixteenMoviesWithoutId = [
  {
    name: 'The Fast and the Furious',
    photo: 'https://image.tmdb.org/t/p/w185//lgCEntS9mHagxdL5hb3qaV49YTd.jpg',
    description: "Dominic Toretto is a Los Angeles street racer suspected of masterminding a series of big-rig hijackings. When undercover cop Brian O'Conner infiltrates Toretto's iconoclastic crew, he falls for Toretto's sister and must choose a side: the gang or the LAPD.",
    date: new Date(),
    release_date: '2001-06-22',
    idTMDB: 9799,
  },
  {
    name: 'The Fast and the Furious: Tokyo Drift',
    photo: 'https://image.tmdb.org/t/p/w185//cm2ffqb3XovzA5ZSzyN3jnn8qv0.jpg',
    description: 'In order to avoid a jail sentence, Sean Boswell heads to Tokyo to live with his military father. In a low-rent section of the city, Shaun gets caught up in the underground world of drift racing',
    date: new Date(),
    release_date: '2006-06-03',
    idTMDB: 9615,
  },
  {
    name: 'The Fast and the Furious',
    photo: 'https://image.tmdb.org/t/p/w185//731NMB4a85McIYcftPtbH4D3l5x.jpg',
    description: "A man wrongly imprisoned for murder breaks out of jail. He wants to clear his name, but with the police pursuing him, he's forced to take a beautiful young woman, driving a fast sports car, hostage and slip into a cross-border sports car race to try to make it to Mexico before the police get him.",
    date: new Date(),
    release_date: '1954-11-01',
    idTMDB: 20174,
  },
  {
    name: 'Furious and Fast: The Story of Fast Music and the Patiphone',
    photo: 'https://image.tmdb.org/t/p/w185//d4Rf3bD5T9fxVGQETRoCy6CJ5GM.jpg',
    description: 'A music documentary about the independent "Fast Music" label and "The Patiphone" club in Tel Aviv from the late 90\'s till the late 00\'s.',
    date: new Date(),
    release_date: '2022-06-08',
    idTMDB: 985445,
  },
  {
    name: 'Tasmanian Devil: The Fast and Furious Life of Errol Flynn',
    photo: 'https://image.tmdb.org/t/p/w185//zfbWl3dqLfMVWpn9nnQ0dUHgLbg.jpg',
    description: "The story of Tasmanian-born actor Errol Flynn whose short & flamboyant life, full of scandals, adventures, loves and excess was largely played out in front of the camera - either making movies or filling the newsreels and gossip magazines. Tragically he was dead from the effects of drugs and alcohol by the time he was only 50 & the myths live on. But there is another side of Flynn that is less well known - his ambitions to be a serious writer and newspaper correspondent, his documentary films and his interest in the Spanish Civil War and Castro's Cuba",
    date: new Date(),
    release_date: '2007-10-17',
    idTMDB: 467096,
  },
  {
    name: 'F9',
    photo: 'https://image.tmdb.org/t/p/w185//bOFaAXmWWXC3Rbv4u4uM9ZSzRXP.jpg',
    description: "Dominic Toretto and his crew battle the most skilled assassin and high-performance driver they've ever encountered: his forsaken brother.",
    date: new Date(),
    release_date: '2021-05-19',
    idTMDB: 385128,
  },
  {
    name: 'The Fate of the Furious',
    photo: 'https://image.tmdb.org/t/p/w185//dImWM7GJqryWJO9LHa3XQ8DD5NH.jpg',
    description: 'When a mysterious woman seduces Dom into the world of crime and a betrayal of those closest to him, the crew face trials that will test them as never before.',
    date: new Date(),
    release_date: '2017-04-12',
    idTMDB: 337339,
  },
  {
    name: 'Fast & Furious Presents: Hobbs & Shaw',
    photo: 'https://image.tmdb.org/t/p/w185//qRyy2UmjC5ur9bDi3kpNNRCc5nc.jpg',
    description: "Ever since US Diplomatic Security Service Agent Hobbs and lawless outcast Shaw first faced off, they just have traded smack talk and body blows. But when cyber-genetically enhanced anarchist Brixton's ruthless actions threaten the future of humanity, they join forces to defeat him.",
    date: new Date(),
    release_date: '2019-08-01',
    idTMDB: 384018,
  },
  {
    name: 'Furious 7',
    photo: 'https://image.tmdb.org/t/p/w185//wurKlC3VKUgcfsn0K51MJYEleS2.jpg',
    description: 'Deckard Shaw seeks revenge against Dominic Toretto and his family for his comatose brother.',
    date: new Date(),
    release_date: '2015-04-01',
    idTMDB: 168259,
  },
  {
    name: 'Superfast!',
    photo: 'https://image.tmdb.org/t/p/w185//iuIWl90qCpoxv6g775JB6Kg0m86.jpg',
    description: "Undercover cop Lucas White joins Vin Serento's LA gang of illegal street racers. They are fast and they are furious and they plan to double cross LA crime kingpin Juan Carlos de la Sol who hides his cash in a downtown Taco Bell. The gang's outrageous plan is as daring as it is ridiculous and will see them towing the whole restaurant, at crazy speeds.",
    date: new Date(),
    release_date: '2015-03-05',
    idTMDB: 325358,
  },
  {
    name: 'Fast & Furious',
    photo: 'https://image.tmdb.org/t/p/w185//AmY8rE2HzWzZs5S81CygXXYDjki.jpg',
    description: "When a crime brings them back to L.A., fugitive ex-con Dom Toretto reignites his feud with agent Brian O'Conner. But as they are forced to confront a shared enemy, Dom and Brian must give in to an uncertain new trust if they hope to outmaneuver him. And the two men will find the best way to get revenge: push the limits of what's possible behind the wheel.",
    date: new Date('2050'),
    release_date: '2009-04-02',
    idTMDB: 13804,
  },
  {
    name: 'Fast Five',
    photo: 'https://image.tmdb.org/t/p/w185//gEfQjjQwY7fh5bI4GlG0RrBu7Pz.jpg',
    description: "Former cop Brian O'Conner partners with ex-con Dom Toretto on the opposite side of the law. Since Brian and Mia Toretto broke Dom out of custody, they've blown across many borders to elude authorities. Now backed into a corner in Rio de Janeiro, they must pull one last job in order to gain their freedom.",
    date: new Date('2048'),
    release_date: '2011-04-20',
    idTMDB: 51497,
  },
  {
    name: 'Fast & Furious 6',
    photo: 'https://image.tmdb.org/t/p/w185//n31VRDodbaZxkrZmmzyYSFNVpW5.jpg',
    description: 'Hobbs has Dominic and Brian reassemble their crew to take down a team of mercenaries: Dominic unexpectedly gets convoluted also facing his presumed deceased girlfriend, Letty.',
    date: new Date(),
    release_date: '2013-05-21',
    idTMDB: 82992,
  },
  {
    name: '2 Fast 2 Furious',
    photo: 'https://image.tmdb.org/t/p/w185//6nDZExrDKIXvSAghsFKVFRVJuSf.jpg',
    description: 'It\'s a major double-cross when former police officer Brian O\'Conner teams up with his ex-con buddy Roman Pearce to transport a shipment of "dirty" money for shady Miami-based import-export dealer Carter Verone. But the guys are actually working with undercover agent Monica Fuentes to bring Verone down.',
    date: new Date(),
    release_date: '2003-06-05',
    idTMDB: 584,
  },
  {
    name: 'The Turbo Charged Prelude for 2 Fast 2 Furious',
    photo: 'https://image.tmdb.org/t/p/w185//bztZ5NWmsT7oq0vCWGQGWxd10Gf.jpg',
    description: "Turbo-Charged Prelude is a 2003 short film, directed by Philip Atwell, featuring Paul Walker, reprising his role as Brian O'Conner, in a short series of sequences which bridge The Fast and The Furious with its first sequel, 2 Fast 2 Furious.",
    date: new Date('2049'),
    release_date: '2003-06-03',
    idTMDB: 77959,
  },
  {
    name: 'Los Bandoleros',
    photo: 'https://image.tmdb.org/t/p/w185//lpYaCwJWPvpQfzUy2vgKJ4e1IEN.jpg',
    description: 'The film tells the back story about the characters and events leading up to the explosive oil truck heist in Fast &amp; Furious.',
    date: new Date(),
    release_date: '2009-07-28',
    idTMDB: 253835,
  },
];
function createSixteenMovies() {
  const movies = [];
  for (let i = 0; i < sixteenMoviesWithoutId.length; i += 1) {
    movies.push({
      ...sixteenMoviesWithoutId[i],
      _id: sixteenMoviesId[i],
    });
  }
  return movies;
}
const initialMovies = createSixteenMovies();
async function addInitialMovies() {
  await Movie.deleteMany({});

  const movieObjects = initialMovies.map((movie) => new Movie(movie));
  const promiseArray = movieObjects.map((movie) => movie.save());
  await Promise.all(promiseArray);
  console.log('Added movies');
}

// REVIEWS 3
const initialReviews = [
// First user initialUsers[0] review of movie initialMovies[0]
  {
    _id: '64493b16236a412ea5eb6550',
    title: 'First review made',
    body: 'Lorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vita',
    date: new Date(),
    userId: initialUsers[0]._id,
    movieId: initialMovies[0]._id,
  },
  // First user initialUsers[0] review of movie initialMovies[1]
  {
    title: 'Second review made',
    body: 'Lorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vita',
    date: new Date(),
    userId: initialUsers[0]._id,
    movieId: initialMovies[1]._id,
  },
  // Second user initialUsers[1] review of movie initialMovies[0]
  {
    title: 'Third review made',
    body: 'Lorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitaLorem ipsum dolor sit amet, consectetuer adipiscing entum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vita',
    date: new Date(),
    userId: initialUsers[1],
    movieId: initialMovies[0]._id,
  }];

async function addInitialReviews() {
  await Review.deleteMany({});

  const reviewObjects = initialReviews.map((review) => new Review(review));
  const promiseArray = reviewObjects.map((review) => review.save());
  await Promise.all(promiseArray);
  console.log('Added reviews');
}

// LISTS 4
const fourlistIds = [
  '64502ae06dc338b6e80b8c55',
  '64502ae06dc338b6e80b8c56',
  '64502ae06dc338b6e80b8c57',
  '64502ae06dc338b6e80b8c58',
];

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createFourLists() {
  const lists = [];
  for (let i = 0; i < 3; i += 1) {
    if (i === 0) {
      lists.push(
        {
          _id: fourlistIds[i],
          name: `List number ${i}`,
          description: `This is the description of list number ${i}made by the ${initialUsers[i].username} `,
          date: new Date().toISOString(),
          userId: initialUsers[i]._id,
          movies: [
            initialMovies[10]._id,
            initialMovies[14]._id,
            initialMovies[11]._id,
          ],
        },
      );
    } else {
      lists.push(
        {
          _id: fourlistIds[i],
          name: `List number ${i}`,
          description: `This is the description of list number ${i}made by the ${initialUsers[i].username} `,
          date: new Date().toISOString(),
          userId: initialUsers[i]._id,
          movies: [
            initialMovies[randomInteger(
              0,
              initialMovies.length - 1,
            )]._id,
            initialMovies[randomInteger(
              0,
              initialMovies.length - 1,
            )]._id,
            initialMovies[randomInteger(
              0,
              initialMovies.length - 1,
            )]._id,
          ],
        },
      );
    }
  }

  // Add empty list to initialUsers[0]
  lists.push({
    _id: fourlistIds[fourlistIds.length - 1],
    name: `List number ${fourlistIds.length - 1}`,
    description: `This is the description of list number ${fourlistIds.length - 1} made by the ${initialUsers[0].username} `,
    date: new Date('1999').toISOString(),
    userId: initialUsers[0]._id,
    movies: [],
  });
  return lists;
}

const initialLists = createFourLists();
async function addInitialLists() {
  await List.deleteMany({});
  const listObjects = initialLists.map((list) => new List(list));
  const promiseArray = listObjects.map((list) => list.save());
  const listUsersObjects = initialLists.map(async (list, i) => {
    const user = await User.findById(list.userId);
    user.lists.push(list);
    return user.save();
  });
  await Promise.all(promiseArray.concat(listUsersObjects));
}

// wATCHLISTS 13
function createThirteenWatchlists() {
  const watchlists = [];
  for (let i = 0; i < initialUsers.length; i += 1) {
    if (i < 4) {
      watchlists.push(
        {
          _id: initialUsers[i].watchlist,
          userId: initialUsers[i]._id,
          movies: [
            initialMovies[randomInteger(
              0,
              initialMovies.length - 1,
            )]._id,
            initialMovies[randomInteger(
              0,
              initialMovies.length - 1,
            )]._id,
            initialMovies[randomInteger(
              0,
              initialMovies.length - 1,
            )]._id,
          ],
        },
      );
      // empty watchlists
    } else {
      watchlists.push(
        {
          _id: initialUsers[i].watchlist,
          userId: initialUsers[i]._id,
          movies: [],
        },
      );
    }
  }

  return watchlists;
}

const initialWatchlists = createThirteenWatchlists();
async function addInitialWatchlists() {
  await Watchlist.deleteMany({});
  const watchlistObjects = initialWatchlists.map((watchlist) => new Watchlist(watchlist));
  const promiseArray = watchlistObjects.map((watchlist) => watchlist.save());
  await Promise.all(promiseArray);
  console.log('Added profilePhotos');
}

const threeRateIds = [
  '64502ae06dc338b6e80b8c59',
  '64502ae06dc338b6e80b8c5a',
  '64502ae06dc338b6e80b8c5b',
];
function createThreeRates() {
  const rates = [];
  for (let i = 0; i < threeRateIds.length; i += 1) {
    let userId = initialUsers[i]._id;
    if (i > 0) {
      userId = initialUsers[1]._id;
    }
    let movieId = initialMovies[0]._id;
    if (i === 2) {
      movieId = initialMovies[1]._id;
    }

    rates.push({
      _id: threeRateIds[i],
      movieId,
      userId,
      date: new Date().toISOString(),
      value: 5,
    });
  }
  return rates;
}
const initialRates = createThreeRates();

async function addInitialRates() {
  await Rate.deleteMany({});
  const ratetObjects = initialRates.map((rate) => new Rate(rate));
  const ratesPromise = ratetObjects.map((rate) => rate.save());

  const moviesToChange = initialRates.filter((rate, index, array) => index === array
    .findIndex((other) => other.movieId === rate.movieId)).map((rate) => rate.movieId);

  const moviesPromise = moviesToChange.map(async (movieId) => {
    const ratesCurrentMovie = initialRates.filter((rate) => rate.movieId === movieId);

    const movieToChange = await Movie.findById(movieId);
    for (let i = 0; i < ratesCurrentMovie.length; i += 1) {
      movieToChange.rateCount += 1;
      movieToChange.rateValue += ratesCurrentMovie[i].value;
      movieToChange.rateAverage = Math.round(movieToChange.rateValue / movieToChange.rateCount);
    }

    return movieToChange.save();
  });

  await Promise.all(ratesPromise.concat(moviesPromise));
  console.log('Added rates');
}

// Other free ids
const otherFreeObjectIds = [
  '64502ae06dc338b6e80b8c5c',
  '64502ae06dc338b6e80b8c5d',
  '64502ae06dc338b6e80b8c5e',
  '64502ae06dc338b6e80b8c5f',
  '64502ae06dc338b6e80b8c60',
  '64502ae06dc338b6e80b8c61',
];
