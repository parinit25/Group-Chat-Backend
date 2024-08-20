require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT,
  timezone: process.env.DB_TIMEZONE,
});
module.exports = {
  sequelize,
};
