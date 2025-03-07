import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch } from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LogOut } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const ChatList = ({ onSelectChat, socket }) => {
  const navigate = useNavigate();
  const {user, setUser, userLoading}  = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);


  useEffect(() => {
    if(userLoading || !user) return;

    fetchUsers();
    fetchOnlineUsers();


    socket.emit("registerUser", user._id);

    const handleBeforeUnload = () => {
      socket.disconnect();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    socket.on("newMessage", () => {
      fetchUsers();
    });

    socket.on("updateUserStatus", (onlineUsersList) => {
      setOnlineUsers(onlineUsersList);
    });

    socket.on("updateUnreadCount", ({ sender, receiver }) => {
      if (receiver === user._id) {
        setTimeout(() => {
          fetchUsers();
        }, 500);
      }
    });

    

    return () => {
      socket.off("newMessage");
      socket.off("updateUserStatus");
      socket.off("updateUnreadCount");
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, socket]);


  useEffect(() => {
    const handleNewMessageForActiveChat = (messageData) => {
      if (
        messageData.receiver === user._id &&
        messageData.sender === activeChatId
      ) {
        socket.emit("markMessagesAsRead", {
          sender: messageData.sender,
          receiver: user._id,
        });
      }
    };

    socket.on("newMessage", handleNewMessageForActiveChat);

    return () => {
      socket.off("newMessage", handleNewMessageForActiveChat);
    };
  }, [activeChatId, user, socket]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/users`, {
        withCredentials: true,
      });
      setUsers(response.data);
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/online-users`
      );
      setOnlineUsers(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const isOnline = onlineUsers.includes(u._id);
    return showOnlineOnly ? matchesSearch && isOnline : matchesSearch;
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleLogout = async () => {
    try {
      socket.emit("stopTyping", { sender: user._id, receiver: activeChatId });
      socket.disconnect();

      const response = await axios.get(`${API_URL}/api/auth/logout`, {
        withCredentials: true,
      });

      if (response.data.message === "Logged out") {
        toast.success("Logout Successful");
        setUser(null);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Logout failed:", err);
      toast.error("Logout failed");
    }
  };

  const handleSelectChat = (chatUser) => {
    setActiveChatId(chatUser._id); 
    onSelectChat(chatUser);

    socket.emit("markMessagesAsRead", {
      sender: chatUser._id,
      receiver: user._id,
    });

    setTimeout(() => {
      fetchUsers();
    }, 1000);
    
  };

  return (
    <div className="w-180 max-w-180 bg-white h-full border-r border-gray-300 p-3 flex flex-col">
      <div className="chat-upper flex items-center justify-between gap-3.5">
        <h1 className="text-xl font-bold pb-3 border-b border-gray-300 flex items-center gap-2.5">
          <img
            className="w-14 h-14 bg-none rounded-full"
            src={`https://justtalk-frontend.onrender.com/emerald2.png`}
            alt=""
          />
          <p className="text-3xl">JustTalk</p>
        </h1>
        <div className="options-div flex items-center justify-between text-xl gap-5.5 mb-2.5">
          <BsThreeDotsVertical
            className="cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          />
        </div>
      </div>
      {isOpen && (
        <div className="absolute left-110 top-20 mt-2 w-40 bg-white shadow-md rounded-md border z-10">
          <ul className="py-2 text-md">
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b">
              JustTalk
            </li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b">
              @JashanpreetSingh
            </li>
            <li
              className="px-4 py-2 flex gap-1.5 text-red-500 hover:bg-gray-100 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="text-md" /> Logout
            </li>
          </ul>
        </div>
      )}
      <div className="flex items-center bg-gray-200 rounded-lg p-2 my-3">
        <FaSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Search users..."
          className="bg-transparent outline-none px-2 flex-grow"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center my-3">
        <label className="flex items-center cursor-pointer space-x-3">
          <div className="relative">
            <input
              type="checkbox"
              className="hidden"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
            />
            <div
              className={`w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${
                showOnlineOnly ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                  showOnlineOnly ? "translate-x-5" : "translate-x-0"
                }`}
              ></div>
            </div>
          </div>
          <span className="text-sm font-medium text-gray-700">
            Show online users only
          </span>
        </label>
      </div>

      <div className="overflow-y-auto flex-grow mt-2">
        {loading ? (
          <p className="text-center text-gray-500 mt-5">Loading users...</p>
        ) : error ? (
          <p className="text-center text-red-500 mt-5">{error}</p>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((chatUser) => (
            <div
              key={chatUser._id}
              onClick={() => handleSelectChat(chatUser)}
              className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <div className="relative w-14 h-14">
                <img
                  src={
                    chatUser.avatar &&
                    chatUser.avatar !== "/public/images/u3.png"
                      ? chatUser.avatar.startsWith("http")
                        ? chatUser.avatar
                        : `${API_URL}${chatUser.avatar}`
                      : "/images/u3.png"
                  }
                  alt="User"
                  className="object-cover w-14 h-14 rounded-full"
                />
                <span
                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                    onlineUsers.includes(chatUser._id)
                      ? "bg-green-500"
                      : "bg-gray-500"
                  }`}
                ></span>
              </div>

              <div className="flex flex-col flex-grow">
                <h2 className="font-semibold">{chatUser.name}</h2>
                <p className="text-gray-500 text-sm truncate overflow-hidden max-w-72">
                  {chatUser.lastMessage || "No messages yet"}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-gray-400 text-xs">
                  {formatTime(chatUser.lastMessageTime)}
                </span>
                {chatUser._id !== activeChatId && chatUser.unreadCount > 0 && (
                  <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 mt-1">
                    {chatUser.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-5">No users found</p>
        )}
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default ChatList;
