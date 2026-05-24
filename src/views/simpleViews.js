import { emptyState, icon } from "../ui/components.js";
import { escapeHtml } from "../utils/format.js";

export function renderSavedFilters(state) {
  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">Filtros</span>
          <h2>Filtros salvos</h2>
          <p>Atalhos para combinacoes de estudo recorrentes.</p>
        </div>
      </section>
      <section class="card-grid span-3">
        ${
          state.appData.savedFilters.length
            ? state.appData.savedFilters
                .map(
                  (filter) => `
          <article class="panel notebook-card">
            <h3>${escapeHtml(filter.name)}</h3>
            <p>${Object.entries(filter.filters).filter(([, value]) => value).length} criterios aplicados</p>
            <div class="inline-actions">
              <button class="secondary-button" data-action="use-filter" data-filter-id="${filter.id}">${icon("play")}Usar</button>
              <button class="ghost-danger" data-action="delete-filter" data-filter-id="${filter.id}">${icon("trash-2")}Excluir</button>
            </div>
          </article>`
                )
                .join("")
            : emptyState("Nenhum filtro salvo ainda.")
        }
      </section>
    </div>
  `;
}

export function renderPlaceholder(title, description) {
  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">RankLei</span>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description)}</p>
        </div>
      </section>
      <section class="panel span-3">
        ${emptyState("Estrutura criada para evoluir esta area sem misturar com o fluxo principal.")}
      </section>
    </div>
  `;
}
