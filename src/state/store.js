import { normalizeAppData, saveUserData } from "../services/dataService.js";
import { isAdminUser } from "../services/authService.js";
import { todayKey, uid } from "../utils/format.js";
import { getQuestionStats, pointsForDifficulty } from "../utils/questionStats.js";

const defaultFilters = {
  savedFilterId: "",
  lawCode: "",
  disciplineId: "",
  subjectId: "",
  subSubjectId: "",
  year: "",
  position: "",
  institution: "",
  difficulty: "",
  questionStatus: "all",
  comments: "all",
  mode: "ordered",
  pageSize: 50
};

const THEME_STORAGE_KEY = "ranklei.theme";

let state = {
  route: "landing",
  drawerOpen: false,
  authMode: "login",
  theme: getInitialTheme(),
  user: null,
  isAdmin: false,
  appData: normalizeAppData(),
  filters: { ...defaultFilters },
  rankingPeriod: "all",
  activeQuestionId: "",
  filtersOpen: false,
  focusMode: false,
  focusIndex: 0,
  questionTimers: {},
  selectedAnswers: {},
  expandedPanels: {},
  syncStatus: "Local"
};

const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setUser(user, appData) {
  state = {
    ...state,
    user,
    isAdmin: isAdminUser(user),
    route: user ? "dashboard" : "landing",
    appData: normalizeAppData(appData),
    syncStatus: user ? "Sincronizado" : "Visitante"
  };
  notify();
}

export function setRoute(route) {
  if (!state.user && route !== "landing") route = "landing";
  state = { ...state, route, drawerOpen: false };
  notify();
}

export function setAuthMode(authMode) {
  state = { ...state, authMode };
  notify();
}

export function toggleDrawer() {
  state = { ...state, drawerOpen: !state.drawerOpen };
  notify();
}

export function toggleTheme() {
  const theme = state.theme === "dark" ? "light" : "dark";
  state = { ...state, theme };
  saveTheme(theme);
  notify();
}

export function setRankingPeriod(rankingPeriod) {
  state = { ...state, rankingPeriod };
  notify();
}

export function toggleFiltersPanel() {
  state = { ...state, filtersOpen: !state.filtersOpen };
  notify();
}

export function toggleFocusMode() {
  state = { ...state, focusMode: !state.focusMode, focusIndex: 0 };
  notify();
}

export function moveFocusQuestion(direction, total = state.appData.questions.length) {
  const max = Math.max(0, Number(total || 0) - 1);
  const nextIndex = Math.min(max, Math.max(0, state.focusIndex + direction));
  state = { ...state, focusIndex: nextIndex };
  notify();
}

export function togglePanel(panelId) {
  state = {
    ...state,
    expandedPanels: {
      ...state.expandedPanels,
      [panelId]: !state.expandedPanels[panelId]
    }
  };
  notify();
}

export function clearHistory() {
  state = {
    ...state,
    appData: {
      ...state.appData,
      answers: [],
      userStats: {
        ...state.appData.userStats,
        totalAnswered: 0,
        totalUniqueAnswered: 0,
        totalCorrect: 0,
        totalWrong: 0,
        accuracy: 0,
        points: 0,
        streak: 0
      }
    },
    selectedAnswers: {},
    expandedPanels: {}
  };
  persist();
}

export function updateFilter(name, value) {
  state = { ...state, filters: { ...state.filters, [name]: value }, focusIndex: 0 };
  notify();
}

export function setFilters(filters) {
  state = { ...state, filters: { ...state.filters, ...filters }, focusIndex: 0 };
  notify();
}

export function clearFilters() {
  state = { ...state, filters: { ...defaultFilters }, focusIndex: 0 };
  notify();
}

export function applySavedFilter(savedFilterId) {
  const saved = state.appData.savedFilters.find((filter) => filter.id === savedFilterId);
  if (!saved) return;
  state = { ...state, filters: { ...defaultFilters, ...saved.filters, savedFilterId }, focusIndex: 0 };
  notify();
}

