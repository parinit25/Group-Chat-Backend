const { DataTypes } = require("sequelize");
const { sequelize } = require("../utils/database");
const User = require("./User");
const Group = require("./Group");

const GroupMember = sequelize.define(
  "GroupMember",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "id",
      },
    },
    groupId: {
      type: DataTypes.INTEGER,
      references: {
        model: Group,
        key: "id",
      },
    },
    role: {
      type: DataTypes.ENUM("admin", "member"),
      allowNull: false,
    },
  },
  {
    paranoid: true,
    tableName: "group_members",
    timestamps: true,
  }
);



module.exports = GroupMember;
