const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {},
  },
  avatar: { type: String, default: "/uploads/pic1.webp" },
});

module.exports = mongoose.model("Group", groupSchema);
