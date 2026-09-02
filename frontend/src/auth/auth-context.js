import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import * as api from "../api";

const AuthContext = createContext(null);

export function decodeToken(token) {
  if (!token) {
    return null;
  }
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function userFromToken(token) {
  const claims = decodeToken(token);
  return claims && claims.sub ? { id: claims.sub } : null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => api.getToken());
  const [user, setUser] = useState(() => userFromToken(api.getToken()));

  const applyToken = useCallback((newToken) => {
    api.setToken(newToken);
    setToken(newToken);
    setUser(userFromToken(newToken));
  }, []);

  const login = useCallback(
    async (email, password) => {
      const result = await api.login(email, password);
      applyToken(result.access_token);
      return result;
    },
    [applyToken],
  );

  const register = useCallback(
    async (email, password) => {
      const result = await api.register(email, password);
      applyToken(result.access_token);
      return result;
    },
    [applyToken],
  );

  const logout = useCallback(() => {
    applyToken(null);
  }, [applyToken]);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    applyToken(null);
  }, [applyToken]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      deleteAccount,
    }),
    [user, token, login, register, logout, deleteAccount],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
