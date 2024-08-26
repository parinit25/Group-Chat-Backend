const { Op } = require("sequelize");
const Contact = require("../models/Contacts");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { sequelize } = require("../utils/database");

exports.addUserContacts = async (req, res) => {
  const { id } = req.user;
  const { contactId } = req.body;
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json(new ApiError(404, "User not found"));
    }
    const contact = await Contact.findOne({
      where: { userId: id, contactId: contactId },
      transaction: t,
    });

    if (contact) {
      await t.rollback();
      return res
        .status(400)
        .json(new ApiError(400, "Contact is already added"));
    }
    // Using bulkCreate to create both contact entries
    await Contact.bulkCreate(
      [
        { userId: id, contactId: contactId },
        { userId: contactId, contactId: id },
      ],
      { transaction: t }
    );
    await t.commit();
    return res
      .status(200)
      .json(new ApiResponse(200, "Contact added successfully"));
  } catch (error) {
    if (t) await t.rollback();
    return res
      .status(500)
      .json(new ApiError(500, "An error occurred while adding the contact"));
  }
};

exports.getAllContacts = async (req, res) => {
  const { id } = req.user;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json(new ApiError(404, "User does not exists"));
    }
    const listOfUserContacts = await User.findByPk(id, {
      attributes: ["id", "firstName", "emailId", "phoneNumber"],
      include: [
        {
          model: User,
          as: "Contacts",
          through: {
            attributes: ["contactId"],
          },
          attributes: ["id", "firstName", "lastName", "emailId", "phoneNumber"],
        },
      ],
      raw: false,
      nest: true,
    });
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Contacts fetched successfully",
          listOfUserContacts
        )
      );
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json(new ApiError(500, "An error occured while fetching the user"));
  }
};

exports.getContactsDetails = async (req, res) => {
  const { contactId } = req.params;
  const { id } = req.user;
  try {
    if (!contactId) {
      return res.status(404).json(new ApiError(404, "Contact Not Found"));
    }
    const user = await User.findByPk(id, {
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
    if (!user) {
      return res.status(404).json(new ApiError(404, "User Not Found"));
    }
    const contact = user.Contacts.find((c) => c.id === parseInt(contactId));
    if (!contact) {
      return res.status(404).json(new ApiError(404, "Contact Not Found"));
    }
    res
      .status(200)
      .json(
        new ApiResponse(200, "Contact Details Fetched Successfully", contact)
      );
  } catch (error) {
    res
      .status(500)
      .json(new ApiError(500, "Internal Server Error", error.message));
  }
};

exports.searchContacts = async (req, res) => {
  const { searchParams } = req.params;
  try {
    if (!searchParams) {
      res.status(400).json(new ApiError(400, "Search Value cannot be empty"));
    }
    const users = await User.findAll({
      attributes: ["id", "firstName", "lastName", "emailId", "phoneNumber"],
      where: {
        [Op.or]: [
          { emailId: { [Op.like]: `%${searchParams}%` } },
          { firstName: { [Op.like]: `%${searchParams}%` } },
          { phoneNumber: { [Op.like]: `%${searchParams}%` } },
        ],
      },
    });
    res
      .status(200)
      .json(new ApiResponse(200, "Users fetched successfully", users));
  } catch (error) {
    res.status(500).json(new ApiError(500, "Internal Server Error"));
    throw new Error(error);
  }
};
