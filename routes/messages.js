const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddlewares");
const messagesController = require("../controllers/messages");

// router.post(
//   "/send-message",
//   authMiddleware.validateAccessToken,
//   messagesController.sendNewMessages
// );

router.get(
  "/latest-message",
  authMiddleware.validateAccessToken,
  messagesController.getContactsAndLatestMessages
);

router.get(
  "/contact/:contactId",
  authMiddleware.validateAccessToken,
  messagesController.getAllMessages
);

module.exports = router;
