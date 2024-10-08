const { DataTypes } = require("sequelize");
const { sequelize } = require("../utils/database");
const User = require("./User");
const Group = require("./Group");

const GroupMessage = sequelize.define(
  "GroupMessage",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    groupId: {
      type: DataTypes.INTEGER,
      references: {
        model: Group,
        key: "id",
      },
    },
    type: {
      type: DataTypes.ENUM("text", "media"),
      allowNull: false,
    },
    senderId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "id",
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    paranoid: true,
    tableName: "group_messages",
    timestamps: true,
  }
);

module.exports = GroupMessage;
