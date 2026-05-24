import { emptyState, icon } from "../ui/components.js";
import { escapeHtml } from "../utils/format.js";

export function renderNotebooks(state) {
  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">Cadernos</span>
          <h2>Meus cadernos</h2>
          <p>Crie cadernos e adicione questoes para resolver depois.</p>
        </div>
      </section>
      <form class="panel form-grid-inline span-3" data-form="notebook">
        <input name="name" placeholder="Nome do caderno" required />
        <input name="description" placeholder="Descricao opcional" />
        <button class="primary-button" type="submit">${icon("plus")}Criar caderno</button>
      </form>
      <section class="card-grid span-3">
        ${
          state.appData.notebooks.length
            ? state.appData.notebooks
                .map(
                  (notebook) => `
          <article class="panel notebook-card">
            <h3>${escapeHtml(notebook.name)}</h3>
            <p>${escapeHtml(notebook.description || "Sem descricao")}</p>
            <strong>${(notebook.questionIds || []).length} questoes</strong>
            <button class="secondary-button" data-route="questions">Resolver</button>
          </article>`
                )
                .join("")
            : emptyState("Nenhum caderno criado ainda.")
        }
      </section>
    </div>
  `;
}
