const { DataTypes } = require("sequelize");
const { sequelize } = require("../utils/database");
const User = require("./User");

const Group = sequelize.define(
  "Group",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "id",
      },
    },
  },
  {
    paranoid: true,
    tableName: "groups",
    timestamps: true,
  }
);

module.exports = Group;
