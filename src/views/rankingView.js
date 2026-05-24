import { badge } from "../ui/components.js";
import { percent } from "../utils/format.js";
import { getUserRanking } from "../state/selectors.js";

export function renderRanking(state) {
  const period = state.rankingPeriod || "all";
  const ranking = getUserRanking(state, period);
  const myPosition = ranking.findIndex((user) => user.current) + 1;

  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">Ranking</span>
          <h2>Minha posicao</h2>
          <p>A pontuacao considera questoes certas e dificuldade calculada: facil +1, media +2, dificil +3.</p>
        </div>
        <div class="period-tabs">
          ${["all", "month", "week", "today"].map((item) => `<button class="${period === item ? "active" : ""}" data-ranking-period="${item}">${periodLabel(item)}</button>`).join("")}
        </div>
      </section>

      <section class="metrics-grid">
        <article class="metric-card">
          <span class="metric-icon orange">#</span>
          <div><strong>${myPosition}</strong><span>Sua posicao</span></div>
        </article>
        <article class="metric-card">
          <span class="metric-icon blue">XP</span>
          <div><strong>${state.appData.userStats.points || 0}</strong><span>Total de pontos</span></div>
        </article>
        <article class="metric-card">
          <span class="metric-icon green">%</span>
          <div><strong>${state.appData.userStats.accuracy || 0}%</strong><span>Percentual de acertos</span></div>
        </article>
      </section>

      <section class="panel span-3">
        <div class="panel-title">
          <h3>Comparacao com outros usuarios</h3>
          <span>${ranking.length} participantes</span>
        </div>
        <div class="ranking-table">
          ${ranking
            .map(
              (user, index) => `
            <article class="ranking-row ${user.current ? "current" : ""}">
              <span class="rank-number">${index + 1}</span>
              <div>
                <strong>${user.current ? "Voce" : user.name}</strong>
                <small>${user.totalAnswered} questoes resolvidas</small>
              </div>
              <span>${user.points} pts</span>
              <span>${percent(user.totalCorrect, user.totalAnswered)}%</span>
              ${badge(user.streak ? `${user.streak} dias` : "sem streak", user.streak ? "green" : "neutral")}
            </article>`
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function periodLabel(value) {
  return {
    all: "Geral",
    month: "Mes",
    week: "Semana",
    today: "Hoje"
  }[value];
}
