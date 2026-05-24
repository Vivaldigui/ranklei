import { badge, emptyState, icon, selectField } from "../ui/components.js";
import { escapeHtml, formatDateTime, secondsLabel } from "../utils/format.js";
import { difficultyClass, difficultyLabel, getQuestionStats } from "../utils/questionStats.js";
import { getFilteredQuestionResults, getLastAnswerForQuestion, getTaxonomyOptions, resolveName } from "../state/selectors.js";

export function renderQuestions(state) {
  const result = getFilteredQuestionResults(state);
  const questions = result.questions;
  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">Vade Mecum</span>
          <h2>Vade Mecum de Questoes</h2>
          <p>Filtro completo, questoes de Certo ou Errado e estatisticas por amostragem.</p>
        </div>
      </section>

      ${renderFilters(state)}

      <section class="question-toolbar-panel">
        <div><strong>${result.total}</strong><span>questoes encontradas</span><small>Exibindo ${questions.length} nesta pagina</small></div>
        <div class="reader-tools">
          <button class="icon-button" title="Aumentar fonte">${icon("type")}</button>
          <button class="icon-button" title="Imprimir">${icon("printer")}</button>
          <label class="mini-select">
            <span>Questoes por pagina</span>
            <select data-filter="pageSize">
              ${[10, 20, 50, 100, 200, 500].map((size) => `<option value="${size}" ${Number(state.filters.pageSize) === size ? "selected" : ""}>${size}</option>`).join("")}
            </select>
          </label>
        </div>
      </section>

      <section class="question-list span-3">
        ${questions.length ? questions.map((question) => renderQuestionCard(state, question)).join("") : emptyState("Nenhuma questao encontrada para os filtros aplicados.")}
      </section>
    </div>
  `;
}

function renderFilters(state) {
  const filters = state.filters;
  const tax = state.appData.taxonomies;
  const savedOptions = state.appData.savedFilters.map((filter) => ({ value: filter.id, label: filter.name }));
  const subjectOptions = tax.subjects
    .filter((subject) => !filters.disciplineId || subject.disciplineId === filters.disciplineId)
    .map((subject) => ({ value: subject.id, label: subject.name }));
  const subSubjectOptions = tax.subSubjects
    .filter((sub) => !filters.subjectId || sub.subjectId === filters.subjectId)
    .map((sub) => ({ value: sub.id, label: sub.name }));

  return `
    <form class="filters-panel span-3" data-form="filters">
      <div class="filters-grid">
        ${selectField({ label: "Filtro salvo", name: "savedFilterId", value: filters.savedFilterId, options: savedOptions, placeholder: "Selecione um filtro salvo" })}
        ${selectField({ label: "Codigo/Lei", name: "lawCode", value: filters.lawCode, options: tax.lawCodes.map((item) => ({ value: item.id, label: item.name })), placeholder: "Codigo/Lei" })}
        ${selectField({ label: "Disciplina", name: "disciplineId", value: filters.disciplineId, options: tax.disciplines.map((item) => ({ value: item.id, label: item.name })), placeholder: "Disciplina" })}
        ${selectField({ label: "Assunto", name: "subjectId", value: filters.subjectId, options: subjectOptions, placeholder: "Assunto" })}
        ${selectField({ label: "Subassunto", name: "subSubjectId", value: filters.subSubjectId, options: subSubjectOptions, placeholder: "Subassunto" })}
        ${selectField({ label: "Ano", name: "year", value: filters.year, options: getTaxonomyOptions(state, "year"), placeholder: "Ano" })}
        ${selectField({ label: "Cargo", name: "position", value: filters.position, options: getTaxonomyOptions(state, "position"), placeholder: "Cargo" })}
        ${selectField({ label: "Instituicao", name: "institution", value: filters.institution, options: getTaxonomyOptions(state, "institution"), placeholder: "Instituicao" })}
        ${selectField({
          label: "Nivel de dificuldade",
          name: "difficulty",
          value: filters.difficulty,
          options: [
            { value: "easy", label: "Facil" },
            { value: "medium", label: "Medio" },
            { value: "hard", label: "Dificil" },
            { value: "insufficient", label: "Sem amostragem" }
          ],
          placeholder: "Dificuldade"
        })}
      </div>
      <div class="segmented-lines">
        ${renderSegment("Comentarios", "comments", filters.comments, [
          ["all", "Todos"],
          ["mine", "Meus comentarios"],
          ["notes", "Minhas anotacoes"]
        ])}
        ${renderSegment("Questoes", "questionStatus", filters.questionStatus, [
          ["all", "Todas"],
          ["correct", "Acertei"],
          ["wrong", "Errei"],
          ["answered", "Resolvidas"],
          ["unanswered", "Nao resolvidas"]
        ])}
        ${renderSegment("Modo", "mode", filters.mode, [
          ["recent", "Recentes"],
          ["random", "Aleatorio"],
          ["ordered", "Ordenado"]
        ])}
      </div>
      <div class="filter-actions">
        <button class="ghost-button" type="button" data-action="save-filter">${icon("save")}Salvar filtro</button>
        <button class="ghost-danger" type="button" data-action="clear-filters">${icon("x")}Limpar filtro</button>
        <button class="primary-button" type="submit">${icon("filter")}Filtrar questoes</button>
      </div>
    </form>
  `;
}

function renderSegment(label, name, current, options) {
  return `
    <div class="segmented-row">
      <span>${label}:</span>
      ${options
        .map(
          ([value, text]) => `
        <button type="button" class="chip ${String(current) === value ? "active" : ""}" data-filter="${name}" data-value="${value}">
          ${escapeHtml(text)}
        </button>`
        )
        .join("")}
    </div>
  `;
}

function renderQuestionCard(state, question) {
  const stats = getQuestionStats(question, state.appData.questionStats);
  const lastAnswer = getLastAnswerForQuestion(state, question.id);
  const selected = state.selectedAnswers[question.id];
  const showResult = Boolean(state.expandedPanels[`result:${question.id}`] || lastAnswer);
  const comments = state.appData.comments.filter((comment) => comment.questionId === question.id && (!comment.isPrivate || comment.userId === state.user.id));
  const publicComments = comments.filter((comment) => !comment.isPrivate);
  const privateNotes = comments.filter((comment) => comment.isPrivate && comment.userId === state.user.id);

  return `
    <article class="question-card" id="question-${question.id}">
      <div class="question-head">
        <span class="question-number">${question.number}</span>
        <div>
          <strong>[${escapeHtml(question.article || "-")}] ${escapeHtml(resolveName(state.appData.taxonomies.lawCodes, question.lawCode))} | ${escapeHtml(question.institution || "Instituicao")} ${question.year}</strong>
          <div class="question-meta-line">
            ${badge(resolveName(state.appData.taxonomies.disciplines, question.disciplineId), "blue")}
            ${badge(resolveName(state.appData.taxonomies.subjects, question.subjectId), "neutral")}
            ${badge(resolveName(state.appData.taxonomies.subSubjects, question.subSubjectId), "neutral")}
            ${badge(difficultyLabel(stats.difficulty), difficultyClass(stats.difficulty))}
          </div>
        </div>
      </div>
      <p class="statement">${escapeHtml(question.statement)}</p>
      ${lastAnswer ? `<p class="answered-note">Voce ja respondeu esta questao em ${formatDateTime(lastAnswer.answeredAt)}: ${lastAnswer.isCorrect ? "acertou" : "errou"}.</p>` : ""}
      <div class="true-false-options" role="group" aria-label="Alternativas">
        ${renderOption(question.id, true, selected)}
        ${renderOption(question.id, false, selected)}
      </div>
      <button class="answer-button" data-action="answer-question" data-question-id="${question.id}">Responder</button>
      ${
        showResult
          ? `
        <div class="answer-result ${lastAnswer?.isCorrect ? "correct" : "wrong"}">
          <strong>Gabarito: ${question.correctAnswer ? "Verdadeiro" : "Falso"}</strong>
          <p>${escapeHtml(question.explanation)}</p>
        </div>`
          : ""
      }
      <div class="question-stats">
        <span>${stats.totalAnswers} respostas</span>
        <span>${stats.uniqueUsers} usuarios unicos</span>
        <span>${stats.accuracyRate}% de acerto</span>
        <span>${difficultyLabel(stats.difficulty)}</span>
      </div>
      <div class="question-actions-footer">
        <button data-action="toggle-panel" data-panel="comments:${question.id}">${icon("message-circle")}Comentarios (${publicComments.length})</button>
        <button data-action="add-to-notebook" data-question-id="${question.id}">${icon("notebook")}Cadernos</button>
        <button data-action="add-private-note" data-question-id="${question.id}">${icon("sticky-note")}Anotacao (${privateNotes.length})</button>
        <button data-action="report-question" data-question-id="${question.id}">${icon("circle-alert")}Reportar erro</button>
        <button data-action="toggle-panel" data-panel="history:${question.id}">${icon("history")}Historico</button>
        <button data-action="toggle-panel" data-panel="stats:${question.id}">${icon("bar-chart-3")}Estatisticas</button>
      </div>
      ${renderPanels(state, question, comments, stats)}
    </article>
  `;
}

function renderOption(questionId, value, selected) {
  const active = selected === value ? "selected" : "";
  return `
    <button class="tf-option ${active}" data-action="select-answer" data-question-id="${questionId}" data-answer="${value}">
      <span></span>
      <strong>${value ? "Verdadeiro" : "Falso"}</strong>
      ${active ? icon("check") : ""}
    </button>
  `;
}

function renderPanels(state, question, comments, stats) {
  const panels = [];
  if (state.expandedPanels[`comments:${question.id}`]) {
    panels.push(`
      <section class="inline-panel">
        <h4>Comentarios e anotacoes</h4>
        <form class="inline-form" data-form="comment" data-question-id="${question.id}">
          <input name="text" placeholder="Escreva um comentario publico..." required />
          <button class="secondary-button" type="submit">Comentar</button>
        </form>
        ${comments.length ? comments.map((comment) => `<article class="comment-line"><strong>${escapeHtml(comment.userName)}</strong><p>${escapeHtml(comment.text)}</p></article>`).join("") : emptyState("Nenhum comentario ainda.")}
      </section>
    `);
  }
  if (state.expandedPanels[`history:${question.id}`]) {
    const history = state.appData.answers.filter((answer) => answer.questionId === question.id);
    panels.push(`
      <section class="inline-panel">
        <h4>Historico de respostas</h4>
        ${history.length ? history.map((answer) => `<p>${formatDateTime(answer.answeredAt)} - ${answer.selectedAnswer ? "Verdadeiro" : "Falso"} - ${answer.isCorrect ? "acerto" : "erro"} - ${secondsLabel(answer.timeSpent)}</p>`).join("") : emptyState("Sem historico.")}
      </section>
    `);
  }
  if (state.expandedPanels[`stats:${question.id}`]) {
    panels.push(`
      <section class="inline-panel">
        <h4>Estatisticas da questao</h4>
        <p>Total: ${stats.totalAnswers} | Usuarios unicos: ${stats.uniqueUsers} | Acertos: ${stats.correctAnswers} | Erros: ${stats.wrongAnswers}</p>
        <p>Dificuldade calculada: ${difficultyLabel(stats.difficulty)}. A regra usa no minimo 30 usuarios unicos.</p>
      </section>
    `);
  }
  return panels.join("");
}
