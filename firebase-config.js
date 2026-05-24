export const firebaseConfig = {
  apiKey: "AIzaSyDo4gOCN6kdgR5K4r0eOsLkkulwsvMp3kk",
  authDomain: "ranklei.firebaseapp.com",
  projectId: "ranklei",
  storageBucket: "ranklei.firebasestorage.app",
  messagingSenderId: "633917265043",
  appId: "1:633917265043:web:61c81cb04cd2cce24ca966",
  measurementId: "G-0XD6M307QC"
};

export const adminEmails = ["gui.rib.pi@gmail.com"];

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);