export function saveCurrentFilter(name) {
  const filter = {
    id: uid("filter"),
    userId: state.user.id,
    name,
    filters: { ...state.filters, savedFilterId: "" },
    createdAt: new Date().toISOString()
  };
  state = {
    ...state,
    appData: {
      ...state.appData,
      savedFilters: [filter, ...state.appData.savedFilters]
    }
  };
  persist();
}

export function deleteSavedFilter(filterId) {
  state = {
    ...state,
    appData: {
      ...state.appData,
      savedFilters: state.appData.savedFilters.filter((filter) => filter.id !== filterId)
    }
  };
  persist();
}

export function setSelectedAnswer(questionId, value) {
  state = {
    ...state,
    selectedAnswers: { ...state.selectedAnswers, [questionId]: value === "true" || value === true }
  };
  if (!state.questionTimers[questionId]) {
    state.questionTimers[questionId] = Date.now();
  }
  notify();
}

export function answerQuestion(questionId) {
  const question = state.appData.questions.find((item) => item.id === questionId);
  if (!question || !state.user) return { ok: false, message: "Questao indisponivel." };
  if (!(questionId in state.selectedAnswers)) return { ok: false, message: "Selecione Verdadeiro ou Falso." };

  const selectedAnswer = state.selectedAnswers[questionId];
  const isCorrect = selectedAnswer === question.correctAnswer;
  const answeredAt = new Date().toISOString();
  const timeSpent = Math.max(1000, Date.now() - (state.questionTimers[questionId] || Date.now()));
  const statsBefore = getQuestionStats(question, state.appData.questionStats);
  const points = isCorrect ? pointsForDifficulty(statsBefore.difficulty) : 0;
  const answer = {
    id: uid("answer"),
    userId: state.user.id,
    questionId,
    selectedAnswer,
    isCorrect,
    answeredAt,
    timeSpent,
    disciplineId: question.disciplineId,
    subjectId: question.subjectId,
    subSubjectId: question.subSubjectId,
    difficultyAtAnswer: statsBefore.difficulty
  };

  const currentStats = state.appData.questionStats[questionId] || {
    totalAnswers: 0,
    uniqueUsers: 0,
    uniqueUserIds: [],
    correctAnswers: 0,
    wrongAnswers: 0
  };
  const uniqueUserIds = Array.isArray(currentStats.uniqueUserIds) ? currentStats.uniqueUserIds : [];
  const isNewUniqueUser = !uniqueUserIds.includes(state.user.id);
  const nextStats = {
    ...currentStats,
    totalAnswers: Number(currentStats.totalAnswers || 0) + 1,
    uniqueUsers: Number(currentStats.uniqueUsers || 0) + (isNewUniqueUser ? 1 : 0),
    uniqueUserIds: isNewUniqueUser ? [...uniqueUserIds, state.user.id] : uniqueUserIds,
    correctAnswers: Number(currentStats.correctAnswers || 0) + (isCorrect ? 1 : 0),
    wrongAnswers: Number(currentStats.wrongAnswers || 0) + (isCorrect ? 0 : 1),
    updatedAt: answeredAt
  };

  const answers = [answer, ...state.appData.answers];
  const uniqueAnswered = new Set(answers.map((item) => item.questionId)).size;
  const totalCorrect = answers.filter((item) => item.isCorrect).length;
  const totalWrong = answers.length - totalCorrect;
  const lastStudyDate = todayKey();
  const streak = calculateStreak(answers);

  state = {
    ...state,
    appData: {
      ...state.appData,
      answers,
      questionStats: {
        ...state.appData.questionStats,
        [questionId]: nextStats
      },
      userStats: {
        ...state.appData.userStats,
        totalAnswered: answers.length,
        totalUniqueAnswered: uniqueAnswered,
        totalCorrect,
        totalWrong,
        accuracy: answers.length ? Math.round((totalCorrect / answers.length) * 100) : 0,
        points: Number(state.appData.userStats.points || 0) + points,
        streak,
        lastStudyDate
      }
    },
    expandedPanels: { ...state.expandedPanels, [`result:${questionId}`]: true }
  };
  persist();
  return { ok: true, isCorrect };
}

