import { useState, useEffect } from "react";
import axios from "axios";

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/me", {
          withCredentials: true,
        });
        setUser(res.data.user); 
      } catch (error) {
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, setUser, userLoading };
};

export default useAuth;
