import { icon } from "./components.js";
import { escapeHtml } from "../utils/format.js";

const dashboardItems = [
  { route: "dashboard", label: "Meu desempenho", icon: "target" }
];

const vadeMecumItems = [
  { route: "questions", label: "Acessar questoes", icon: "search" },
  { route: "notebooks", label: "Cadernos", icon: "notebook" },
  { route: "simulados", label: "Simulados", icon: "clipboard-list" },
  { route: "disciplinas", label: "Disciplinas", icon: "book-open" },
  { route: "ranking", label: "Rankings", icon: "trophy" },
  { route: "saved-filters", label: "Filtros salvos", icon: "bookmark" },
  { route: "materials", label: "Materiais", icon: "file-text" },
  { route: "xray", label: "Raio-X da Lei Seca", icon: "activity" }
];

export function renderShell(state, content) {
  const isDark = state.theme === "dark";
  const themeLabel = isDark ? "Modo claro" : "Modo escuro";
  const vadeOpen = Boolean(state.expandedPanels?.["menu:vade"]);
  const vadeActive = vadeMecumItems.some((item) => item.route === state.route);
  return `
    <div class="private-shell ${state.drawerOpen ? "drawer-open" : ""}">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-orb">RL</span>
          <div>
            <strong>RankLei</strong>
            <small>Lei seca e questoes</small>
          </div>
        </div>
        <nav class="side-nav">
          <section>
            <p>Dashboard</p>
            ${dashboardItems.map((item) => navItem(item, state.route)).join("")}
          </section>
          <section>
            <button class="nav-link nav-parent ${vadeActive ? "active-parent" : ""}" data-action="toggle-panel" data-panel="menu:vade" aria-expanded="${vadeOpen}">
              ${icon("library-big")}
              <span>Vade Mecum de Questoes</span>
              <span class="nav-caret">${icon(vadeOpen ? "chevron-up" : "chevron-down")}</span>
            </button>
            ${vadeOpen ? `<div class="nav-submenu">${vadeMecumItems.map((item) => navItem(item, state.route, true)).join("")}</div>` : ""}
          </section>
        </nav>
      </aside>
      <div class="drawer-backdrop" data-action="toggle-drawer"></div>
      <main class="workspace">
        <header class="topbar">
          <button class="icon-button mobile-menu" data-action="toggle-drawer" aria-label="Abrir menu">${icon("menu")}</button>
          <div>
            <span class="eyebrow">Concursos publicos</span>
            <h1>${escapeHtml(pageTitle(state.route))}</h1>
          </div>
          <div class="user-menu">
            <span class="sync-pill">${escapeHtml(state.syncStatus || "Local")}</span>
            <span class="avatar">${escapeHtml((state.user?.name || "U").slice(0, 1).toUpperCase())}</span>
            <div>
              <strong>${escapeHtml(state.user?.name || "Usuario")}</strong>
              <small>${escapeHtml(state.user?.email || "")}</small>
            </div>
            <button class="icon-button" data-action="toggle-theme" title="${themeLabel}" aria-label="${themeLabel}">${icon(isDark ? "sun" : "moon")}</button>
            <button class="icon-button" data-action="logout" title="Sair">${icon("log-out")}</button>
          </div>
        </header>
        <section class="content-area">${content}</section>
      </main>
    </div>
  `;
}

function navItem(item, activeRoute, isSubmenu = false) {
  const active = item.route === activeRoute ? "active" : "";
  return `
    <button class="nav-link ${isSubmenu ? "nav-subitem" : ""} ${active}" data-route="${item.route}">
      ${icon(item.icon)}
      <span>${escapeHtml(item.label)}</span>
    </button>
  `;
}

function pageTitle(route) {
  const titles = {
    dashboard: "Meu desempenho",
    ranking: "Minha posicao no ranking",
    questions: "Vade Mecum de Questoes",
    notebooks: "Cadernos",
    simulados: "Simulados",
    disciplinas: "Disciplinas",
    "saved-filters": "Filtros salvos",
    materials: "Materiais",
    xray: "Raio-X da Lei Seca"
  };
  return titles[route] || "RankLei";
}
