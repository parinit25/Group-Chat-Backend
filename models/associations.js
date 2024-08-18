const User = require("./User");
const Contact = require("./Contacts");
const Group = require("./Group");
const GroupMember = require("./GroupMember");
const GroupMessage = require("./GroupMessage");
const Messages = require("./Messages");

// Define the many-to-many relationship for contacts
User.belongsToMany(User, {
  as: "Contacts",
  through: Contact,
  foreignKey: "userId",
  otherKey: "contactId",
});

User.belongsToMany(Group, {
  through: GroupMember,
  foreignKey: "userId",
});

Group.belongsToMany(User, {
  through: GroupMember,

  foreignKey: "groupId",
});

Group.hasMany(GroupMember, { foreignKey: "groupId" });

GroupMember.belongsTo(User, { foreignKey: "userId" });
GroupMember.belongsTo(Group, { foreignKey: "groupId" });

// Define the relationships for group messages
User.hasMany(GroupMessage, { foreignKey: "senderId" });
GroupMessage.belongsTo(User, { foreignKey: "senderId" });
Group.hasMany(GroupMessage, { foreignKey: "groupId" });
GroupMessage.belongsTo(Group, { foreignKey: "groupId" });

// Define the relationships for individual messages
User.hasMany(Messages, { foreignKey: "senderId", as: "SentMessages" });
User.hasMany(Messages, { foreignKey: "receiverId", as: "ReceivedMessages" });
Messages.belongsTo(User, { as: "Sender", foreignKey: "senderId" });
Messages.belongsTo(User, { as: "Receiver", foreignKey: "receiverId" });
