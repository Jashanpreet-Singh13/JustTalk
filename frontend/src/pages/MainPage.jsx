import React from "react";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";

import Status from "../components/Status";
import Channels from "../components/Channels";
import Settings from "../components/Settings";
import Profile from "../components/Profile";

import GList from "../components/GList";
import GWindow from "../components/GWindow";

import useAuth from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";

import { BsChatSquareDots } from "react-icons/bs";

const App = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); 
  const [selectedSection, setSelectedSection] = useState("Chats");

  const { user, setUser } = useAuth();
  const socket = useSocket(user?._id);

  const renderSection = () => {
    switch (selectedSection) {
      case "Chats":
        return (
          <ChatList
            onSelectChat={(chat) => {
              setSelectedChat(chat);
              setSelectedGroup(null);
            }}
            socket={socket}
          />
        );
      case "Status":
        return <Status />;
      case "Channels":
        return <Channels />;
      case "Groups":
        return (
          <GList
            onSelectGroup={(group) => {
              setSelectedGroup(group);
              setSelectedChat(null);
            }}
            socket={socket}
          />
        );
      case "Settings":
        return <Settings user={user} />;
      case "Profile":
        return <Profile user={user} setUser={setUser} />;
    }
  };

  const renderChatWindow = () => {
    if (selectedChat) {
      return (
        <ChatWindow selectedChat={selectedChat} user={user} socket={socket} />
      );
    } else if (selectedGroup) {
      return (
        <GWindow selectedGroup={selectedGroup} user={user} socket={socket} />
      );
    } else {
      return (
        <div className="flex flex-col gap-3.5 items-center justify-center h-full w-full bg-[#e7ddd2] text-gray-500">
          <div>
            <BsChatSquareDots className="text-8xl"/>
          </div>
          <h1 className="text-5xl text-black ">JustTalk @ Jashanpreet Singh</h1>
          <h1 className="text-3xl font-serif">
            Select a chat or group to start messaging
          </h1>
        </div>
      );
    }
  }

  return (
    <div
      className="flex flex-row h-[95vh] w-[97%]"
      style={{ backgroundColor: "rgb(34, 199, 149)", margin: "20px" }}
    >
      <Sidebar setSelectedSection={setSelectedSection} />
      {renderSection()}
      {renderChatWindow()}
    </div>
  );
};

export default App;
