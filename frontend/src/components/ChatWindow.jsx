import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaSmile, FaPaperclip } from "react-icons/fa";
import { PiChatCircleDotsBold } from "react-icons/pi";
import EmojiPicker from "emoji-picker-react";
import { IoSend } from "react-icons/io5";
import {toast, Toaster} from "react-hot-toast";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Online";
  const date = new Date(lastSeen);

  const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(
    date.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;

  const formattedTime = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `Last seen at ${formattedDate} at ${formattedTime}`;
};

const ChatWindow = ({ selectedChat, user, socket }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [lastSeen, setLastSeen] = useState(null);
  const [isTyping, setIsTyping] = useState(false); 
  const typingTimeoutRef = useRef(null); 

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prevMessage) => prevMessage + emojiData.emoji);
  };

  const handleImageUpload = async (event) => {
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
      event.target.value = null; // Reset the input
      setSelectedImage(null);
      setImgPreview(null);
      return;
    }

    setSelectedImage(file);
    setImgPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    if (!selectedChat || !user) return;

    setMessages([]);

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/chat/${user._id}/${selectedChat._id}`,
          {
            withCredentials: true,
          }
        );
        setMessages(res.data.msgs || []);
        setLastSeen(res.data.lastSeen);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    fetchMessages();
  }, [selectedChat, user]);

  useEffect(() => {
    if (!selectedChat) return;

    const handleLastSeenUpdate = ({ userId, lastSeen: updatedLastSeen }) => {
      if (userId === selectedChat._id) {
        setLastSeen(updatedLastSeen);
      }
    };

    const handleUserTyping = ({ sender }) => {
      if (sender === selectedChat._id) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = ({ sender }) => {
      if (sender === selectedChat._id) {
        setIsTyping(false);
      }
    };

    socket.on("updateLastSeen", handleLastSeenUpdate);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    return () => {
      socket.off("updateLastSeen", handleLastSeenUpdate);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
    };
  }, [selectedChat, socket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 1000);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (!selectedChat || !user) return;

    const handleReceiveMessage = (message) => {
      if (
        (message.sender === selectedChat._id &&
          message.receiver === user._id) ||
        (message.sender === user._id && message.receiver === selectedChat._id)
      ) {
        setMessages((prev) => {
          if (!prev.some((msg) => msg._id === message._id)) {
            return [...prev, message];
          }
          return prev;
        });
        setIsTyping(false);

        if (
          message.sender === selectedChat._id &&
          message.receiver === user._id
        ) {
          socket.emit("markMessagesAsRead", {
            sender: selectedChat._id,
            receiver: user._id,
          });
        }
      }
    };

    const handleMessageStatusUpdate = ({ messageId, isDelivered, isRead }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, isDelivered, isRead } : msg
        )
      );
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("updateMessageStatus", handleMessageStatusUpdate);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("updateMessageStatus", handleMessageStatusUpdate);
    };
  }, [selectedChat, user]);

  useEffect(() => {
    if (!selectedChat || !user) return;

    const handleReadStatusUpdate = ({ sender, receiver }) => {
      if (sender === user._id && receiver === selectedChat._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender === user._id &&
            msg.receiver === selectedChat._id &&
            !msg.isRead
              ? { ...msg, isRead: true }
              : msg
          )
        );
      }
    };

    socket.on("updateUnreadCount", handleReadStatusUpdate);
    return () => {
      socket.off("updateUnreadCount", handleReadStatusUpdate);
    };
  }, [selectedChat, user]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!selectedChat || selectedImage) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit("typing", { sender: user._id, receiver: selectedChat._id });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        sender: user._id,
        receiver: selectedChat._id,
      });
    }, 1000); // Stop typing after 1 second of inactivity
  };

  const sendMessage = async () => {
    if (!selectedChat || (!newMessage.trim() && !selectedImage)) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit("stopTyping", {
        sender: user._id,
        receiver: selectedChat._id,
      });
    }

    let imageUrl = "";

    if (selectedImage) {
      const formData = new FormData();
      formData.append("image", selectedImage);
      console.log(selectedImage);

      try {
        const res = await axios.post(`${API_URL}/api/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.imageUrl) {
          imageUrl = res.data.imageUrl;
        }
      } catch (err) {
        console.error("Image upload failed", err);
        return;
      }
    }

    const messageData = {
      sender: user._id,
      receiver: selectedChat._id,
      text: imageUrl ? "" : newMessage,
      image: imageUrl || "",
      messageId: new Date().getTime().toString(),
    };

    socket.emit("sendMessage", messageData);

    setSelectedImage(null);
    setImgPreview(null);
    setNewMessage("");
    scrollToBottom();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#e7ddd2]">
      {selectedChat ? (
        <>
          <div className="bg-gray-100 px-4 py-3 gap-3.5 flex items-center justify-between border-b border-gray-300">
            <div className="flex items-center gap-2.5">
              <img
                src={
                  selectedChat.avatar &&
                  selectedChat.avatar !== "/public/images/u3.png"
                    ? selectedChat.avatar.startsWith("http")
                      ? selectedChat.avatar
                      : `${API_URL}${selectedChat.avatar}`
                    : "/public/images/u3.png"
                }
                alt="User"
                className="object-cover w-14 h-14 rounded-full"
              />
              <div className="w-60">
                <h2 className="text-lg font-semibold">{selectedChat?.name}</h2>
                {isTyping && (
                  <div className="px-4 py-1 text-sm text-red-600 italic">
                    {selectedChat.name} typing...
                  </div>
                )}
              </div>
            </div>

            <span className="text-md text-gray-800 italic mr-3">
              {formatLastSeen(lastSeen)}
            </span>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`px-3 py-1 rounded-lg ${
                  msg.sender === user._id
                    ? "bg-emerald-300 text-gray-800 ml-auto"
                    : "bg-white text-gray-800"
                }`}
                style={{
                  display: "block",
                  width: "fit-content",
                  maxWidth: "65%",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              >
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
                  {msg.sender === user._id && (
                    <span
                      className={`text-xs ${
                        msg.isRead
                          ? "text-blue-700"
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
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <div>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-gray-500 text-2xl mr-3"
                >
                  <FaSmile className="cursor-pointer text-yellow-500 rounded-full" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-20 left-100">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}
              </div>
            </div>

            <input
              type="text"
              placeholder="Type a message..."
              className="flex-grow p-2 border border-gray-300 rounded-lg outline-none"
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={selectedImage !== null}
            />
            <button
              onClick={() => sendMessage()}
              className="bg-green-500 text-white py-3 px-4 ml-2 rounded-lg"
            >
              <IoSend />
            </button>
          </div>
        </>
      ) : (
        <div className="gap-3.5 flex flex-col items-center justify-center mt-[-50px] h-full text-gray-500">
          <PiChatCircleDotsBold className="text-emerald-500 text-9xl" />
          <h1 className="text-black text-6xl font-serif">
            JustTalk - Web Chat App
          </h1>
          <p className="text-3xl">Made by Jashanpreet Singh</p>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
  );
};

export default ChatWindow;
