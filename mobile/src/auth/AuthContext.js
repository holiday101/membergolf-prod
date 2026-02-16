import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";
import { course } from "../config/course";

const TOKEN_KEY = "auth.token";
const USER_KEY = "auth.user";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const storeAuth = useCallback(async (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const clearAuth = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await storeAuth(data.token, data.user);
    return data.user;
  }, [storeAuth]);

  const register = useCallback(
    async ({ email, password, firstName, lastName }) => {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          course_id: course.courseId,
        },
      });
      await storeAuth(data.token, data.user);
      return data.user;
    },
    [storeAuth]
  );

  const acceptInvite = useCallback(
    async ({ token: inviteToken, password, firstName, lastName }) => {
      const data = await apiRequest("/auth/invite/accept", {
        method: "POST",
        body: {
          token: inviteToken,
          password,
          first_name: firstName,
          last_name: lastName,
        },
      });
      await storeAuth(data.token, data.user);
      return data.user;
    },
    [storeAuth]
  );

  const logout = useCallback(async () => {
    await clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    const load = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedToken) {
          setToken(storedToken);
          if (storedUser) setUser(JSON.parse(storedUser));

          try {
            const me = await apiRequest("/me", { token: storedToken });
            if (me?.user) setUser(me.user);
          } catch {
            await clearAuth();
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clearAuth]);

  const value = useMemo(
    () => ({ token, user, loading, login, register, acceptInvite, logout }),
    [token, user, loading, login, register, acceptInvite, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
