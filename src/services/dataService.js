import { disciplines, lawCodes, materials, mockRankingUsers, positions, subjects, subSubjects } from "../data/catalog.js";
import { getFirebaseContext, isAdminUser } from "./authService.js";

const APP_VERSION = 4;

export async function loadUserData(user) {
  const local = readLocalData(user);
  const cloud = await readCloudData(user);
  return normalizeAppData({ ...local, ...cloud });
}

export async function saveUserData(user, appData, options = {}) {
  const normalized = normalizeAppData(appData);
  localStorage.setItem(storageKey(user), JSON.stringify(normalized));
  const cloudSaved = await writeCloudData(user, normalized, options);
  if (options.requireCloud && !cloudSaved) {
    throw new Error("Nao foi possivel salvar os dados no Firebase.");
  }
  return { cloudSaved };
}

export async function deleteQuestionFromCloud(user, questionId) {
  const { firebaseReady, storeApi, db } = getFirebaseContext();
  if (!firebaseReady || !storeApi || !db || !isAdminUser(user) || !questionId) return;

  try {
    await Promise.all([
      storeApi.deleteDoc(storeApi.doc(db, "questions", questionId)),
      storeApi.deleteDoc(storeApi.doc(db, "questionStats", questionId))
    ]);
  } catch (error) {
    console.warn("Nao foi possivel excluir questao na nuvem.", error);
  }
}

export async function deleteAllQuestionsFromCloud(user) {
  const { firebaseReady, storeApi, db } = getFirebaseContext();
  if (!firebaseReady || !storeApi || !db || !isAdminUser(user)) {
    throw new Error("A limpeza exige login administrativo no Firebase.");
  }

  const [questionsSnap, statsSnap] = await Promise.all([
    storeApi.getDocs(storeApi.collection(db, "questions")),
    storeApi.getDocs(storeApi.collection(db, "questionStats"))
  ]);
  const refs = [
    ...questionsSnap.docs.map((docSnap) => docSnap.ref),
    ...statsSnap.docs.map((docSnap) => docSnap.ref)
  ];

  for (let index = 0; index < refs.length; index += 450) {
    const batch = storeApi.writeBatch(db);
    refs.slice(index, index + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return { questions: questionsSnap.size, stats: statsSnap.size };
}

export function normalizeAppData(data = {}) {
  data = data || {};
  return {
    version: APP_VERSION,
    questions: normalizeQuestions(data.questions),
    questionStats: data.questionStats || questionStatsFromQuestions(data.questions || []),
    answers: Array.isArray(data.answers) ? data.answers : [],
    notebooks: Array.isArray(data.notebooks) ? data.notebooks : [],
    savedFilters: Array.isArray(data.savedFilters) ? data.savedFilters : [],
    comments: Array.isArray(data.comments) ? data.comments : [],
    reports: Array.isArray(data.reports) ? data.reports : [],
    materials: Array.isArray(data.materials) && data.materials.length ? data.materials : materials,
    taxonomies: normalizeTaxonomies(data.taxonomies),
    rankingUsers: Array.isArray(data.rankingUsers) ? data.rankingUsers : mockRankingUsers,
    userStats: data.userStats || {
      totalAnswered: 0,
      totalUniqueAnswered: 0,
      totalCorrect: 0,
      totalWrong: 0,
      accuracy: 0,
      points: 0,
      streak: 0,
      lastStudyDate: "",
      createdAt: new Date().toISOString()
    }
  };
}

function normalizeQuestions(questions = []) {
  return questions
    .filter((question) => !question.type || question.type === "true_false")
    .map((question, index) => ({
      ...question,
      type: "true_false",
      number: question.number || index + 1,
      alternatives: [
        { value: true, label: "Verdadeiro" },
        { value: false, label: "Falso" }
      ],
      correctAnswer: Boolean(question.correctAnswer)
    }));
}

function questionStatsFromQuestions(questions) {
  return Object.fromEntries(
    normalizeQuestions(questions).map((question) => [
      question.id,
      {
        totalAnswers: question.stats?.totalAnswers || 0,
        uniqueUsers: question.stats?.uniqueUsers || 0,
        uniqueUserIds: [],
        correctAnswers: question.stats?.correctAnswers || 0,
        wrongAnswers: question.stats?.wrongAnswers || 0,
        updatedAt: question.stats?.updatedAt || question.updatedAt || ""
      }
    ])
  );
}

function readLocalData(user) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(user))) || {};
  } catch {
    return {};
  }
}

