const Group = require("../models/Group");
const GroupMember = require("../models/GroupMember");
const GroupMessage = require("../models/GroupMessage");
const User = require("../models/User");
const Contact = require("../models/Contacts");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { sequelize } = require("../utils/database");
const { Model, Sequelize } = require("sequelize");

exports.createGroup = async (req, res) => {
  const { id } = req.user;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json(new ApiResponse(400, "Group name is required"));
  }
  const t = await sequelize.transaction();
  try {
    const existingGroup = await Group.findOne({
      where: {
        name,
        createdBy: id,
      },
    });

    if (existingGroup) {
      await t.rollback();
      return res
        .status(400)
        .json(new ApiResponse(400, "Group name already exists"));
    }
    const newGroup = await Group.create(
      {
        name,
        createdBy: id,
      },
      { transaction: t }
    );
    await GroupMember.create(
      {
        groupId: newGroup.id,
        userId: id,
        role: "admin",
      },
      { transaction: t }
    );
    await t.commit();
    res.status(200).json(new ApiResponse(200, "Group created successfully"));
  } catch (error) {
    if (t) await t.rollback();
    console.error("Error while creating group: ", error); // Log the error for debugging purposes
    res.status(500).json(new ApiResponse(500, "Error while creating group"));
  }
};

exports.getAllGroups = async (req, res) => {
  const { id } = req.user;
  try {
    if (!id) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const groups = await Group.findAll({
      include: {
        model: GroupMember,
        where: { userId: id },
        // include: [{ model: User, attributes: ["id", "name", "email"] }],
        attributes: [],
      },
    });

    res
      .status(200)
      .json(new ApiResponse(200, "Groups fetched successfully", groups));
  } catch (error) {
    console.error("Error details:", error);
    res.status(500).json(new ApiError(500, "Something went wrong", error));
  }
};

exports.getParticularGroup = async (req, res) => {
  const { id } = req.user;
  const { groupId } = req.params;

  try {
    if (!id) {
      return res
        .status(400)
        .json(new ApiError(400, "User ID is not correct, please log in again"));
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const group = await Group.findOne({
      where: { id: groupId },
      include: [
        {
          model: GroupMember,
          // where: { userId: id },
          include: [
            {
              model: User,
              attributes: [
                "id",
                "firstName",
                "lastName",
                "phoneNumber",
                "emailId",
              ],
            },
          ],
          required: true, // Ensures the user is part of the group
        },
        {
          model: GroupMember,
        },
        {
          model: GroupMessage,
        },
      ],
    });

    if (!group) {
      return res
        .status(404)
        .json(new ApiError(404, "No group found or user not part of group"));
    }

    return res.status(200).json(
      new ApiResponse(200, "Details fetched successfully", {
        group,
      })
    );
  } catch (error) {
    console.log("Error in fetching group details:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong", error));
  }
};

exports.getGroupMembers = async (req, res) => {
  const { id } = req.user;
  const { groupId } = req.params;

  try {
    if (!id) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const group = await Group.findOne({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json(new ApiError(404, "Group not found"));
    }

    const members = await GroupMember.findAll({
      where: { groupId: groupId },
      include: [
        {
          model: User,
          attributes: ["id", "firstName", "lastName", "phoneNumber", "emailId"],
        },
      ],
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, "Group members fetched successfully", members)
      );
  } catch (error) {
    console.error("Error in fetching group members: ", error);
    res.status(500).json(new ApiError(500, "Something went wrong"));
  }
};

exports.getGroupMessages = async (req, res) => {
  const { id } = req.user;
  const { groupId } = req.params;

  try {
    if (!groupId) {
      return res.status(400).json(new ApiError(400, "Incorrect Group Id"));
    }

    // Check if the user is part of the group
    const userAdded = await GroupMember.findOne({
      where: { groupId: groupId, userId: id },
    });

    if (!userAdded) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "No such group exists or user not part of the group"
          )
        );
    }

    // Fetch all messages from the group
    const messages = await GroupMessage.findAll({
      where: { groupId: groupId },
      order: [["createdAt", "ASC"]],
      include: {
        model: User,
        attributes: ["firstName", "lastName", "id"],
      },
    });

    // Format the messages to match the socket response structure
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.User.id,
      senderName: `${msg.User.firstName} ${msg.User.lastName}`,
      content: msg.content,
      groupId: msg.groupId,
      createdAt: msg.createdAt,
      type: msg.type,
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Messages retrieved successfully",
          formattedMessages
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiError(500, "Something went wrong in retrieving the messages")
      );
  }
};

