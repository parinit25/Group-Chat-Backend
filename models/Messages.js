const { sequelize } = require("../utils/database");
const { DataTypes } = require("sequelize");
const User = require("./User");

const Messages = sequelize.define(
  "Messages",
  {
    id: {
      primaryKey: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    type: {
      type: DataTypes.ENUM("text", "media"),
      allowNull: false,
    },
    
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    timestamps: true,
    paranoid: true,
    tableName: "messages",
  }
);

module.exports = Messages;
