const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddlewares");
const groupController = require("../controllers/group");

router.post(
  "/create-group",
  authMiddleware.validateAccessToken,
  groupController.createGroup
);

router.get(
  "/",
  authMiddleware.validateAccessToken,
  groupController.getAllGroups
);

router.get(
  "/group-members/:groupId",
  authMiddleware.validateAccessToken,
  groupController.getGroupMembers
);

router.get(
  "/messages/:groupId",
  authMiddleware.validateAccessToken,
  groupController.getGroupMessages
);

router.put(
  "/edit-group",
  authMiddleware.validateAccessToken,
  groupController.editGroupName
);
router.post(
  "/leave-group",
  authMiddleware.validateAccessToken,
  groupController.leaveGroup
);
router.post(
  "/add-member",
  authMiddleware.validateAccessToken,
  groupController.addGroupMember
);
router.post(
  "/remove-member",
  authMiddleware.validateAccessToken,
  groupController.removeGroupMember
);
router.post(
  "/add-admin",
  authMiddleware.validateAccessToken,
  groupController.addAdmin
);
router.delete(
  "/group/:groupId",
  authMiddleware.validateAccessToken,
  groupController.deleteGroup
);
router.get(
  "/group/:groupId",
  authMiddleware.validateAccessToken,
  groupController.getParticularGroup
);

module.exports = router;
