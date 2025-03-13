const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcryptjs")
const router = express.Router();
const Message = require("../models/Message");
const multer = require("multer");
const path = require("path");
const sendEmail = require("../utils/sendEmail");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPG, PNG, WEBP) are allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter });


router.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const userId = req.body.userId;
  const avatarUrl = `/uploads/${req.file.filename}`;

  try {
    await User.findByIdAndUpdate(userId, { avatar: avatarUrl });
    res.json({ success: true, avatar: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to update avatar" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.resetOtp = otp;
    user.resetOtpExpires = otpExpires;
    await user.save();

    await sendEmail(
      email,
      "JustTalk - Password Reset Request",
      `
      <h3>Hello ${user.name},</h3>
      <p>We received a request to reset your password for your JustTalk account. Use the OTP below to reset your password:</p>
      <h2 style="color: #2d89ef;">${otp}</h2>
      <p><strong>Note:</strong> This OTP is valid for only 10 minutes. If you did not request a password reset, please ignore this email.</p>
      <p>For security reasons, never share this OTP with anyone.</p>
      <br>
      <p>Best Regards,</p>
      <p><strong>JustTalk Support Team</strong></p>
      `
    );


    res.json({ message: "OTP sent to your email", email });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({ message: "OTP verified", email });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.resetOtp || user.resetOtpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP not verified or expired" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const nameExists = await User.findOne({ name });
    if (nameExists) {
      return res.status(400).json({ message: "Name Already taken! Use Another!" });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User with this email already exists" });

    if (password.length < 6) {
      return res.status(400).json({ message: "Password length should be minimum 6 characters" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({ name, email, password: hashedPassword });

    res.json({ message: "Registration successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid Email" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { userId: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Login successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/logout", (req, res) => {
  res.cookie("jwt", "", { httpOnly: true, expires: new Date(0) });
  res.json({ message: "Logged out" });
});


router.get("/me", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;
    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      "_id name avatar"
    );

    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: currentUserId, receiver: user._id },
            { sender: user._id, receiver: currentUserId },
          ],
        })
          .sort({ timestamp: -1 })
          .select("text image timestamp sender receiver");

        const unreadCount = await Message.countDocuments({
          sender: user._id,
          receiver: currentUserId,
          isRead: false,
        });

        return {
          ...user._doc,
          lastMessage: lastMessage
            ? lastMessage.image
              ? "📷 Image"
              : lastMessage.text
            : null,
          lastMessageTime: lastMessage ? lastMessage.timestamp : null,
          unreadCount,
        };
      })
    );

    res.json(usersWithLastMessage);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

router.patch("/update-avatar", async (req, res) => {
  const { userId, avatar } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true }
    );
    if (!updatedUser)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});



module.exports = router;
