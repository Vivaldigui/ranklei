import { percent } from "./format.js";

export const MIN_SAMPLE_SIZE = 30;

export function getQuestionStats(question, statsMap = {}) {
  const raw = statsMap[question.id] || question.stats || {};
  const totalAnswers = Number(raw.totalAnswers ?? raw.answered ?? 0);
  const uniqueUsers = Number(raw.uniqueUsers ?? raw.uniqueUserCount ?? totalAnswers);
  const correctAnswers = Number(raw.correctAnswers ?? raw.correct ?? 0);
  const wrongAnswers = Number(raw.wrongAnswers ?? raw.wrong ?? Math.max(0, totalAnswers - correctAnswers));
  const accuracyRate = totalAnswers ? percent(correctAnswers, totalAnswers) : 0;
  const hasEnoughSample = uniqueUsers >= MIN_SAMPLE_SIZE;
  const difficulty = calculateDifficulty(accuracyRate, uniqueUsers);

  return {
    totalAnswers,
    uniqueUsers,
    correctAnswers,
    wrongAnswers,
    accuracyRate,
    hasEnoughSample,
    difficulty,
    updatedAt: raw.updatedAt || question.updatedAt || ""
  };
}

export function calculateDifficulty(accuracyRate, uniqueUsers) {
  if (uniqueUsers < MIN_SAMPLE_SIZE) return "insufficient";
  if (accuracyRate >= 70) return "easy";
  if (accuracyRate >= 40) return "medium";
  return "hard";
}

export function difficultyLabel(value) {
  const labels = {
    easy: "Facil",
    medium: "Medio",
    hard: "Dificil",
    insufficient: "Amostragem insuficiente"
  };
  return labels[value] || labels.insufficient;
}

export function difficultyClass(value) {
  return `difficulty-${value || "insufficient"}`;
}

export function pointsForDifficulty(value) {
  if (value === "hard") return 3;
  if (value === "medium") return 2;
  if (value === "easy") return 1;
  return 1;
}