exports.addGroupMember = async (req, res) => {
  const { id } = req.user;
  const { contactId, groupId } = req.body;

  const t = await sequelize.transaction();

  try {
    if (!id) {
      await t.rollback(); // Ensure rollback here as well
      return res.status(404).json(new ApiError(404, "User Not Found"));
    }

    const user = await User.findOne({ where: { id: id } });
    if (!user) {
      await t.rollback();
      return res.status(404).json(new ApiError(404, "User Not Found"));
    }

    // Check if the user is an admin of the group
    const userRole = await GroupMember.findOne({
      where: { userId: id, groupId: groupId },
      transaction: t,
    });

    if (!userRole || userRole.role !== "admin") {
      await t.rollback();
      return res
        .status(403)
        .json(
          new ApiError(403, "You need to be an admin to add group members")
        );
    }

    // Combine contact check and group membership check in one query
    const contactAdded = await Contact.findOne({
      where: { userId: id, contactId: contactId },
      transaction: t,
    });

    if (!contactAdded) {
      await t.rollback();
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "You need to add contact first before adding in group"
          )
        );
    }

    const existingMember = await GroupMember.findOne({
      where: { groupId: groupId, userId: contactId },
      paranoid: false, // Include soft-deleted records
      transaction: t,
    });

    if (existingMember) {
      if (existingMember.deletedAt) {
        // Restore the soft-deleted record
        await existingMember.restore({ transaction: t });
        await t.commit();
        return res
          .status(200)
          .json(
            new ApiResponse(200, "Contact restored successfully to the group")
          );
      } else {
        await t.rollback();
        return res
          .status(400)
          .json(new ApiError(400, "Contact is already added in the group"));
      }
    }

    await GroupMember.create(
      {
        userId: contactId,
        groupId: groupId,
        role: "member",
      },
      { transaction: t }
    );

    await t.commit();
    return res
      .status(200)
      .json(new ApiResponse(200, "Contact added successfully"));
  } catch (error) {
    if (t) await t.rollback(); // Ensure rollback only once
    console.log("Something went wrong in adding group member:", error);
    return res
      .status(500)
      .json(
        new ApiError(500, "Something went wrong while adding contact in group")
      );
  }
};

exports.removeGroupMember = async (req, res) => {
  const { id } = req.user;
  const { contactId, groupId } = req.body;
  if (!id) {
    return res.status(404).json(new ApiError(404, "User Not Found"));
  }
  const transaction = await sequelize.transaction();
  try {
    const user = await User.findOne({ where: { id: id }, transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json(new ApiError(404, "User Not Found"));
    }
    const userRole = await GroupMember.findOne({
      where: { userId: id, groupId: groupId },
      transaction,
    });

    if (!userRole || userRole.role !== "admin") {
      await transaction.rollback();
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            "You need to be admin to add or remove group members"
          )
        );
    }
    console.log(contactId, groupId);
    const existingMember = await GroupMember.findOne({
      where: { groupId: groupId, userId: contactId },
      transaction,
    });
    console.log(existingMember, "existing member");
    if (!existingMember) {
      await transaction.rollback();
      return res
        .status(400)
        .json(new ApiError(400, "Contact is not part of the group"));
    }
    if (existingMember.role === "admin") {
      await transaction.rollback();
      return res
        .status(403)
        .json(new ApiError(403, "You can't remove an admin from the group"));
    }
    await GroupMember.destroy({
      where: { userId: contactId, groupId: groupId },
      transaction,
    });

    await transaction.commit();
    return res
      .status(200)
      .json(new ApiResponse(200, "User removed from the group successfully"));
  } catch (error) {
    await transaction.rollback();
    console.log("Something went wrong in removing group member:", error);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Something went wrong while removing contact from group"
        )
      );
  }
};

