import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaSmile, FaPaperclip } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import EmojiPicker from "emoji-picker-react";
import { toast, Toaster } from "react-hot-toast";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const GWindow = ({ selectedGroup, user, socket }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);

  useEffect(() => {
    if (!selectedGroup || !user) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/group/${selectedGroup._id}/messages`,
          { withCredentials: true }
        );
        setMessages(res.data || []);
        socket.emit("markGroupMessagesAsRead", {
          groupId: selectedGroup._id,
          userId: user._id,
        });
      } catch (err) {
        console.error("Failed to fetch group messages", err);
      }
    };

    fetchMessages();

    socket.emit("joinGroupChat", {
      groupId: selectedGroup._id,
      userId: user._id,
    });

    return () => {
      socket.emit("leaveGroupChat", {
        groupId: selectedGroup._id,
        userId: user._id,
      });
    };
  }, [selectedGroup, user, socket]);

  useEffect(() => {
    if (!selectedGroup || !user) return;

    const handleReceiveGroupMessage = (message) => {
      if (message.group.toString() === selectedGroup._id) {
        setMessages((prev) => {
          if (!prev.some((msg) => msg._id === message._id)) {
            return [...prev, message];
          }
          return prev;
        });
      }
    };

    const handleUpdateGroupMessageStatus = ({
      messageId,
      isDelivered,
      readBy,
      isRead,
    }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, isDelivered, readBy, isRead } : msg
        )
      );
    };

    socket.on("receiveGroupMessage", handleReceiveGroupMessage);
    socket.on("updateGroupMessageStatus", handleUpdateGroupMessageStatus);

    return () => {
      socket.off("receiveGroupMessage", handleReceiveGroupMessage);
      socket.off("updateGroupMessageStatus", handleUpdateGroupMessageStatus);
    };
  }, [selectedGroup, user, socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prevMessage) => prevMessage + emojiData.emoji);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];
    if (!validImageTypes.includes(file.type)) {
      toast.error("Only image messages can be sent");
      event.target.value = null;
      return;
    }

    const maxSizeInBytes = 1 * 1024 * 1024; // 1 MB
    if (file.size > maxSizeInBytes) {
      toast.error(
        "Image size should not exceed 1MB! Please upload smaller size image!"
      );
      event.target.value = null;
      return;
    }

    setSelectedImage(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const sendMessage = async () => {
    if (!selectedGroup || (!newMessage.trim() && !selectedImage)) return;

    let imageUrl = "";
    if (selectedImage) {
      const formData = new FormData();
      formData.append("image", selectedImage);

      try {
        const res = await axios.post(`${API_URL}/api/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        imageUrl = res.data.imageUrl;
      } catch (err) {
        console.error("Image upload failed", err);
        toast.error("Image upload failed");
        return;
      }
    }

    const messageData = {
      sender: user._id,
      groupId: selectedGroup._id,
      text: imageUrl ? "" : newMessage,
      image: imageUrl || "",
    };

    socket.emit("sendGroupMessage", messageData);

    setSelectedImage(null);
    setImgPreview(null);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#e7ddd2]">
      {selectedGroup ? (
        <>
          <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-300">
            <div className="flex items-center gap-2.5">
              <img
                className="h-14 w-14 rounded-full"
                src={`${API_URL}${selectedGroup.avatar}`}
                alt=""
              />
              <h2 className="text-lg font-semibold">{selectedGroup.name}</h2>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`px-3 py-1 rounded-lg ${
                  msg.sender._id === user._id
                    ? "bg-emerald-300 text-gray-800 ml-auto"
                    : "bg-white text-gray-800"
                }`}
                style={{
                  display: "block",
                  width: "fit-content",
                  maxWidth: "65%",
                  wordBreak: "break-word",
                }}
              >
                <span className="text-xs text-gray-600">{msg.sender.name}</span>
                {msg.image ? (
                  <img
                    src={`${API_URL}${msg.image}`}
                    alt="Sent"
                    height={50}
                    width={300}
                    className="max-w-xs rounded-lg"
                    onLoad={() => scrollToBottom()}
                  />
                ) : (
                  <p>{msg.text}</p>
                )}
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-gray-500 block mt-1">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                  {msg.sender._id === user._id && (
                    <span
                      className={`text-xs ${
                        msg.isRead
                          ? "text-blue-500"
                          : msg.isDelivered
                          ? "text-gray-500"
                          : "text-gray-400"
                      }`}
                    >
                      {msg.isRead ? "✓✓" : msg.isDelivered ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {selectedImage && (
            <div className="relative w-full p-4 bg-white border-t border-gray-200 shadow-md">
              <div className="flex items-center justify-center">
                <div className="relative max-w-xs bg-gray-100 rounded-lg shadow-sm overflow-hidden">
                  <img
                    src={imgPreview}
                    alt="Preview"
                    className="object-contain w-full h-64 rounded-lg"
                  />
                  <button
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors duration-200"
                    onClick={() => {
                      setSelectedImage(null);
                      setImgPreview(null);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 cursor-pointer"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 flex items-center border-t border-gray-300 bg-white">
            <div className="left-options flex">
              <label className="cursor-pointer">
                <FaPaperclip className="text-gray-500 text-2xl mr-3" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-500 text-2xl mr-3"
              >
                <FaSmile className="cursor-pointer text-yellow-500" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-20 left-100">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-grow p-2 border border-gray-300 rounded-lg outline-none"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={selectedImage !== null}
            />
            <button
              onClick={sendMessage}
              className="bg-green-500 text-white py-3 px-4 ml-2 rounded-lg"
            >
              <IoSend />
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <h1 className="text-3xl font-serif">
            Select a group to start chatting
          </h1>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
  );
};

export default GWindow;
