import { badge, emptyState, progressBar } from "../ui/components.js";
import { getLawXrayRows, resolveName } from "../state/selectors.js";
import { difficultyLabel, getQuestionStats } from "../utils/questionStats.js";

export function renderXray(state) {
  const rows = getLawXrayRows(state);
  const mostCharged = [...rows].sort((a, b) => b.totalQuestions - a.totalQuestions).slice(0, 8);

  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">Lei seca</span>
          <h2>Raio-X da Lei Seca</h2>
          <p>Veja artigos mais cobrados, acertos por lei e dificuldade media por artigo.</p>
        </div>
      </section>

      <section class="panel span-2">
        <div class="panel-title">
          <h3>Artigos mais cobrados</h3>
          <span>${rows.length} artigos</span>
        </div>
        <div class="stack-list">
          ${mostCharged.length ? mostCharged.map((row) => renderLawRow(state, row)).join("") : emptyState("Sem artigos para exibir.")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <h3>Dificuldade por artigo</h3>
          <span>Amostragem global</span>
        </div>
        <div class="stack-list">
          ${state.appData.questions
            .slice(0, 6)
            .map((question) => {
              const stats = getQuestionStats(question, state.appData.questionStats);
              return `<p class="xray-line"><strong>${[question.article, question.paragraph, question.inciso].filter(Boolean).join(" ") || "Sem artigo"}</strong><span>${difficultyLabel(stats.difficulty)}</span></p>`;
            })
            .join("")}
        </div>
      </section>
    </div>
  `;
}

function renderLawRow(state, row) {
  return `
    <article class="discipline-row">
      <div>
        <strong>${resolveName(state.appData.taxonomies.lawCodes, row.lawCode)} - ${row.article}</strong>
        <small>${row.totalQuestions} questoes / ${row.answered} respostas suas</small>
      </div>
      ${progressBar(row.accuracy, row.article)}
      <span>${row.accuracy}%</span>
      ${badge(`${row.hardQuestions} dificeis`, row.hardQuestions ? "orange" : "neutral")}
    </article>
  `;
}