export function createNotebook(name, description = "") {
  if (!name.trim()) return;
  const notebook = {
    id: uid("notebook"),
    userId: state.user.id,
    name: name.trim(),
    description: description.trim(),
    questionIds: [],
    createdAt: new Date().toISOString()
  };
  state = { ...state, appData: { ...state.appData, notebooks: [notebook, ...state.appData.notebooks] } };
  persist();
}

export function addQuestionToNotebook(questionId, notebookId) {
  const notebooks = state.appData.notebooks.map((notebook) => {
    if (notebook.id !== notebookId) return notebook;
    return { ...notebook, questionIds: [...new Set([...(notebook.questionIds || []), questionId])] };
  });
  state = { ...state, appData: { ...state.appData, notebooks } };
  persist();
}

export function removeQuestionFromNotebook(questionId, notebookId) {
  const notebooks = state.appData.notebooks.map((notebook) => {
    if (notebook.id !== notebookId) return notebook;
    return { ...notebook, questionIds: (notebook.questionIds || []).filter((id) => id !== questionId) };
  });
  state = { ...state, appData: { ...state.appData, notebooks } };
  persist();
}

export function addComment(questionId, text, isPrivate = false) {
  if (!text.trim()) return;
  const comment = {
    id: uid("comment"),
    userId: state.user.id,
    userName: state.user.name,
    questionId,
    text: text.trim(),
    isPrivate,
    createdAt: new Date().toISOString()
  };
  state = { ...state, appData: { ...state.appData, comments: [comment, ...state.appData.comments] } };
  persist();
}

export function reportQuestion(questionId, description) {
  if (!description.trim()) return;
  const report = {
    id: uid("report"),
    userId: state.user.id,
    questionId,
    reason: "erro",
    description: description.trim(),
    status: "open",
    createdAt: new Date().toISOString()
  };
  state = { ...state, appData: { ...state.appData, reports: [report, ...state.appData.reports] } };
  persist();
}

export function clearAllQuestions() {
  state = {
    ...state,
    appData: {
      ...state.appData,
      questions: [],
      questionStats: {},
      answers: [],
      comments: state.appData.comments.filter((comment) => comment.isPrivate),
      reports: []
    },
    selectedAnswers: {},
    expandedPanels: {},
    focusIndex: 0
  };
  return persist({ requireCloud: state.isAdmin });
}

export function upsertQuestion(question) {
  const exists = state.appData.questions.some((item) => item.id === question.id);
  const questions = exists
    ? state.appData.questions.map((item) => (item.id === question.id ? question : item))
    : [{ ...question, number: state.appData.questions.length + 1 }, ...state.appData.questions];
  state = { ...state, appData: { ...state.appData, questions } };
  persist();
}

export function upsertQuestions(questions) {
  const map = new Map(state.appData.questions.map((question) => [question.id, question]));
  const questionStats = { ...state.appData.questionStats };
  questions.forEach((question, index) => {
    map.set(question.id, {
      ...question,
      number: Number(question.number || 0) || map.size + index + 1
    });
    if (!questionStats[question.id]) {
      questionStats[question.id] = {
        totalAnswers: 0,
        uniqueUsers: 0,
        uniqueUserIds: [],
        correctAnswers: 0,
        wrongAnswers: 0,
        updatedAt: question.updatedAt || new Date().toISOString()
      };
    }
  });
  state = { ...state, appData: { ...state.appData, questions: Array.from(map.values()), questionStats } };
  persist();
}

