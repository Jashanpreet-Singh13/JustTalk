const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  text: { type: String, default: "" },
  image: { type: String, default: null },

  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  isDelivered: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("Message", messageSchema);
