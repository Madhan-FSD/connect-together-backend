import "dotenv/config";
import express from "express";
import { connectedDB } from "./config/index.js";
import cors from "cors";
import authRoutes from "./routes/auth/index.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.LOCAL_PORT || 8010;

app.use("/user/auth/api/", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const startServer = async () => {
  try {
    await connectedDB();
    app.listen(PORT, () => {
      console.log(`server is started  http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log("getting an error in server file", error);
  }
};

startServer();
