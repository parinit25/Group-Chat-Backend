const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "mysql",
  database: "group-chat",
  host: "localhost",
  username: "root",
  password: "Node@12345",
  logging: console.log,
});
module.exports = {
  sequelize,
};