async function readCloudData(user) {
  const { firebaseReady, storeApi, db } = getFirebaseContext();
  if (!firebaseReady || !storeApi || !db || !user || user.provider !== "firebase") return {};

  try {
    const [stateSnap, questionsSnap, statsSnap, commentsSnap, taxonomiesSnap] = await Promise.all([
      storeApi.getDoc(storeApi.doc(db, "userStates", user.id)),
      storeApi.getDocs(storeApi.collection(db, "questions")),
      storeApi.getDocs(storeApi.collection(db, "questionStats")),
      storeApi.getDocs(storeApi.collection(db, "comments")),
      storeApi.getDoc(storeApi.doc(db, "appConfig", "taxonomies"))
    ]);

    const cloudState = stateSnap.exists() ? stateSnap.data() : {};
    const cloudQuestions = questionsSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((question) => question.type === "true_false");
    const cloudStats = Object.fromEntries(statsSnap.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
    const publicComments = commentsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    return {
      ...cloudState,
      questions: cloudQuestions.length ? cloudQuestions : cloudState.questions,
      questionStats: { ...(cloudState.questionStats || {}), ...cloudStats },
      taxonomies: taxonomiesSnap.exists() ? taxonomiesSnap.data() : cloudState.taxonomies,
      comments: mergeById([...(cloudState.comments || []), ...publicComments])
    };
  } catch (error) {
    console.warn("Nao foi possivel carregar dados em nuvem.", error);
    return {};
  }
}

async function writeCloudData(user, appData, options = {}) {
  const { firebaseReady, storeApi, db } = getFirebaseContext();
  if (!firebaseReady || !storeApi || !db || !user || user.provider !== "firebase") return false;

  try {
    const writes = [
      storeApi.setDoc(
        storeApi.doc(db, "profiles", user.id),
        {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl || "",
          totalAnswered: appData.userStats.totalAnswered,
          totalCorrect: appData.userStats.totalCorrect,
          totalWrong: appData.userStats.totalWrong,
          accuracy: appData.userStats.accuracy,
          points: appData.userStats.points,
          updatedAt: storeApi.serverTimestamp()
        },
        { merge: true }
      ),
      storeApi.setDoc(
        storeApi.doc(db, "userStates", user.id),
        {
          answers: appData.answers.slice(-1000),
          notebooks: appData.notebooks,
          savedFilters: appData.savedFilters,
          comments: appData.comments.filter((comment) => comment.userId === user.id || comment.isPrivate),
          reports: appData.reports.filter((report) => report.userId === user.id),
          userStats: appData.userStats,
          updatedAt: storeApi.serverTimestamp()
        },
        { merge: true }
      )
    ];

    if (isAdminUser(user)) {
      writes.push(writeAdminContent(storeApi, db, appData));
    }

    await Promise.all(writes);
    return true;
  } catch (error) {
    console.warn("Nao foi possivel salvar na nuvem.", error);
    if (options.requireCloud) throw error;
    return false;
  }
}

async function writeAdminContent(storeApi, db, appData) {
  const operations = [];

  operations.push((batch) => {
    batch.set(storeApi.doc(db, "appConfig", "taxonomies"), normalizeTaxonomies(appData.taxonomies), { merge: true });
  });

  appData.questions.forEach((question) => {
    operations.push((batch) => {
      batch.set(storeApi.doc(db, "questions", question.id), question, { merge: true });
    });
  });

  Object.entries(appData.questionStats || {}).forEach(([questionId, stats]) => {
    operations.push((batch) => {
      batch.set(storeApi.doc(db, "questionStats", questionId), stats, { merge: true });
    });
  });

  for (let index = 0; index < operations.length; index += 450) {
    const batch = storeApi.writeBatch(db);
    operations.slice(index, index + 450).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

function normalizeTaxonomies(input = {}) {
  input = input || {};
  return {
    disciplines: Array.isArray(input.disciplines) && input.disciplines.length ? input.disciplines : disciplines,
    subjects: Array.isArray(input.subjects) && input.subjects.length ? input.subjects : subjects,
    subSubjects: Array.isArray(input.subSubjects) && input.subSubjects.length ? input.subSubjects : subSubjects,
    lawCodes: Array.isArray(input.lawCodes) && input.lawCodes.length ? input.lawCodes : lawCodes,
    positions: Array.isArray(input.positions) && input.positions.length ? input.positions : positions
  };
}

function storageKey(user) {
  return `ranklei.v4.${user?.id || "guest"}`;
}

function mergeById(items) {
  const map = new Map();
  items.filter(Boolean).forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}
