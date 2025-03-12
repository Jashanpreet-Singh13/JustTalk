import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaPlus, FaTimes } from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const GList = ({ onSelectGroup, socket }) => {
  const { user, userLoading } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroupForModal, setSelectedGroupForModal] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDp, setNewGroupDp] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    if (userLoading || !user) return;

    fetchGroups();
    fetchUsers();


    socket.emit("registerUser", user._id);

    socket.on("newGroupMessage", ({ groupId }) => {
      fetchGroups();
    });

    socket.on("updateGroupUnreadCount", ({ groupId, userId, unreadCount }) => {
      if (userId === user._id) {
        setGroups((prev) =>
          prev.map((group) =>
            group._id === groupId ? { ...group, unreadCount } : group
          )
        );
      }
    });

    return () => {
      socket.off("newGroupMessage");
      socket.off("updateGroupUnreadCount");
    };
  }, [user, userLoading, socket]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/group`, {
        withCredentials: true,
      });
      setGroups(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/users`, {
        withCredentials: true,
      });
      setUsers(response.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName || selectedMembers.length === 0) {
      toast.error("Group name and at least one member are required");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/group/create`,
        { name: groupName, memberIds: selectedMembers },
        { withCredentials: true }
      );
      setGroups((prev) => [...prev, response.data]);
      setShowCreateModal(false);
      setGroupName("");
      setSelectedMembers([]);
      toast.success("Group created successfully");

      setSelectedGroupForModal(response.data);
      setNewGroupName(response.data.name);
      setShowGroupModal(true);
    } catch (err) {
      toast.error("Failed to create group");
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectGroup = (group) => {
    setActiveGroupId(group._id);
    onSelectGroup(group);
    socket.emit("markGroupMessagesAsRead", {
      groupId: group._id,
      userId: user._id,
    });
    setGroups((prev) =>
      prev.map((g) => (g._id === group._id ? { ...g, unreadCount: 0 } : g))
    );
  };

  const handleGroupClick = (group) => {
    setSelectedGroupForModal(group);
    setNewGroupName(group.name);
    setNewGroupDp(null);
    setShowGroupModal(true);
  };

  const handleGroupDpUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];
    if (!validImageTypes.includes(file.type)) {
      toast.error("Please upload a valid image");
      event.target.value = null;
      return;
    }

    const maxSizeInBytes = 1 * 1024 * 1024; // 1 MB
    if (file.size > maxSizeInBytes) {
      toast.error("Image size should not exceed 1MB! Please upload smaller size image!");
      event.target.value = null; 
      return;
    }

    setNewGroupDp(file);
  };

  const updateGroupDetails = async () => {
    try {
      const formData = new FormData();
      if (newGroupName !== selectedGroupForModal.name) {
        formData.append("name", newGroupName);
      }
      if (newGroupDp) {
        formData.append("avatar", newGroupDp);
      }

      if (formData.has("name") || formData.has("avatar")) {
        const res = await axios.put(
          `${API_URL}/api/group/${selectedGroupForModal._id}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          }
        );
        setGroups((prev) =>
          prev.map((g) =>
            g._id === selectedGroupForModal._id
              ? { ...g, name: res.data.name, avatar: res.data.avatar }
              : g
          )
        );
        toast.success("Group updated successfully");
      }
      setShowGroupModal(false);
      setNewGroupDp(null);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        console.error("Failed to update group", err);
        toast.error("Failed to update group");
      }
    }
  };

  const handleAddMemberClick = () => {
    const groupMembers = selectedGroupForModal.members.map((m) => m._id);
    const available = users.filter((u) => !groupMembers.includes(u._id));
    setAvailableUsers(available);
    setSelectedMembers([]);
    setShowAddMemberModal(true);
  };

  const handleAddMembersToGroup = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member to add");
      return;
    }

    try {
      const res = await axios.put(
        `${API_URL}/api/group/${selectedGroupForModal._id}/add-members`,
        { memberIds: selectedMembers },
        { withCredentials: true }
      );
      setGroups((prev) =>
        prev.map((g) =>
          g._id === selectedGroupForModal._id
            ? { ...g, members: res.data.members }
            : g
        )
      );
      setSelectedGroupForModal((prev) => ({
        ...prev,
        members: res.data.members,
      }));
      setShowAddMemberModal(false);
      toast.success("Members added successfully");
    } catch (err) {
      toast.error("Failed to add members");
    }
  };

  const handleDeleteMember = async (memberId) => {
    try {
      const res = await axios.put(
        `${API_URL}/api/group/${selectedGroupForModal._id}/remove-members`,
        { memberIds: [memberId] },
        { withCredentials: true }
      );
      setGroups((prev) =>
        prev.map((g) =>
          g._id === selectedGroupForModal._id
            ? { ...g, members: res.data.members }
            : g
        )
      );
      setSelectedGroupForModal((prev) => ({
        ...prev,
        members: res.data.members,
      }));
      toast.success("Member removed successfully");
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    try {
      await axios.delete(`${API_URL}/api/group/${selectedGroupForModal._id}`, {
        withCredentials: true,
      });
      setGroups((prev) =>
        prev.filter((g) => g._id !== selectedGroupForModal._id)
      );
      setShowGroupModal(false);
      toast.success("Group deleted successfully");
    } catch (err) {
      toast.error("Failed to delete group");
    }
  };

  return (
    <div className="w-180 max-w-180 bg-white h-full border-r border-gray-300 p-3 flex flex-col">
      <div className="flex items-center justify-between mb-3 p-3">
        <h1 className="text-xl font-bold">Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700"
        >
          New Group <FaPlus />
        </button>
      </div>

      <div className="flex items-center bg-gray-200 rounded-lg p-2 mb-3 mx-3">
        <FaSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Search groups..."
          className="bg-transparent outline-none px-2 flex-grow"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="overflow-y-auto flex-grow">
        {loading ? (
          <p className="text-center text-gray-500 mt-5">Loading groups...</p>
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <div
              key={group._id}
              onClick={() => handleSelectGroup(group)}
              className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer mx-3"
            >
              <div
                className="w-14 h-14 flex items-center justify-center relative"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGroupClick(group);
                }}
              >
                <img
                  className="rounded-full h-14 w-14 object-cover"
                  src={`${API_URL}${group.avatar}`}
                  alt=""
                />
                <span className="absolute top-8 left-10 bg-emerald-500 text-white p-1 rounded-full text-xs">
                  ✎
                </span>
              </div>
              <div className="flex flex-col flex-grow">
                <h2 className="font-semibold">{group.name}</h2>
                <p className="text-gray-500 text-sm truncate max-w-72">
                  {group.lastMessage}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-gray-400 text-xs">
                  {formatTime(group.lastMessageTime)}
                </span>
                {group.unreadCount > 0 && group._id !== activeGroupId && (
                  <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 mt-1">
                    {group.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-5">No groups found</p>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-5 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create Group</h2>
            <input
              type="text"
              placeholder="Group Name"
              className="w-full p-2 border rounded mb-4"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto">
              {users.map((u) => (
                <div key={u._id} className="flex items-center gap-2 p-2">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u._id)}
                    onChange={() => {
                      setSelectedMembers((prev) =>
                        prev.includes(u._id)
                          ? prev.filter((id) => id !== u._id)
                          : [...prev, u._id]
                      );
                    }}
                  />
                  <span>{u.name}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-emerald-600 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && selectedGroupForModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-96 p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowGroupModal(false)}
            >
              <FaTimes size={20} />
            </button>
            <h2 className="text-xl font-semibold mb-4">Group Info</h2>

            <div className="flex justify-center mb-4">
              <div className="relative">
                <img
                  src={
                    newGroupDp
                      ? URL.createObjectURL(newGroupDp)
                      : `${API_URL}${selectedGroupForModal.avatar}`
                  }
                  alt="Group DP"
                  className="w-24 h-24 rounded-full object-cover"
                  onError={(e) =>
                    (e.target.src =
                      "https://via.placeholder.com/100?text=Group")
                  }
                />
                {selectedGroupForModal.createdBy === user._id && (
                  <label className="absolute mt-1 ml-3 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGroupDpUpload}
                      className="hidden"
                    />
                    Change DP
                  </label>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Group Name
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg mt-1"
                disabled={selectedGroupForModal.createdBy !== user._id}
              />
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">Members</h3>
                {selectedGroupForModal.createdBy === user._id && (
                  <button
                    onClick={handleAddMemberClick}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold"
                  >
                    Add Member
                  </button>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 mt-1">
                {selectedGroupForModal.members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between gap-2 py-1"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={`${API_URL}${member.avatar}`}
                        alt={member.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span>{member.name}</span>
                      {member._id === selectedGroupForModal.createdBy && (
                        <span className="bg-blue-500 text-white text-xs rounded px-1 py-0.5">
                          Admin
                        </span>
                      )}
                    </div>
                    {selectedGroupForModal.createdBy === user._id &&
                      member._id !== user._id && (
                        <button
                          onClick={() => handleDeleteMember(member._id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>

            {selectedGroupForModal.createdBy === user._id && (
              <div className="flex justify-between">
                <button
                  onClick={handleDeleteGroup}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Delete Group
                </button>
                <button
                  onClick={updateGroupDetails}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add Members</h2>
            <div className="max-h-40 overflow-y-auto">
              {availableUsers.map((u) => (
                <div key={u._id} className="flex items-center gap-2 p-2">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u._id)}
                    onChange={() => {
                      setSelectedMembers((prev) =>
                        prev.includes(u._id)
                          ? prev.filter((id) => id !== u._id)
                          : [...prev, u._id]
                      );
                    }}
                  />
                  <span>{u.name}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembersToGroup}
                className="px-4 py-2 bg-emerald-600 text-white rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
  );
};

export default GList;
