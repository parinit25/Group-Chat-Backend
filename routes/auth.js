const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const authMiddleware = require("../middlewares/authMiddlewares");

router.post("/login", authController.userLogin); // User log in
router.post("/signup", authController.userSignup); // User Sign up
router.post("/refresh", authController.refreshAccessToken); // User Access Token Renew API
router.get(
  "/user-info",
  authMiddleware.validateAccessToken,
  authController.getUserInfo
); // Get user Info

module.exports = router;
