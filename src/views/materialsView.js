import { emptyState, icon } from "../ui/components.js";
import { escapeHtml } from "../utils/format.js";
import { resolveName } from "../state/selectors.js";

export function renderMaterials(state) {
  return `
    <div class="page-grid">
      <section class="page-heading">
        <div>
          <span class="eyebrow">Materiais</span>
          <h2>Materiais de apoio</h2>
          <p>Links oficiais e PDFs podem ser organizados por disciplina e assunto.</p>
        </div>
      </section>
      <section class="card-grid span-3">
        ${
          state.appData.materials.length
            ? state.appData.materials
                .map(
                  (material) => `
          <article class="panel material-card">
            <span>${icon("file-text")}</span>
            <h3>${escapeHtml(material.title)}</h3>
            <p>${escapeHtml(material.description)}</p>
            <small>${escapeHtml(resolveName(state.appData.taxonomies.disciplines, material.disciplineId))} / ${escapeHtml(resolveName(state.appData.taxonomies.subjects, material.subjectId))}</small>
            <a class="secondary-button" href="${escapeHtml(material.url)}" target="_blank" rel="noreferrer">Abrir material</a>
          </article>`
                )
                .join("")
            : emptyState("Nenhum material cadastrado.")
        }
      </section>
    </div>
  `;
}
