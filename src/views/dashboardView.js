import { badge, emptyState, metricCard, progressBar } from "../ui/components.js";
import { formatDateTime, formatShortDate, percent, secondsLabel } from "../utils/format.js";
import { getDashboardMetrics, getUserRanking, resolveName } from "../state/selectors.js";

export function renderDashboard(state) {
  const metrics = getDashboardMetrics(state);
  const ranking = getUserRanking(state);
  const myPosition = ranking.findIndex((user) => user.current) + 1;
  const recentAnswers = state.appData.answers.slice(0, 8);
  const dailyRows = groupAnswersByDay(state.appData.answers);
  const disciplineRows = groupByDiscipline(state);

  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">Dashboard</span>
          <h2>Meu desempenho</h2>
          <p>Acompanhe questoes resolvidas, acertos, erros, media geral, streak e posicao no ranking.</p>
        </div>
        <div class="toolbar-actions">
          <button class="secondary-button" data-action="refresh">${iconSafe("refresh-cw")}Atualizar</button>
          <button class="ghost-danger" data-action="clear-history">${iconSafe("x")}Limpar historico</button>
        </div>
      </section>

      <section class="metrics-grid">
        ${metricCard({ iconName: "trending-up", label: "Questoes resolvidas", value: metrics.totalAnswered, tone: "blue" })}
        ${metricCard({ iconName: "pie-chart", label: "Questoes unicas", value: metrics.totalUniqueAnswered, tone: "blue" })}
        ${metricCard({ iconName: "check", label: "Respostas corretas", value: metrics.totalCorrect, tone: "green" })}
        ${metricCard({ iconName: "x", label: "Respostas erradas", value: metrics.totalWrong, tone: "red" })}
        ${metricCard({ iconName: "percent", label: "Media geral", value: `${metrics.accuracy}%`, tone: "orange" })}
        ${metricCard({ iconName: "flame", label: "Sequencia", value: `${metrics.streak} dias`, tone: "green" })}
        ${metricCard({ iconName: "trophy", label: "Ranking atual", value: `#${myPosition || "-"}`, tone: "orange" })}
      </section>

      <section class="panel chart-panel span-2">
        <div class="panel-title">
          <h3>Historico geral de resolucoes</h3>
          <span>${state.appData.answers.length} respostas</span>
        </div>
        ${dailyRows.length ? renderBarChart(dailyRows) : emptyState("Responda questoes para gerar o historico.")}
      </section>

      <section class="panel">
        <div class="panel-title">
          <h3>Acertos x erros</h3>
          <span>${metrics.accuracy}%</span>
        </div>
        <div class="donut-wrap" style="--ok:${metrics.accuracy}%">
          <div class="donut"></div>
          <div class="donut-legend">
            <span>${badge("Acertos", "green")} ${metrics.totalCorrect}</span>
            <span>${badge("Erros", "red")} ${metrics.totalWrong}</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <h3>Rendimento por disciplina</h3>
          <button class="text-button" data-route="xray">Ver Raio-X</button>
        </div>
        <div class="stack-list">
          ${disciplineRows.length ? disciplineRows.map((row) => renderDisciplineRow(row)).join("") : emptyState("Sem desempenho por disciplina ainda.")}
        </div>
      </section>

      <section class="panel span-2">
        <div class="panel-title">
          <h3>Ultimas atividades</h3>
          <button class="text-button" data-route="questions">Resolver mais</button>
        </div>
        ${recentAnswers.length ? renderActivityTable(state, recentAnswers) : emptyState("Suas respostas aparecerao aqui.")}
      </section>

      <section class="panel">
        <div class="panel-title">
          <h3>Ultimos simulados</h3>
          <span>Estrutura pronta</span>
        </div>
        ${emptyState("Os simulados entrarao aqui quando voce criar provas cronometradas.")}
      </section>
    </div>
  `;
}

function renderBarChart(rows) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  return `
    <div class="bar-chart">
      ${rows
        .map(
          (row) => `
        <div class="bar-group">
          <span class="bar-total" style="--height:${(row.total / max) * 100}%"></span>
          <span class="bar-correct" style="--height:${(row.correct / max) * 100}%"></span>
          <small>${formatShortDate(row.date)}</small>
        </div>`
        )
        .join("")}
    </div>
  `;
}

function renderDisciplineRow(row) {
  return `
    <article class="discipline-row">
      <div>
        <strong>${row.name}</strong>
        <small>${row.correct}/${row.total} acertos</small>
      </div>
      ${progressBar(row.accuracy, row.name)}
      <span>${row.accuracy}%</span>
    </article>
  `;
}

function renderActivityTable(state, answers) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Disciplina</th>
            <th>Assunto</th>
            <th>Questao</th>
            <th>Resultado</th>
            <th>Tempo</th>
          </tr>
        </thead>
        <tbody>
          ${answers
            .map((answer) => {
              const question = state.appData.questions.find((item) => item.id === answer.questionId);
              return `
                <tr>
                  <td>${formatDateTime(answer.answeredAt)}</td>
                  <td>${resolveName(state.appData.taxonomies.disciplines, answer.disciplineId)}</td>
                  <td>${resolveName(state.appData.taxonomies.subjects, answer.subjectId)}</td>
                  <td>${question ? `#${question.number}` : "-"}</td>
                  <td>${answer.isCorrect ? badge("Acerto", "green") : badge("Erro", "red")}</td>
                  <td>${secondsLabel(answer.timeSpent)}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function groupAnswersByDay(answers) {
  const map = new Map();
  answers.forEach((answer) => {
    const date = answer.answeredAt.slice(0, 10);
    const current = map.get(date) || { date, total: 0, correct: 0 };
    current.total += 1;
    current.correct += answer.isCorrect ? 1 : 0;
    map.set(date, current);
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
}

function groupByDiscipline(state) {
  const map = new Map();
  state.appData.answers.forEach((answer) => {
    const current = map.get(answer.disciplineId) || { disciplineId: answer.disciplineId, total: 0, correct: 0 };
    current.total += 1;
    current.correct += answer.isCorrect ? 1 : 0;
    map.set(answer.disciplineId, current);
  });
  return Array.from(map.values()).map((row) => ({
    ...row,
    name: resolveName(state.appData.taxonomies.disciplines, row.disciplineId),
    accuracy: percent(row.correct, row.total)
  }));
}

function iconSafe(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}
