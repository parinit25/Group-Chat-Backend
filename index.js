require("dotenv").config();
const { sequelize } = require("./utils/database");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
//Models Import
const User = require("./models/User");

//Routes Import
const authRoutes = require("./routes/auth");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

app.use("/auth", authRoutes);

sequelize
  .sync({ alter: true })
  .then(() => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
