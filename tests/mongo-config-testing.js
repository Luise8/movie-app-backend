// mongo-config-testing.js
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
const MongoStore = require('connect-mongo');

let mongoServer;
exports.initializeMongoServer = async () => {
  // This will create an ReplSet with 1 member
  mongoServer = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
    },
  });
  const mongoUri = mongoServer.getUri();
  console.log('🚀 ~ file: mongoConfigTesting.js:11 ~ exports.initializeMongoServer= ~ mongoUri:', mongoUri);

  mongoose.connection.on('error', (e) => {
    if (e.message.code === 'ETIMEDOUT') {
      console.log(e);
      mongoose.connect(mongoUri);
    }
    console.log(e);
  });

  mongoose.connection.once('open', () => {
    console.log(`MongoDB successfully connected to ${mongoUri}`);
  });
  let sessionStore;
  await mongoose.connect(`${mongoUri}`).then((res) => {
    const { client } = res.connection;
    sessionStore = MongoStore.create({ client });
  });
  return sessionStore;
};

exports.dbDisconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};