export function importQuestionsBatch(questions, taxonomies) {
  const mergedTaxonomies = taxonomies ? mergeTaxonomies(state.appData.taxonomies, taxonomies) : state.appData.taxonomies;
  const map = new Map(state.appData.questions.map((question) => [question.id, question]));
  const questionStats = { ...state.appData.questionStats };

  questions.forEach((question, index) => {
    map.set(question.id, {
      ...question,
      number: Number(question.number || 0) || map.size + index + 1
    });
    if (!questionStats[question.id]) {
      questionStats[question.id] = {
        totalAnswers: 0,
        uniqueUsers: 0,
        uniqueUserIds: [],
        correctAnswers: 0,
        wrongAnswers: 0,
        updatedAt: question.updatedAt || new Date().toISOString()
      };
    }
  });

  state = {
    ...state,
    appData: {
      ...state.appData,
      questions: Array.from(map.values()),
      questionStats,
      taxonomies: mergedTaxonomies
    }
  };
  return persist({ requireCloud: state.isAdmin });
}

export function upsertTaxonomies(taxonomies) {
  if (!taxonomies) return;
  state = {
    ...state,
    appData: {
      ...state.appData,
      taxonomies: mergeTaxonomies(state.appData.taxonomies, taxonomies)
    }
  };
  persist();
}

export function addDiscipline(name) {
  const cleaned = String(name || "").trim();
  if (!cleaned) return;
  upsertTaxonomyItem("disciplines", { id: uidFromName(cleaned), name: cleaned });
}

export function addSubject(disciplineId, name) {
  const cleaned = String(name || "").trim();
  if (!disciplineId || !cleaned) return;
  upsertTaxonomyItem("subjects", { id: uidFromName(cleaned), disciplineId, name: cleaned });
}

export function addSubSubject(subjectId, name) {
  const cleaned = String(name || "").trim();
  if (!subjectId || !cleaned) return;
  upsertTaxonomyItem("subSubjects", { id: uidFromName(cleaned), subjectId, name: cleaned });
}

function upsertTaxonomyItem(collectionName, item) {
  const current = state.appData.taxonomies[collectionName] || [];
  const exists = current.some((entry) => entry.id === item.id);
  state = {
    ...state,
    appData: {
      ...state.appData,
      taxonomies: {
        ...state.appData.taxonomies,
        [collectionName]: exists ? current.map((entry) => (entry.id === item.id ? item : entry)) : [...current, item]
      }
    }
  };
  persist();
}

function mergeTaxonomies(current = {}, incoming = {}) {
  return {
    ...current,
    ...incoming,
    disciplines: mergeTaxonomyList(current.disciplines, incoming.disciplines),
    subjects: mergeTaxonomyList(current.subjects, incoming.subjects),
    subSubjects: mergeTaxonomyList(current.subSubjects, incoming.subSubjects),
    lawCodes: mergeTaxonomyList(current.lawCodes, incoming.lawCodes),
    positions: mergeTaxonomyList(current.positions, incoming.positions)
  };
}

function mergeTaxonomyList(current = [], incoming = []) {
  const map = new Map();
  current.filter(Boolean).forEach((item) => map.set(item.id, item));
  incoming.filter(Boolean).forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
  return Array.from(map.values());
}

export function deleteQuestion(questionId) {
  state = {
    ...state,
    appData: {
      ...state.appData,
      questions: state.appData.questions.filter((question) => question.id !== questionId),
      answers: state.appData.answers.filter((answer) => answer.questionId !== questionId),
      comments: state.appData.comments.filter((comment) => comment.questionId !== questionId)
    }
  };
  persist();
}

export function getDefaultFilters() {
  return { ...defaultFilters };
}

function calculateStreak(answers) {
  const dates = Array.from(new Set(answers.map((answer) => todayKey(new Date(answer.answeredAt))))).sort().reverse();
  let streak = 0;
  const cursor = new Date();
  while (dates.includes(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function uidFromName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || uid("tax");
}

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Tema continua funcionando mesmo quando o navegador bloqueia armazenamento.
  }
}

function persist(options = {}) {
  notify();
  if (state.user) return saveUserData(state.user, state.appData, options);
  return Promise.resolve({ cloudSaved: false });
}

function notify() {
  listeners.forEach((listener) => listener(state));
}
