import CryptoJS from 'crypto-js';

const SECRET_KEY = 'UCCC_SECRET_KEY_JOURNAL';

export const encryptData = (data) => {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
  } catch (e) {
    console.error("Erreur chiffrement:", e);
    return null;
  }
};

export const decryptData = (ciphertext) => {
  try {
    if (!ciphertext) return null;
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedText);
  } catch (e) {
    console.error("Erreur déchiffrement:", e);
    return null;
  }
};