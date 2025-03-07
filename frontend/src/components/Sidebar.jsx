import React from "react";
import { MdMessage } from "react-icons/md";
import { TbCircleDot } from "react-icons/tb";
import { BiMessageRoundedAdd } from "react-icons/bi";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { CiSettings } from "react-icons/ci";
import { Tooltip } from "@mui/material";
import useAuth from "../hooks/useAuth";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const Sidebar = ({ setSelectedSection }) => {
  const { user, userLoading } = useAuth();

  return (
    <div className="w-16 h-full bg-gray-100 flex flex-col items-center p-2 justify-between py-4">
      <div className="flex flex-col items-center space-y-10">
        <Tooltip title="Chats" placement="right">
          <div
            onClick={() => setSelectedSection("Chats")}
            className="relative cursor-pointer"
          >
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
              <MdMessage size={24} />
            </div>
          </div>
        </Tooltip>
        <Tooltip title="Status" placement="right">
          <div
            onClick={() => setSelectedSection("Status")}
            className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer"
          >
            <TbCircleDot size={24} />
          </div>
        </Tooltip>
        <Tooltip title="Channels" placement="right">
          <div
            onClick={() => setSelectedSection("Channels")}
            className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer"
          >
            <BiMessageRoundedAdd size={24} />
          </div>
        </Tooltip>
        <Tooltip title="Groups" placement="right">
          <div
            onClick={() => setSelectedSection("Groups")}
            className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer"
          >
            <HiOutlineUserGroup size={24} />
          </div>
        </Tooltip>
      </div>
      <div className="flex flex-col items-center space-y-6">
        <Tooltip title="Settings" placement="right">
          <div
            onClick={() => setSelectedSection("Settings")}
            className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer"
          >
            <CiSettings size={24} />
          </div>
        </Tooltip>
        <Tooltip
          title={
            userLoading
              ? "Loading..."
              : user?.name
              ? `${user.name}'s Profile`
              : "Profile"
          }
          placement="right"
        >
          <div
            onClick={() => setSelectedSection("Profile")}
            className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer"
          >
            {userLoading ? (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-gray-500 text-lg">...</span>
              </div>
            ) : user && user.avatar ? (
              <img
                src={
                  user.avatar.startsWith("http")
                    ? user.avatar
                    : `${API_URL}${user.avatar}`
                }
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500 text-lg">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
            )}
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default Sidebar;
