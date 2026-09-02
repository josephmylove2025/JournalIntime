import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface JournalEntry {
  id: string;
  title: string;
  text: string;
  moodEmoji: string;
  moodLabel: string;
  date: string;
}

interface UserAccount {
  email: string;
  password?: string;
}

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'login' | 'register' | 'home'>('welcome');
  
  // Auth Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Manage accounts modal
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);

  // Journal states
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Emoji ak Tèks li reprezante
  const moodsList = [
    { emoji: '😊', label: 'Heureux' },
    { emoji: '😐', label: 'Neutre' },
    { emoji: '🥺', label: 'Triste' },
    { emoji: '😡', label: 'En colère' },
    { emoji: '🚀', label: 'Motivé' },
  ];
  
  const [selectedMood, setSelectedMood] = useState(moodsList[0]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      setCurrentUserEmail(userObj.email);
      setScreen('home');
      loadEntriesForUser(userObj.email);
    }
  };

  // --- JESTYON KONT (MULTI-USERS) ---
  const getUsersList = async (): Promise<UserAccount[]> => {
    const usersStr = await AsyncStorage.getItem('usersList');
    return usersStr ? JSON.parse(usersStr) : [];
  };

  const handleRegister = async () => {
    const emailRegex = /\S+@\S+\.\S+/;
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    const existingUsers = await getUsersList();
    const userExists = existingUsers.some(u => u.email === cleanEmail);

    if (userExists) {
      Alert.alert('Erreur', 'Un compte avec cet email existe déjà.');
      return;
    }

    const newUser = { email: cleanEmail, password };
    const updatedUsers = [...existingUsers, newUser];
    
    await AsyncStorage.setItem('usersList', JSON.stringify(updatedUsers));
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    
    setCurrentUserEmail(cleanEmail);
    setScreen('home');
    loadEntriesForUser(cleanEmail);
    
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    Alert.alert('Succès 🎉', 'Compte créé avec succès !');
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const existingUsers = await getUsersList();
    
    const foundUser = existingUsers.find(
      u => u.email === cleanEmail && u.password === password
    );

    if (foundUser) {
      await AsyncStorage.setItem('user', JSON.stringify(foundUser));
      setCurrentUserEmail(cleanEmail);
      setScreen('home');
      loadEntriesForUser(cleanEmail);
      
      setEmail('');
      setPassword('');
    } else {
      Alert.alert('Erreur ❌', 'Email ou mot de passe incorrect.');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    setCurrentUserEmail('');
    setEntries([]);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setScreen('welcome');
  };

  // --- SUPPRIMER DES COMPTES ---
  const openAccountManager = async () => {
    const users = await getUsersList();
    setAllUsers(users);
    setIsAccountModalVisible(true);
  };

  const handleDeleteAccount = (userToDelete: string) => {
    Alert.alert(
      'Supprimer le compte ⚠️',
      `Voulez-vous supprimer le compte "${userToDelete}" ainsi que toutes ses données ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const existingUsers = await getUsersList();
            const filteredUsers = existingUsers.filter(u => u.email !== userToDelete);
            await AsyncStorage.setItem('usersList', JSON.stringify(filteredUsers));

            await AsyncStorage.removeItem(`journal_entries_${userToDelete}`);

            if (currentUserEmail === userToDelete) {
              await AsyncStorage.removeItem('user');
              setCurrentUserEmail('');
              setScreen('welcome');
            }

            setAllUsers(filteredUsers);
            Alert.alert('Succès', 'Le compte a été supprimé.');
          }
        }
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Réinitialisation complète ⚠️',
      'Êtes-vous sûr de vouloir tout supprimer (tous les comptes et toutes les entrées) ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout Effacer',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setAllUsers([]);
            setEntries([]);
            setCurrentUserEmail('');
            setIsAccountModalVisible(false);
            setScreen('welcome');
            Alert.alert('Succès', 'Toutes les données ont été réinitialisées.');
          }
        }
      ]
    );
  };

  // --- JOURNAL CRUD ---
  const loadEntriesForUser = async (userEmail: string) => {
    if (!userEmail) return;
    const data = await AsyncStorage.getItem(`journal_entries_${userEmail}`);
    if (data) {
      setEntries(JSON.parse(data));
    } else {
      setEntries([]);
    }
  };

  const handleAddEntry = async () => {
    if (!title.trim() || !text.trim()) {
      Alert.alert('Erreur ⚠️', 'Veuillez remplir le titre et le contenu.');
      return;
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      title,
      text,
      moodEmoji: selectedMood.emoji,
      moodLabel: selectedMood.label,
      date: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    await AsyncStorage.setItem(`journal_entries_${currentUserEmail}`, JSON.stringify(updatedEntries));

    setTitle('');
    setText('');
    Alert.alert('Succès 📝', 'Entrée enregistrée !');
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert('Confirmation 🗑️', 'Voulez-vous vraiment supprimer cette entrée ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const updatedEntries = entries.filter((item) => item.id !== id);
          setEntries(updatedEntries);
          await AsyncStorage.setItem(`journal_entries_${currentUserEmail}`, JSON.stringify(updatedEntries));
        },
      },
    ]);
  };

  const filteredEntries = entries.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.title.toLowerCase().includes(query) ||
      item.text.toLowerCase().includes(query) ||
      item.moodLabel.toLowerCase().includes(query) ||
      item.date.toLowerCase().includes(query)
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      
      {/* 1. WELCOME SCREEN */}
      {screen === 'welcome' && (
        <View style={styles.centerContainer}>
          <Text style={styles.logoText}>📖</Text>
          <Text style={styles.welcomeTitle}>Mon Journal Intime</Text>
          <Text style={styles.welcomeSubtitle}>Espace numérique sécurisé 🔐</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen('login')}>
            <Text style={styles.buttonText}>Se Connecter 🔑</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('register')}>
            <Text style={styles.secondaryButtonText}>S'inscrire ✍️</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.linkButton, { marginTop: 35 }]} onPress={openAccountManager}>
            <Text style={{ color: '#E74C3C', fontWeight: 'bold', fontSize: 15 }}>⚙️ Gérer / Supprimer des comptes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. LOGIN SCREEN */}
      {screen === 'login' && (
        <View style={styles.container}>
          <Text style={styles.screenTitle}>Connexion 🔑</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.buttonText}>Se Connecter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setScreen('register')} style={styles.linkButton}>
            <Text style={styles.linkText}>Pas encore de compte ? S'inscrire</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setScreen('welcome')} style={styles.linkButton}>
            <Text style={[styles.linkText, { color: '#888', marginTop: 15 }]}>← Retour</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.linkButton, { marginTop: 25 }]} onPress={openAccountManager}>
            <Text style={{ color: '#E74C3C', fontWeight: 'bold' }}>⚙️ Gérer les comptes existants</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. REGISTER SCREEN */}
      {screen === 'register' && (
        <View style={styles.container}>
          <Text style={styles.screenTitle}>Inscription ✍️</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe (min. 6 car.)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
            <Text style={styles.buttonText}>Créer mon compte</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setScreen('login')} style={styles.linkButton}>
            <Text style={styles.linkText}>Déjà un compte ? Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScreen('welcome')} style={styles.linkButton}>
            <Text style={[styles.linkText, { color: '#888', marginTop: 15 }]}>← Retour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. HOME SCREEN */}
      {screen === 'home' && (
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Mon Journal 📖</Text>
              <Text style={styles.userBadge}>👤 {currentUserEmail}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Déconnexion </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Titre de l'entrée..."
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.moodSection}>
              <View style={styles.moodHeaderRow}>
                <Text style={styles.moodLabel}>Humeur :</Text>
                <Text style={styles.selectedMoodText}>
                  {selectedMood.emoji} ({selectedMood.label})
                </Text>
              </View>
              
              <View style={styles.moodContainer}>
                {moodsList.map((m) => (
                  <TouchableOpacity
                    key={m.label}
                    style={[
                      styles.moodOption,
                      selectedMood.label === m.label && styles.selectedMood
                    ]}
                    onPress={() => setSelectedMood(m)}
                  >
                    <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Racontez votre journée..."
              value={text}
              onChangeText={setText}
              multiline
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleAddEntry}>
              <Text style={styles.buttonText}>Enregistrer l'entrée</Text>
            </TouchableOpacity>
          </ScrollView>

          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Rechercher une entrée..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <Text style={styles.sectionTitle}>Mes Entrées ({filteredEntries.length})</Text>

          <FlatList
            data={filteredEntries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {item.moodEmoji} [{item.moodLabel}] {item.title}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteEntry(item.id)}>
                    <Text style={styles.deleteText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardDate}>🕒 {item.date}</Text>
                <Text style={styles.cardText}>{item.text}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>📝 Aucune entrée trouvée.</Text>
            }
          />
        </View>
      )}

      {/* MODAL GLOBAL POU JERE AK EFASYEK KONT YO */}
      <Modal visible={isAccountModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestion des comptes ⚙️</Text>

            {allUsers.length === 0 ? (
              <Text style={styles.emptyText}>Aucun compte enregistré.</Text>
            ) : (
              <FlatList
                data={allUsers}
                keyExtractor={(item) => item.email}
                style={{ maxHeight: 200 }}
                renderItem={({ item }) => (
                  <View style={styles.accountItem}>
                    <Text style={styles.accountEmail} numberOfLines={1}>👤 {item.email}</Text>
                    <TouchableOpacity
                      style={styles.deleteAccountBtn}
                      onPress={() => handleDeleteAccount(item.email)}
                    >
                      <Text style={styles.deleteAccountBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            {allUsers.length > 0 && (
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleClearAllData}
              >
                <Text style={styles.dangerButtonText}>⚠️ Tout réinitialiser (Effacer tout)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 15 }]}
              onPress={() => setIsAccountModalVisible(false)}
            >
              <Text style={styles.buttonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  logoText: { fontSize: 70, marginBottom: 10 },
  welcomeTitle: { fontSize: 26, fontWeight: 'bold', color: '#2C3E50', marginBottom: 5 },
  welcomeSubtitle: { fontSize: 16, color: '#7F8C8D', marginBottom: 40 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#2C3E50', textAlign: 'center' },
  input: { backgroundColor: '#FFF', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: '#CBD5E0' },
  textArea: { height: 100, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#6C5CE7', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10, width: '100%' },
  secondaryButton: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#6C5CE7', width: '100%' },
  dangerButton: { backgroundColor: '#FF7675', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  dangerButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  secondaryButtonText: { color: '#6C5CE7', fontWeight: 'bold', fontSize: 16 },
  linkButton: { alignItems: 'center', marginTop: 10 },
  linkText: { color: '#6C5CE7', fontSize: 14, fontWeight: '500' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#2C3E50' },
  userBadge: { fontSize: 12, color: '#6C5CE7', fontWeight: '600', marginTop: 2 },
  logoutButton: { backgroundColor: '#FF7675', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  formContainer: { maxHeight: 340, marginBottom: 10 },
  moodSection: { marginBottom: 15 },
  moodHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  moodLabel: { fontSize: 16, color: '#2C3E50', fontWeight: 'bold' },
  selectedMoodText: { fontSize: 16, color: '#6C5CE7', fontWeight: 'bold', marginLeft: 8 },
  moodContainer: { flexDirection: 'row', alignItems: 'center' },
  moodOption: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10, backgroundColor: '#FFF' },
  selectedMood: { backgroundColor: '#E0DFFF', borderColor: '#6C5CE7', borderWidth: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2C3E50' },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', flex: 1 },
  cardDate: { fontSize: 12, color: '#A0AEC0', marginVertical: 4 },
  cardText: { fontSize: 14, color: '#4A5568' },
  deleteText: { fontSize: 16, marginLeft: 10 },
  emptyText: { textAlign: 'center', color: '#A0AEC0', marginVertical: 15 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15, textAlign: 'center' },
  accountItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  accountEmail: { fontSize: 14, color: '#2D3748', flex: 1, marginRight: 10 },
  deleteAccountBtn: { backgroundColor: '#E74C3C', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  deleteAccountBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});