exports.addAdmin = async (req, res) => {
  const { id } = req.user;
  const { contactId, groupId } = req.body;

  try {
    if (!id) {
      return res
        .status(400)
        .json(
          new ApiError(400, "No user ID found. Please log in and try again.")
        );
    }

    const user = await User.findOne({ where: { id: id } });
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found."));
    }

    const userRole = await GroupMember.findOne({
      where: { groupId: groupId, userId: id },
    });
    if (!userRole) {
      return res
        .status(400)
        .json(new ApiError(400, "You are not part of the group."));
    }
    if (userRole.role !== "admin") {
      return res
        .status(403)
        .json(
          new ApiError(403, "You need to be an admin to make others admin.")
        );
    }

    const userContact = await Contact.findOne({
      where: { userId: id, contactId: contactId },
    });
    if (!userContact) {
      return res
        .status(403)
        .json(
          new ApiError(403, "You first need to add the user as your contact.")
        );
    }
    const groupMember = await GroupMember.findOne({
      where: { groupId: groupId, userId: contactId },
    });
    if (!groupMember) {
      return res
        .status(400)
        .json(new ApiError(400, "User is not part of the group."));
    }

    const contactGroupRole = groupMember.role;
    if (contactGroupRole === "admin") {
      return res
        .status(400)
        .json(new ApiError(400, "User is already an admin."));
    }

    await GroupMember.update(
      { role: "admin" },
      { where: { userId: contactId, groupId: groupId } }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "User has been made an admin successfully."));
  } catch (error) {
    console.log("Error in making admin:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong, please try again."));
  }
};

exports.leaveGroup = async (req, res) => {
  const { id } = req.user;
  const { groupId } = req.body;
  const transaction = await sequelize.transaction();
  try {
    if (!id) {
      await transaction.rollback();
      return res.status(400).json(new ApiError(400, "User ID not provided"));
    }
    const user = await User.findOne({ where: { id: id }, transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json(new ApiError(404, "User not found"));
    }
    const userGroup = await GroupMember.findOne({
      where: { userId: id, groupId: groupId },
      transaction,
    });

    if (!userGroup) {
      await transaction.rollback();
      return res
        .status(404)
        .json(new ApiError(404, "User is not a member of this group"));
    }
    const userRole = userGroup.role;
    if (userRole === "admin") {
      const adminCount = await GroupMember.count({
        where: { groupId: groupId, role: "admin" },
        transaction,
      });

      if (adminCount <= 1) {
        await transaction.rollback();
        return res
          .status(403)
          .json(
            new ApiError(
              403,
              "You are the last admin. Transfer admin rights before leaving the group"
            )
          );
      }
    }
    await GroupMember.destroy({
      where: { userId: id, groupId: groupId },
      transaction,
    });

    await transaction.commit();
    return res
      .status(200)
      .json(new ApiResponse(200, "You have successfully left the group"));
  } catch (error) {
    await transaction.rollback();
    console.log("Error in leaving group:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong while leaving the group"));
  }
};

exports.editGroupName = async (req, res) => {
  const { id } = req.user;
  const { groupId, newName } = req.body;

  const t = await sequelize.transaction();
  try {
    const userRole = await GroupMember.findOne({
      where: { userId: id, groupId: groupId },
      transaction: t,
    });

    if (!userRole || userRole.role !== "admin") {
      await t.rollback();
      return res
        .status(403)
        .json(
          new ApiError(403, "You need to be an admin to edit the group name")
        );
    }

    await Group.update(
      { name: newName },
      { where: { id: groupId }, transaction: t }
    );
    await t.commit();
    return res
      .status(200)
      .json(new ApiResponse(200, "Group name updated successfully"));
  } catch (error) {
    await t.rollback();
    console.error("Error while updating group name: ", error);
    return res
      .status(500)
      .json(new ApiError(500, "Error while updating group name"));
  }
};

exports.deleteGroup = async (req, res) => {
  const { id } = req.user;
  const { groupId } = req.params;

  const t = await sequelize.transaction();

  try {
    if (!id) {
      await t.rollback();
      return res.status(400).json(new ApiError(400, "User ID not provided"));
    }

    // Check if the user is an admin of the group
    const userRole = await GroupMember.findOne({
      where: { userId: id, groupId: groupId },
      transaction: t,
    });

    if (!userRole || userRole.role !== "admin") {
      await t.rollback();
      return res
        .status(403)
        .json(new ApiError(403, "You need to be an admin to delete the group"));
    }

    // Delete group messages
    await GroupMessage.destroy({
      where: { groupId: groupId },
      transaction: t,
    });

    // Delete group members
    await GroupMember.destroy({
      where: { groupId: groupId },
      transaction: t,
    });

    // Delete the group
    await Group.destroy({
      where: { id: groupId },
      transaction: t,
    });

    await t.commit();
    return res
      .status(200)
      .json(new ApiResponse(200, "Group deleted successfully"));
  } catch (error) {
    await t.rollback();
    console.error("Error while deleting group: ", error);
    return res
      .status(500)
      .json(new ApiError(500, "Error while deleting group"));
  }
};
