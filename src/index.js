import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 3003;

connectDB()
  .then(() => {
    const port = process.env.PORT || 8000;
    app.listen(port, "127.0.0.1", () => {
      console.log(`Server listening on http://127.0.0.1:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
