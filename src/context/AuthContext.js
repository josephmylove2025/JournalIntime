import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptData, decryptData } from '../utils/crypto';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserLoggedIn();
  }, []);

  const checkUserLoggedIn = async () => {
    try {
      const encryptedSession = await AsyncStorage.getItem('userSession');
      if (encryptedSession) {
        const userData = decryptData(encryptedSession);
        setUser(userData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    try {
      const encryptedUsers = await AsyncStorage.getItem('users');
      const users = encryptedUsers ? decryptData(encryptedUsers) : [];

      const userExists = users.find((u) => u.email === email);
      if (userExists) {
        return { success: false, message: 'Cet email est déjà utilisé.' };
      }

      const newUser = { email, password };
      users.push(newUser);

      await AsyncStorage.setItem('users', encryptData(users));
      await AsyncStorage.setItem('userSession', encryptData({ email }));
      setUser({ email });
      return { success: true };
    } catch (e) {
      return { success: false, message: "Erreur lors de l'inscription." };
    }
  };

  const login = async (email, password) => {
    try {
      const encryptedUsers = await AsyncStorage.getItem('users');
      const users = encryptedUsers ? decryptData(encryptedUsers) : [];

      const validUser = users.find(
        (u) => u.email === email && u.password === password
      );

      if (validUser) {
        await AsyncStorage.setItem('userSession', encryptData({ email }));
        setUser({ email });
        return { success: true };
      } else {
        return { success: false, message: 'Email ou mot de passe incorrect.' };
      }
    } catch (e) {
      return { success: false, message: 'Erreur lors de la connexion.' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userSession');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};