const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const User = require("../models/User");
const Message = require("../models/Message");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

router.post("/create", authMiddleware, async (req, res) => {
  const { name, memberIds } = req.body;
  try {
    const members = [...new Set([...memberIds, req.user.userId])];
    const group = new Group({
      name,
      members,
      createdBy: req.user.userId,
    });
    await group.save();

    const populatedGroup = await Group.findById(group._id).populate(
      "members",
      "name avatar"
    );
    res.status(201).json(populatedGroup);
  } catch (err) {
    res.status(500).json({ error: "Failed to create group" });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.userId }).populate(
      "members",
      "name avatar"
    );
    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Message.findOne({ group: group._id })
          .sort({ timestamp: -1 })
          .select("text image timestamp sender");

        const unreadCount = group.unreadCounts.get(req.user.userId) || 0;

        return {
          ...group._doc,
          lastMessage: lastMessage
            ? lastMessage.image
              ? "📷 Image"
              : lastMessage.text
            : "No messages yet",
          lastMessageTime: lastMessage ? lastMessage.timestamp : null,
          unreadCount,
          createdBy: group.createdBy,
        };
      })
    );
    res.json(groupsWithLastMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.get("/:groupId/messages", authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  try {
    const messages = await Message.find({ group: groupId })
      .populate("sender", "name avatar")
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch group messages" });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.put(
  "/:groupId",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    const { groupId } = req.params;
    const { name } = req.body;
    const avatar = req.file;

    try {
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (group.createdBy.toString() !== req.user.userId) {
        return res
          .status(403)
          .json({ error: "Only the creator of Group can edit" });
      }

      if (name) group.name = name;
      if (avatar) {
        group.avatar = `/uploads/${avatar.filename}`;
      }

      await group.save();
      res.json({ name: group.name, avatar: group.avatar });
    } catch (err) {
      res.status(500).json({ error: "Failed to update group" });
    }
  }
);

router.put("/:groupId/add-members", authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { memberIds } = req.body;

  try {
    const group = await Group.findById(groupId).populate(
      "members",
      "name avatar"
    );
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.createdBy.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "Only the creator can add members" });
    }

    const newMembers = [
      ...new Set([...group.members.map((m) => m._id.toString()), ...memberIds]),
    ];
    group.members = newMembers;
    await group.save();

    const updatedGroup = await Group.findById(groupId).populate(
      "members",
      "name avatar"
    );
    res.json({ members: updatedGroup.members });
  } catch (err) {
    res.status(500).json({ error: "Failed to add members" });
  }
});

router.put("/:groupId/remove-members", authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { memberIds } = req.body;

  try {
    const group = await Group.findById(groupId).populate(
      "members",
      "name avatar"
    );
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.createdBy.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "Only the creator can remove members" });
    }

    if (memberIds.includes(req.user.userId)) {
      return res.status(400).json({ error: "Cannot remove the group creator" });
    }

    group.members = group.members.filter(
      (member) => !memberIds.includes(member._id.toString())
    );
    await group.save();

    const updatedGroup = await Group.findById(groupId).populate(
      "members",
      "name avatar"
    );
    res.json({ members: updatedGroup.members });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove members" });
  }
});

router.delete("/:groupId", authMiddleware, async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.createdBy.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "Only the creator can delete the group" });
    }

    await Message.deleteMany({ group: groupId });
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete group" });
  }
});

module.exports = router;
