const express = require("express");
const Message = require("../models/Message");
const router = express.Router();
const User = require("../models/User");

router.get("/:sender/:receiver", async (req, res) => {
  const { sender, receiver } = req.params;
  console.log("Sender = " + sender);
  console.log("Receiver = " + receiver);
  try {
    const messages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ timestamp: 1 });

    const rece = await User.findById(receiver);
    res.json({ msgs: messages, lastSeen: rece.lastSeen });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/send", async (req, res) => {
  const { sender, receiver, text, image } = req.body;
  try {
    const message = new Message({ sender, receiver, text, image });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
