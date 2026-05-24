import { inputField, selectField, emptyState, icon } from "../ui/components.js";
import { escapeHtml } from "../utils/format.js";
import { resolveName } from "../state/selectors.js";

export function renderAdmin(state) {
  if (!state.isAdmin) {
    return `
      <div class="page-grid">
        <section class="panel span-3">
          ${emptyState("Apenas administradores podem acessar esta area.")}
        </section>
      </div>
    `;
  }

  const tax = state.appData.taxonomies;
  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">Admin</span>
          <h2>Administracao de conteudo</h2>
          <p>Arquitetura preparada para cadastrar questoes certo/errado, taxonomias e importacao futura em lote.</p>
        </div>
      </section>

      <form class="panel admin-form span-2" data-form="admin-question">
        <div class="panel-title">
          <h3>Cadastrar questao certo/errado</h3>
          <span>CRUD estrutural</span>
        </div>
        <div class="filters-grid">
          ${inputField({ label: "ID", name: "id", placeholder: "q-novo-artigo" })}
          ${selectField({ label: "Codigo/Lei", name: "lawCode", options: tax.lawCodes.map((item) => ({ value: item.id, label: item.name })), placeholder: "Codigo/Lei" })}
          ${inputField({ label: "Artigo", name: "article", placeholder: "Art. 9" })}
          ${selectField({ label: "Disciplina", name: "disciplineId", options: tax.disciplines.map((item) => ({ value: item.id, label: item.name })), placeholder: "Disciplina" })}
          ${selectField({ label: "Assunto", name: "subjectId", options: tax.subjects.map((item) => ({ value: item.id, label: item.name })), placeholder: "Assunto" })}
          ${selectField({ label: "Subassunto", name: "subSubjectId", options: tax.subSubjects.map((item) => ({ value: item.id, label: item.name })), placeholder: "Subassunto" })}
          ${inputField({ label: "Ano", name: "year", type: "number", placeholder: "2026" })}
          ${inputField({ label: "Instituicao", name: "institution", placeholder: "TJ-CE" })}
          ${inputField({ label: "Cargo", name: "position", placeholder: "Analista" })}
          ${selectField({
            label: "Gabarito",
            name: "correctAnswer",
            options: [
              { value: "true", label: "Verdadeiro" },
              { value: "false", label: "Falso" }
            ],
            placeholder: "Gabarito"
          })}
        </div>
        <label class="field">
          <span>Enunciado</span>
          <textarea name="statement" required placeholder="Digite o enunciado da questao"></textarea>
        </label>
        <label class="field">
          <span>Comentario/explicacao</span>
          <textarea name="explanation" required placeholder="Explique o gabarito"></textarea>
        </label>
        <button class="primary-button" type="submit">${icon("save")}Salvar questao</button>
      </form>

      <section class="panel">
        <div class="panel-title">
          <h3>Questoes</h3>
          <span>${state.appData.questions.length}</span>
        </div>
        <div class="admin-list">
          ${state.appData.questions
            .map(
              (question) => `
          <article class="admin-row">
            <div>
              <strong>#${question.number} ${escapeHtml(question.article)}</strong>
              <small>${escapeHtml(resolveName(tax.disciplines, question.disciplineId))} / ${escapeHtml(question.institution || "Sem instituicao")}</small>
            </div>
            <button class="ghost-danger" data-action="delete-admin-question" data-question-id="${question.id}">${icon("trash-2")}</button>
          </article>`
            )
            .join("")}
        </div>
      </section>

      <section class="panel span-3">
        <div class="panel-title">
          <h3>Taxonomias preparadas</h3>
          <span>Disciplina / Assunto / Subassunto / Instituicao / Codigo</span>
        </div>
        <div class="taxonomy-grid">
          ${renderTaxonomyColumn("Disciplinas", tax.disciplines)}
          ${renderTaxonomyColumn("Assuntos", tax.subjects)}
          ${renderTaxonomyColumn("Subassuntos", tax.subSubjects)}
          ${renderTaxonomyColumn("Codigos/Leis", tax.lawCodes)}
        </div>
      </section>

      <section class="panel span-3">
        <div class="panel-title">
          <h3>Cadastrar disciplinas, assuntos e subassuntos</h3>
          <span>Taxonomia</span>
        </div>
        <div class="taxonomy-admin">
          <form class="mini-admin-form" data-form="discipline">
            ${inputField({ label: "Nova disciplina", name: "name", placeholder: "Ex.: Direito Tributario", required: true })}
            <button class="primary-button" type="submit">${icon("plus")}Adicionar disciplina</button>
          </form>
          <form class="mini-admin-form" data-form="subject">
            ${selectField({ label: "Disciplina", name: "disciplineId", options: tax.disciplines.map((item) => ({ value: item.id, label: item.name })), placeholder: "Escolha" })}
            ${inputField({ label: "Novo assunto", name: "name", placeholder: "Ex.: Credito tributario", required: true })}
            <button class="primary-button" type="submit">${icon("plus")}Adicionar assunto</button>
          </form>
          <form class="mini-admin-form" data-form="subsubject">
            ${selectField({ label: "Assunto", name: "subjectId", options: tax.subjects.map((item) => ({ value: item.id, label: item.name })), placeholder: "Escolha" })}
            ${inputField({ label: "Novo subassunto", name: "name", placeholder: "Ex.: Lancamento", required: true })}
            <button class="primary-button" type="submit">${icon("plus")}Adicionar subassunto</button>
          </form>
        </div>
      </section>

      <section class="panel span-3">
        <div class="panel-title">
          <h3>Importar questoes em lote</h3>
          <a class="secondary-button" href="./templates/modelo-questoes-ranklei.csv" download>${icon("download")}Baixar modelo CSV</a>
        </div>
        <form class="bulk-form" data-form="bulk-import">
          <label class="field">
            <span>Arquivo opcional</span>
            <input name="bulkFile" type="file" accept=".txt,.csv,.tsv,.json,text/plain,text/csv,application/json" />
          </label>
          <label class="field">
            <span>Conteudo do lote</span>
            <textarea name="bulkText" rows="10" placeholder="CSV RankLei: id;numero;pergunta;resposta;explicacao;codigo_lei;artigo;disciplina;assunto;subassunto;ano;instituicao;cargo&#10;A resposta deve ser Certo ou Errado.&#10;Tambem aceita Anki TSV e JSON."></textarea>
          </label>
          <p class="bulk-help">Gabaritos aceitos: Verdadeiro/Certo/Correto/True/V/C/1 ou Falso/Errado/Incorreto/False/F/E/0. Se disciplina, assunto, subassunto ou codigo/lei nao existirem, o painel cadastra automaticamente.</p>
          <button class="primary-button" type="submit">${icon("upload")}Importar lote</button>
        </form>
      </section>
    </div>
  `;
}

function renderTaxonomyColumn(title, items) {
  return `
    <div>
      <h4>${title}</h4>
      ${items.map((item) => `<p>${escapeHtml(item.name)}</p>`).join("")}
    </div>
  `;
}
