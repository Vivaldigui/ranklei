import { normalize, percent } from "../utils/format.js";
import { getQuestionStats } from "../utils/questionStats.js";

export function resolveName(items, id) {
  return items.find((item) => item.id === id)?.name || id || "-";
}

export function getAnsweredQuestionIds(state) {
  return new Set(state.appData.answers.map((answer) => answer.questionId));
}

export function getLastAnswerForQuestion(state, questionId) {
  return state.appData.answers.find((answer) => answer.questionId === questionId);
}

export function getFilteredQuestions(state) {
  return getFilteredQuestionResults(state).questions;
}

export function getFilteredQuestionResults(state) {
  const filters = state.filters;
  const answeredIds = getAnsweredQuestionIds(state);
  let questions = state.appData.questions.filter((question) => {
    const stats = getQuestionStats(question, state.appData.questionStats);
    const lastAnswer = getLastAnswerForQuestion(state, question.id);
    const comments = state.appData.comments.filter((comment) => comment.questionId === question.id);
    const hasMyComment = comments.some((comment) => comment.userId === state.user?.id && !comment.isPrivate);
    const hasMyNote = comments.some((comment) => comment.userId === state.user?.id && comment.isPrivate);

    const statusOk =
      filters.questionStatus === "all" ||
      (filters.questionStatus === "correct" && lastAnswer?.isCorrect) ||
      (filters.questionStatus === "wrong" && lastAnswer && !lastAnswer.isCorrect) ||
      (filters.questionStatus === "answered" && answeredIds.has(question.id)) ||
      (filters.questionStatus === "unanswered" && !answeredIds.has(question.id));

    const commentsOk =
      filters.comments === "all" ||
      (filters.comments === "mine" && hasMyComment) ||
      (filters.comments === "notes" && hasMyNote);

    return (
      (!filters.lawCode || question.lawCode === filters.lawCode) &&
      (!filters.disciplineId || question.disciplineId === filters.disciplineId) &&
      (!filters.subjectId || question.subjectId === filters.subjectId) &&
      (!filters.subSubjectId || question.subSubjectId === filters.subSubjectId) &&
      (!filters.year || String(question.year) === String(filters.year)) &&
      (!filters.position || question.position === filters.position) &&
      (!filters.institution || question.institution === filters.institution) &&
      (!filters.difficulty || stats.difficulty === filters.difficulty) &&
      statusOk &&
      commentsOk
    );
  });

  if (filters.mode === "recent") {
    questions = [...questions].sort(compareQuestionsByDate);
  } else if (filters.mode === "random") {
    questions = [...questions].sort(() => Math.random() - 0.5);
  } else {
    questions = [...questions].sort(compareQuestionsByArticle);
  }

  return {
    total: questions.length,
    allQuestions: questions,
    questions: questions.slice(0, Number(filters.pageSize || 10))
  };
}

export function getDashboardMetrics(state) {
  const stats = state.appData.userStats;
  return {
    totalAnswered: stats.totalAnswered || state.appData.answers.length,
    totalUniqueAnswered: stats.totalUniqueAnswered || new Set(state.appData.answers.map((item) => item.questionId)).size,
    totalCorrect: stats.totalCorrect || state.appData.answers.filter((item) => item.isCorrect).length,
    totalWrong: stats.totalWrong || state.appData.answers.filter((item) => !item.isCorrect).length,
    accuracy: stats.accuracy || percent(stats.totalCorrect, stats.totalAnswered),
    points: stats.points || 0,
    streak: stats.streak || 0
  };
}

export function getUserRanking(state, period = "all") {
  const metrics = getDashboardMetrics(state);
  const currentUser = {
    id: state.user?.id || "current",
    name: state.user?.name || "Voce",
    points: metrics.points,
    totalAnswered: metrics.totalAnswered,
    totalCorrect: metrics.totalCorrect,
    streak: metrics.streak,
    current: true
  };

  return [currentUser, ...state.appData.rankingUsers]
    .map((user) => ({
      ...user,
      accuracy: percent(user.totalCorrect, user.totalAnswered),
      period
    }))
    .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy);
}

export function getTaxonomyOptions(state, field) {
  if (field === "year") return unique(state.appData.questions.map((question) => question.year).filter(Boolean)).sort((a, b) => b - a);
  if (field === "institution") return unique(state.appData.questions.map((question) => question.institution).filter(Boolean));
  if (field === "position") return unique(state.appData.questions.map((question) => question.position).filter(Boolean));
  return [];
}

export function getLawXrayRows(state) {
  const rows = new Map();
  state.appData.questions.forEach((question) => {
    const locator = questionLocator(question);
    const key = `${question.lawCode}:${locator}`;
    const current = rows.get(key) || {
      key,
      lawCode: question.lawCode,
      article: locator,
      totalQuestions: 0,
      correct: 0,
      answered: 0,
      hardQuestions: 0
    };
    const stats = getQuestionStats(question, state.appData.questionStats);
    const userAnswers = state.appData.answers.filter((answer) => answer.questionId === question.id);
    current.totalQuestions += 1;
    current.hardQuestions += stats.difficulty === "hard" ? 1 : 0;
    current.answered += userAnswers.length;
    current.correct += userAnswers.filter((answer) => answer.isCorrect).length;
    rows.set(key, current);
  });
  return Array.from(rows.values()).map((row) => ({ ...row, accuracy: percent(row.correct, row.answered) }));
}

export function searchIncludes(...values) {
  const haystack = normalize(values.join(" "));
  return (term) => !term || haystack.includes(normalize(term));
}

function unique(items) {
  return [...new Set(items)];
}

function compareQuestionsByArticle(a, b) {
  return (
    String(a.lawCode || "").localeCompare(String(b.lawCode || ""), "pt-BR") ||
    articleNumber(a.article) - articleNumber(b.article) ||
    articleSuffix(a.article).localeCompare(articleSuffix(b.article), "pt-BR", { numeric: true }) ||
    extractNumber(a.paragraph) - extractNumber(b.paragraph) ||
    extractRoman(a.inciso) - extractRoman(b.inciso) ||
    Number(a.number || 0) - Number(b.number || 0)
  );
}

function compareQuestionsByDate(a, b) {
  return (
    new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime() ||
    Number(b.number || 0) - Number(a.number || 0)
  );
}

function articleNumber(article) {
  const match = String(article || "").match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function articleSuffix(article) {
  return String(article || "").replace(/^\D*\d+\D*/i, "");
}

function extractNumber(value) {
  const match = String(value || "").match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function extractRoman(value) {
  const roman = String(value || "").trim().toUpperCase().match(/^[IVXLCDM]+/)?.[0];
  if (!roman) return Number.MAX_SAFE_INTEGER;
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  return roman.split("").reduce((total, char, index, chars) => {
    const current = values[char] || 0;
    const next = values[chars[index + 1]] || 0;
    return total + (current < next ? -current : current);
  }, 0);
}

function questionLocator(question) {
  return [question.article, question.paragraph, question.inciso].filter(Boolean).join(" ") || "Sem artigo";
}
