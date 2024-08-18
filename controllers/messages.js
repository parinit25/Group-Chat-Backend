const Contact = require("../models/Contacts");
const Messages = require("../models/Messages");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { sequelize } = require("../utils/database");
const { Op } = require("sequelize");

exports.sendNewMessages = async (req, res) => {};

exports.getAllMessages = async (req, res) => {
  const { id } = req.user;
  const { contactId } = req.params;

  if (!id || !contactId) {
    return res
      .status(400)
      .json(new ApiError(400, "User ID or contact ID cannot be empty"));
  }

  try {
    // Check if contact exists
    const contact = await User.findByPk(contactId);
    if (!contact) {
      return res.status(404).json(new ApiError(404, "Contact not found"));
    }

    // Fetch all messages between the authenticated user and the contact
    const messages = await Messages.findAll({
      attributes: [
        "content",
        "receiverId",
        "senderId",
        "createdAt",
        "id",
        "type",
        "updatedAt",
      ],
      where: {
        [Op.or]: [
          { senderId: id, receiverId: contactId },
          { senderId: contactId, receiverId: id },
        ],
      },
      order: [["createdAt", "ASC"]],
    });

    if (messages.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, "No messages found", { messages: [] }));
    }

    return res.status(200).json(
      new ApiResponse(200, "Messages retrieved successfully", {
        messages,
      })
    );
  } catch (error) {
    console.error("Error in retrieving messages:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};

exports.getContactsAndLatestMessages = async (req, res) => {
  const { id } = req.user;
  try {
    // Find the user's contacts
    const contacts = await User.findByPk(id, {
      attributes: ["id", "firstName", "emailId", "phoneNumber"],
      include: [
        {
          model: User,
          as: "Contacts",
          through: {
            attributes: [],
          },
          attributes: ["id", "firstName", "lastName", "emailId", "phoneNumber"],
        },
      ],
      raw: false,
      nest: true,
    });

    if (!contacts.Contacts || contacts.Contacts.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, "No contacts found", { contacts: [] }));
    }

    // Fetch the latest message for each contact
    const contactsAndMessages = await Promise.all(
      contacts.Contacts.map(async (contact) => {
        const latestMessage = await Messages.findOne({
          where: {
            [Op.or]: [
              { senderId: id, receiverId: contact.id },
              { senderId: contact.id, receiverId: id },
            ],
          },
          order: [["createdAt", "DESC"]],
          include: [
            {
              model: User,
              as: "Sender",
              attributes: ["id", "firstName", "lastName"],
            },
            {
              model: User,
              as: "Receiver",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
        });

        return {
          contact,
          latestMessage,
        };
      })
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Contacts and latest messages retrieved successfully",
          { contactsAndMessages }
        )
      );
  } catch (error) {
    console.error("Error in retrieving contacts and latest messages:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
};
