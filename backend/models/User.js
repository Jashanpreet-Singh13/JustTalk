const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  avatar: {
    type: String,
    default: "/uploads/u3.png",
  },
  lastSeen: { type: Date, default: new Date },
  resetOtp: String, 
  resetOtpExpires: Date,
  verified: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);
