import { adminEmails, firebaseConfig, isFirebaseConfigured } from "../../firebase-config.js";
import { uid } from "../utils/format.js";

const SDK_VERSION = "12.7.0";
const LOCAL_AUTH_KEY = "ranklei.v3.localUser";

let authApi = null;
let storeApi = null;
let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let firebaseReady = false;
let authListeners = [];

export async function initAuth() {
  if (!isFirebaseConfigured || firebaseReady) return { firebaseReady };

  try {
    const [appModule, firebaseAuth, firestore] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
    ]);

    authApi = firebaseAuth;
    storeApi = firestore;
    app = appModule.initializeApp(firebaseConfig);
    auth = firebaseAuth.getAuth(app);
    db = firestore.getFirestore(app);
    googleProvider = new firebaseAuth.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    firebaseReady = true;

    firebaseAuth.onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        localStorage.removeItem(LOCAL_AUTH_KEY);
        notifyAuthChange(serializeFirebaseUser(firebaseUser));
      } else {
        notifyAuthChange(getLocalUser());
      }
    });
  } catch (error) {
    console.warn("Firebase indisponivel, usando auth local.", error);
    firebaseReady = false;
  }

  return { firebaseReady };
}

export function onAuthChange(listener) {
  authListeners.push(listener);
  listener(getCurrentUser());
  return () => {
    authListeners = authListeners.filter((item) => item !== listener);
  };
}

export function getCurrentUser() {
  if (auth?.currentUser) return serializeFirebaseUser(auth.currentUser);
  return getLocalUser();
}

export async function signInWithGoogle() {
  if (!firebaseReady || !authApi || !auth) {
    return signInAsDemo();
  }
  const result = await authApi.signInWithPopup(auth, googleProvider);
  return serializeFirebaseUser(result.user);
}

export async function signInWithEmail(email, password) {
  if (!firebaseReady || !authApi || !auth) {
    return signInLocal(email);
  }
  const result = await authApi.signInWithEmailAndPassword(auth, email, password);
  return serializeFirebaseUser(result.user);
}

export async function signInAdminWithEmail(email, password) {
  if (!firebaseReady || !authApi || !auth) {
    throw new Error("Firebase Auth indisponivel.");
  }
  const result = await authApi.signInWithEmailAndPassword(auth, email, password);
  return serializeFirebaseUser(result.user);
}

export async function registerWithEmail({ name, email, password }) {
  if (!firebaseReady || !authApi || !auth) {
    return signInLocal(email, name);
  }
  const result = await authApi.createUserWithEmailAndPassword(auth, email, password);
  if (name) await authApi.updateProfile(result.user, { displayName: name });
  return serializeFirebaseUser(result.user, name);
}

export async function signInAsDemo() {
  return signInLocal("demo@ranklei.local", "Aluno Demo");
}

export async function logout() {
  localStorage.removeItem(LOCAL_AUTH_KEY);
  if (firebaseReady && authApi && auth) await authApi.signOut(auth);
  notifyAuthChange(null);
}

export function isAdminUser(user) {
  return Boolean(user?.email && adminEmails.includes(user.email.toLowerCase()));
}

export function getFirebaseContext() {
  return { firebaseReady, authApi, storeApi, auth, db };
}

function signInLocal(email, name = "") {
  const localUser = {
    id: `local-${uid("user")}`,
    name: name || email.split("@")[0] || "Aluno",
    email,
    avatarUrl: "",
    provider: "local",
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
  notifyAuthChange(localUser);
  return localUser;
}

function getLocalUser() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_AUTH_KEY));
  } catch {
    return null;
  }
}

function notifyAuthChange(user) {
  authListeners.forEach((listener) => listener(user));
}

function serializeFirebaseUser(user, nameOverride = "") {
  return {
    id: user.uid,
    name: nameOverride || user.displayName || user.email?.split("@")[0] || "Usuario",
    email: user.email || "",
    avatarUrl: user.photoURL || "",
    provider: "firebase",
    createdAt: user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString()
  };
}
