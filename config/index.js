const mongoose = require("mongoose");

const MONGO_URI = process.env.LOCAL_MONGO_URI;

const connectedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Data Base is connected");
  } catch (error) {
    console.log("mongo db is giving me an error", error);
    process.exit(1);
  }
};

module.exports = { connectedDB, mongoose };
