require("dotenv").config();
const express = require("express");
const { connectedDB } = require("./config");
const cors = require("cors");
const authRoutes = require("./routes/auth/index.js");
const institution = require("./routes/admin/index.js");
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.LOCAL_PORT || 8010;

app.use("/user/auth/api/", authRoutes);
app.use("/admin/api/", institution);

app.get("/", (req, res) => {
  res.send("Hello Wold!");
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
