const express = require("express");
const router = express.Router();
const contactsController = require("../controllers/contact");
const authMiddleware = require("../middlewares/authMiddlewares");

router.post(
  "/add-contact",
  authMiddleware.validateAccessToken,
  contactsController.addUserContacts
);

router.get(
  "/",
  authMiddleware.validateAccessToken,
  contactsController.getAllContacts
);

router.get(
  "/search/:searchParams",
  authMiddleware.validateAccessToken,
  contactsController.searchContacts
);

router.get(
  "/contact/:contactId",
  authMiddleware.validateAccessToken,
  contactsController.getContactsDetails
);

module.exports = router;
