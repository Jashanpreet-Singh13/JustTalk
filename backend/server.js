const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const Message = require("./models/Message");
const User = require("./models/User");
const Group = require("./models/Group");

const uploadRoutes = require("./routes/upload");
const groupRoutes = require("./routes/group");

const PORT = process.env.PORT || 5000;

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({ origin: process.env.FRONTEND_URL, credentials: true })
);

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/group", groupRoutes);

const users = new Map(); 
const activeGroupChats = new Map(); 

app.get("/api/online-users", (req, res) => {
  res.json(Array.from(users.keys()));
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("registerUser", async (userId) => {
    if (userId) {
      users.set(userId, socket.id);
      console.log(`User Registered: ${userId} → ${socket.id}`);

      await User.findByIdAndUpdate(userId, { lastSeen: null });
      io.emit("updateUserStatus", Array.from(users.keys()));
      io.emit("updateLastSeen", { userId, lastSeen: null });

      const undeliveredMessages = await Message.find({
        receiver: userId,
        isDelivered: false,
      });

      if (undeliveredMessages.length > 0) {
        await Message.updateMany(
          { receiver: userId, isDelivered: false },
          { $set: { isDelivered: true } }
        );

        undeliveredMessages.forEach((msg) => {
          const senderSocketId = users.get(msg.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit("updateMessageStatus", {
              messageId: msg._id,
              isDelivered: true,
              isRead: false,
            });
          }
        });
      }

      const undeliveredGroupMessages = await Message.find({
        group: { $exists: true },
        isDelivered: false,
      }).populate("group");

      for (const msg of undeliveredGroupMessages) {
        const group = msg.group;
        const onlineMembersExceptSender = group.members
          .filter((memberId) => memberId.toString() !== msg.sender.toString())
          .filter((memberId) => users.has(memberId.toString()));

        if (onlineMembersExceptSender.length > 0) {
          await Message.updateOne(
            { _id: msg._id },
            { $set: { isDelivered: true } }
          );
          group.members.forEach((memberId) => {
            const memberSocketId = users.get(memberId.toString());
            if (memberSocketId) {
              io.to(memberSocketId).emit("updateGroupMessageStatus", {
                messageId: msg._id,
                isDelivered: true,
                readBy: msg.readBy || [],
                isRead: msg.isRead,
              });
            }
          });
        }
      }
    }
  });

  socket.on("joinGroupChat", ({ groupId, userId }) => {
    if (!activeGroupChats.has(groupId)) {
      activeGroupChats.set(groupId, new Set());
    }
    activeGroupChats.get(groupId).add(userId);
    console.log(`User ${userId} joined group chat ${groupId}`);
  });

  socket.on("leaveGroupChat", ({ groupId, userId }) => {
    if (activeGroupChats.has(groupId)) {
      activeGroupChats.get(groupId).delete(userId);
      if (activeGroupChats.get(groupId).size === 0) {
        activeGroupChats.delete(groupId);
      }
      console.log(`User ${userId} left group chat ${groupId}`);
    }
  });

  socket.on("sendMessage", async ({ sender, receiver, text, image }) => {
    if (!sender || !receiver || (!text.trim() && !image)) return;

    try {
      const isReceiverOnline = users.has(receiver);
      const message = new Message({
        sender,
        receiver,
        text,
        image,
        timestamp: new Date(),
        isDelivered: isReceiverOnline,
      });

      const savedMessage = await message.save();

      const messageData = {
        _id: savedMessage._id,
        sender: savedMessage.sender,
        receiver: savedMessage.receiver,
        text: savedMessage.text,
        image: savedMessage.image,
        timestamp: savedMessage.timestamp,
      };

      const receiverSocketId = users.get(receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", messageData);
      }

      socket.emit("receiveMessage", messageData);

      io.emit("newMessage", messageData);

      socket.emit("updateMessageStatus", {
        messageId: savedMessage._id,
        isDelivered: isReceiverOnline,
        isRead: false,
      });
    } catch (err) {
      console.error("Failed to Save Message:", err);
    }
  });

  socket.on("markMessagesAsRead", async ({ sender, receiver }) => {
    try {
      const senderId = new mongoose.Types.ObjectId(sender);
      const receiverId = new mongoose.Types.ObjectId(receiver);

      const updatedCount = await Message.updateMany(
        { sender: senderId, receiver: receiverId, isRead: false },
        { $set: { isRead: true, isDelivered: true } }
      );

      if (updatedCount.modifiedCount > 0) {
        const updatedMessages = await Message.find({
          sender: senderId,
          receiver: receiverId,
          isRead: true,
        });

        updatedMessages.forEach((msg) => {
          const senderSocketId = users.get(sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit("updateMessageStatus", {
              messageId: msg._id,
              isDelivered: true,
              isRead: true,
            });
          }
        });

        io.emit("updateUnreadCount", {
          sender,
          receiver,
          modified: updatedCount.modifiedCount,
        });
      }
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  });

  socket.on("typing", ({ sender, receiver }) => {
    const receiverSocketId = users.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { sender });
    }
  });

  socket.on("stopTyping", ({ sender, receiver }) => {
    const receiverSocketId = users.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStoppedTyping", { sender });
    }
  });

  socket.on("sendGroupMessage", async ({ sender, groupId, text, image }) => {
    if (!sender || !groupId || (!text.trim() && !image)) return;

    try {
      const group = await Group.findById(groupId);
      if (!group) {
        console.error("Group not found:", groupId);
        return;
      }

      const onlineMembersExceptSender = group.members
        .filter((memberId) => memberId.toString() !== sender)
        .filter((memberId) => users.has(memberId.toString()));
      const message = new Message({
        sender,
        group: groupId,
        text,
        image,
        timestamp: new Date(),
        isDelivered: onlineMembersExceptSender.length > 0,
        readBy: Array.from(activeGroupChats.get(groupId) || []).filter(
          (userId) => userId !== sender
        ),
      });

      const savedMessage = await message.save();
      const populatedMessage = await Message.findById(
        savedMessage._id
      ).populate("sender", "name avatar");
      const messageData = {
        _id: populatedMessage._id,
        sender: {
          _id: populatedMessage.sender._id,
          name: populatedMessage.sender.name,
          avatar: populatedMessage.sender.avatar,
        },
        group: populatedMessage.group,
        text: populatedMessage.text,
        image: populatedMessage.image,
        timestamp: populatedMessage.timestamp,
        isDelivered: populatedMessage.isDelivered,
        readBy: populatedMessage.readBy,
        isRead: populatedMessage.readBy.length === group.members.length - 1,
      };

      const unreadCountUpdate = {};
      const activeViewers = activeGroupChats.get(groupId) || new Set();
      group.members.forEach((memberId) => {
        const memberIdStr = memberId.toString();
        if (memberIdStr !== sender && !activeViewers.has(memberIdStr)) {
          unreadCountUpdate[`unreadCounts.${memberIdStr}`] =
            (group.unreadCounts.get(memberIdStr) || 0) + 1;
        }
      });
      if (Object.keys(unreadCountUpdate).length > 0) {
        await Group.updateOne({ _id: groupId }, { $set: unreadCountUpdate });
      }

      const updatedGroup = await Group.findById(groupId);

      group.members.forEach((memberId) => {
        const memberIdStr = memberId.toString();
        const memberSocketId = users.get(memberIdStr);
        if (memberSocketId) {
          io.to(memberSocketId).emit("receiveGroupMessage", messageData);
          io.to(memberSocketId).emit("updateGroupMessageStatus", {
            messageId: messageData._id,
            isDelivered: messageData.isDelivered,
            readBy: messageData.readBy,
            isRead: messageData.isRead,
          });
          const unreadCount = updatedGroup.unreadCounts.get(memberIdStr) || 0;
          io.to(memberSocketId).emit("updateGroupUnreadCount", {
            groupId,
            userId: memberIdStr,
            unreadCount,
          });
        }
      });

      io.emit("newGroupMessage", { groupId, message: messageData });
    } catch (err) {
      console.error("Failed to save group message:", err);
    }
  });

  socket.on("markGroupMessagesAsRead", async ({ groupId, userId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        console.error("Group not found:", groupId);
        return;
      }

      const messages = await Message.find({
        group: groupId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
      });

      if (messages.length > 0) {
        const updatedMessages = [];
        for (const msg of messages) {
          const updatedReadBy = [...msg.readBy, userId];
          const isAllRead = updatedReadBy.length === group.members.length - 1;
          await Message.updateOne(
            { _id: msg._id },
            {
              $set: {
                readBy: updatedReadBy,
                isRead: isAllRead,
                isDelivered: true,
              },
            }
          );
          updatedMessages.push({
            _id: msg._id,
            isDelivered: true,
            readBy: updatedReadBy,
            isRead: isAllRead,
          });
        }

        await Group.updateOne(
          { _id: groupId },
          { $set: { [`unreadCounts.${userId}`]: 0 } }
        );

        const updatedGroup = await Group.findById(groupId);

        group.members.forEach((memberId) => {
          const memberIdStr = memberId.toString();
          const memberSocketId = users.get(memberIdStr);
          if (memberSocketId) {
            updatedMessages.forEach((msg) => {
              io.to(memberSocketId).emit("updateGroupMessageStatus", {
                messageId: msg._id,
                isDelivered: msg.isDelivered,
                readBy: msg.readBy,
                isRead: msg.isRead,
              });
            });
            const unreadCount = updatedGroup.unreadCounts.get(memberIdStr) || 0;
            io.to(memberSocketId).emit("updateGroupUnreadCount", {
              groupId,
              userId: memberIdStr,
              unreadCount,
            });
          }
        });
      }
    } catch (err) {
      console.error("Failed to mark group messages as read:", err);
    }
  });

  socket.on("disconnect", async () => {
    console.log(`User Disconnected: ${socket.id}`);
    for (const [userId, socketId] of users.entries()) {
      if (socketId === socket.id) {
        users.delete(userId);

        for (const [groupId, viewers] of activeGroupChats.entries()) {
          viewers.delete(userId);
          if (viewers.size === 0) {
            activeGroupChats.delete(groupId);
          }
        }

        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { lastSeen });
        io.emit("updateUserStatus", Array.from(users.keys()));
        io.emit("updateLastSeen", { userId, lastSeen });
        console.log(`Removed User: ${userId}`);
        break;
      }
    }
  });
});

server.listen(PORT, () => console.log(`Server Running on Port:${PORT}`));
