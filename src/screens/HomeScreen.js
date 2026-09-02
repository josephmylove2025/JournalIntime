import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function HomeScreen() {
  const { user, logout } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Bienvenue sur votre Journal !</Text>
      <Text style={styles.userText}>Connecté en tant que : {user?.email}</Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcome: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  userText: { fontSize: 16, color: '#666', marginBottom: 30 },
  logoutButton: { backgroundColor: '#E74C3C', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});