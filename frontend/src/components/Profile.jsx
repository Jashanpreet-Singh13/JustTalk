import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function Profile({ user, setUser }) {
  const [avatar, setAvatar] = useState(
    user.avatar ? `${API_URL}${user.avatar}` : ""
  );
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    setAvatar(
      user.avatar
        ? `${API_URL}${user.avatar}?t=${Date.now()}`
        : "/images/u3.png"
    );
  }, [user.avatar]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
      ];

      if (!validImageTypes.includes(file.type)) {
        toast.error("Select image only");
        e.target.value = null;
        setPreview(null);
        setSelectedFile(null);
        return;
      }

      const maxSizeInBytes = 1 * 1024 * 1024; // 1 MB
      if (file.size > maxSizeInBytes) {
        toast.error(
          "Image size should not exceed 1MB! Please upload smaller size image!"
        );
        e.target.value = null;
        return;
      }

      setPreview(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("avatar", selectedFile);
    formData.append("userId", user._id);

    try {
      const res = await fetch(`${API_URL}/api/auth/upload-avatar`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const newAvatarUrl = `${API_URL}${
          data.avatar
        }?t=${Date.now()}`;
        await fetch(`${API_URL}/api/auth/update-avatar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user._id, avatar: data.avatar }),
        });

        setAvatar(newAvatarUrl);
        setPreview(null);
        setSelectedFile(null);
        toast.success("Profile Pic uploaded successfully!");

        setUser((prevUser) => ({
          ...prevUser,
          avatar: data.avatar,
        }));
      } else {
        toast.error("Upload failed");
      }
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast.error("Upload Failed");
    }
  };

  return (
    <div className="h-full w-180 p-5 bg-white border border-gray-400 flex flex-col items-center space-y-6">
      <h1 className="text-3xl font-semibold text-black-700">Profile</h1>
      <div className="bg-gray-50 py-8 px-6 w-full max-w-sm rounded-xl shadow-md flex flex-col items-center space-y-4">
        <div className="w-32 h-32 rounded-full overflow-hidden shadow-md">
          <img
            src={preview || avatar}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
        <p className="text-sm text-gray-600">{user.email}</p>
        <input
          type="file"
          id="avatarUpload"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <label
          htmlFor="avatarUpload"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg cursor-pointer hover:bg-emerald-700 transition"
        >
          Select Image
        </label>
        <button
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg flex items-center space-x-2 hover:bg-emerald-800 transition"
          onClick={handleUpload}
          disabled={!selectedFile}
        >
          <Upload className="w-5 h-5" />
          <span>Upload Image</span>
        </button>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
