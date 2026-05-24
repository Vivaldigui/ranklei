import { initAuth, logout, onAuthChange, registerWithEmail, signInAsDemo, signInWithEmail, signInWithGoogle } from "./services/authService.js";
import { loadUserData } from "./services/dataService.js";
import {
  addComment,
  addQuestionToNotebook,
  answerQuestion,
  applySavedFilter,
  clearFilters,
  clearHistory,
  createNotebook,
  deleteSavedFilter,
  getState,
  moveFocusQuestion,
  reportQuestion,
  saveCurrentFilter,
  setAuthMode,
  setRankingPeriod,
  setRoute,
  setSelectedAnswer,
  setUser,
  subscribe,
  toggleDrawer,
  toggleFiltersPanel,
  toggleFocusMode,
  toggleTheme,
  togglePanel,
  updateFilter
} from "./state/store.js";
import { renderShell } from "./ui/layout.js";
import { renderLanding } from "./views/landingView.js";
import { renderDashboard } from "./views/dashboardView.js";
import { renderQuestions } from "./views/questionsView.js";
import { renderRanking } from "./views/rankingView.js";
import { renderNotebooks } from "./views/notebooksView.js";
import { renderMaterials } from "./views/materialsView.js";
import { renderXray } from "./views/xrayView.js";
import { renderPlaceholder, renderSavedFilters } from "./views/simpleViews.js";

const app = document.getElementById("app");
const toast = document.getElementById("toast");

bootstrap();

async function bootstrap() {
  registerServiceWorker();
  subscribe(renderApp);
  bindGlobalEvents();
  await initAuth();
  onAuthChange(async (user) => {
    if (!user) {
      setUser(null, null);
      return;
    }
    const data = await loadUserData(user);
    setUser(user, data);
  });
  renderApp(getState());
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker indisponivel.", error);
    });
  });
}

function renderApp(state) {
  document.documentElement.dataset.theme = state.theme || "light";
  const content = state.user ? renderPrivateContent(state) : renderLanding(state);
  app.innerHTML = state.user ? renderShell(state, content) : content;
  if (window.lucide) window.lucide.createIcons();
}

function renderPrivateContent(state) {
  const routes = {
    dashboard: renderDashboard,
    questions: renderQuestions,
    ranking: renderRanking,
    notebooks: renderNotebooks,
    materials: renderMaterials,
    xray: renderXray,
    "saved-filters": renderSavedFilters
  };
  if (routes[state.route]) return routes[state.route](state);
  if (state.route === "simulados") return renderPlaceholder("Simulados", "Area preparada para provas com tempo, nota e ranking.");
  if (state.route === "disciplinas") return renderPlaceholder("Disciplinas", "Estrutura de disciplinas, assuntos e subassuntos pronta para curadoria.");
  return renderDashboard(state);
}

function bindGlobalEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("change", handleChange);
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchend", handleTouchEnd, { passive: true });
}

async function handleClick(event) {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    setRoute(routeButton.dataset.route);
    return;
  }

  const authButton = event.target.closest("[data-auth-mode]");
  if (authButton) {
    setAuthMode(authButton.dataset.authMode);
    document.querySelector(".auth-card-public")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const scrollButton = event.target.closest("[data-scroll-target]");
  if (scrollButton) {
    document.getElementById(scrollButton.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  const filterButton = event.target.closest("button[data-filter][data-value]");
  if (filterButton) {
    updateFilter(filterButton.dataset.filter, filterButton.dataset.value);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  const periodButton = event.target.closest("[data-ranking-period]");
  if (periodButton) {
    setRankingPeriod(periodButton.dataset.rankingPeriod);
    return;
  }
  if (!actionButton) return;

  const action = actionButton.dataset.action;
  if (action === "toggle-drawer") toggleDrawer();
  if (action === "toggle-filters-panel") toggleFiltersPanel();
  if (action === "toggle-focus-mode") toggleFocusMode();
  if (action === "focus-prev") moveFocusQuestion(-1, Number(actionButton.closest("[data-total]")?.dataset.total || 0));
  if (action === "focus-next") moveFocusQuestion(1, Number(actionButton.closest("[data-total]")?.dataset.total || 0));
  if (action === "toggle-theme") toggleTheme();
  if (action === "logout") await logout();
  if (action === "google-login") await runAuth(() => signInWithGoogle());
  if (action === "demo-login") await runAuth(() => signInAsDemo());
  if (action === "clear-filters") clearFilters();
  if (action === "save-filter") saveFilter();
  if (action === "select-answer") setSelectedAnswer(actionButton.dataset.questionId, actionButton.dataset.answer);
  if (action === "answer-question") answer(actionButton.dataset.questionId);
  if (action === "toggle-panel") togglePanel(actionButton.dataset.panel);
  if (action === "add-to-notebook") addToNotebook(actionButton.dataset.questionId);
  if (action === "add-private-note") addPrivateNote(actionButton.dataset.questionId);
  if (action === "report-question") report(actionButton.dataset.questionId);
  if (action === "use-filter") {
    applySavedFilter(actionButton.dataset.filterId);
    setRoute("questions");
  }
  if (action === "delete-filter") deleteSavedFilter(actionButton.dataset.filterId);
  if (action === "clear-history" && window.confirm("Limpar seu historico local de respostas?")) clearHistory();
  if (action === "refresh") showToast("Painel atualizado.");
}

async function handleSubmit(event) {
  const form = event.target.closest("form");
  if (!form) return;
  const formType = form.dataset.form;
  if (!formType) return;
  event.preventDefault();

  if (formType === "login") {
    const data = Object.fromEntries(new FormData(form));
    await runAuth(() => signInWithEmail(data.email, data.password));
  }

  if (formType === "register") {
    const data = Object.fromEntries(new FormData(form));
    await runAuth(() => registerWithEmail(data));
  }

  if (formType === "filters") {
    showToast("Filtros aplicados.");
  }

  if (formType === "comment") {
    const data = Object.fromEntries(new FormData(form));
    addComment(form.dataset.questionId, data.text, false);
    form.reset();
    showToast("Comentario adicionado.");
  }

  if (formType === "notebook") {
    const data = Object.fromEntries(new FormData(form));
    createNotebook(data.name, data.description || "");
    form.reset();
    showToast("Caderno criado.");
  }

}

function handleChange(event) {
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    const name = filter.dataset.filter;
    const value = filter.dataset.value ?? filter.value;
    if (name === "savedFilterId" && value) {
      applySavedFilter(value);
      return;
    }
    updateFilter(name, value);
  }

}

let touchStart = null;

function handleTouchStart(event) {
  const zone = event.target.closest("[data-swipe-zone='questions']");
  if (!zone || !getState().focusMode) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  touchStart = { x: touch.clientX, y: touch.clientY, total: Number(zone.dataset.total || 0) };
}

function handleTouchEnd(event) {
  if (!touchStart || !getState().focusMode) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    moveFocusQuestion(dx < 0 ? 1 : -1, touchStart.total);
  }
  touchStart = null;
}

function saveFilter() {
  const name = window.prompt("Nome do filtro salvo:");
  if (!name) return;
  saveCurrentFilter(name);
  showToast("Filtro salvo.");
}

function answer(questionId) {
  const result = answerQuestion(questionId);
  showToast(result.ok ? (result.isCorrect ? "Resposta correta." : "Resposta incorreta.") : result.message);
}

function addToNotebook(questionId) {
  const state = getState();
  let notebook = state.appData.notebooks[0];
  if (!notebook) {
    const name = window.prompt("Nome do novo caderno:", "Revisar depois");
    if (!name) return;
    createNotebook(name, "Criado a partir de uma questao.");
    notebook = getState().appData.notebooks[0];
  }
  addQuestionToNotebook(questionId, notebook.id);
  showToast(`Questao adicionada ao caderno ${notebook.name}.`);
}

function addPrivateNote(questionId) {
  const text = window.prompt("Anotacao privada:");
  if (!text) return;
  addComment(questionId, text, true);
  showToast("Anotacao salva.");
}

function report(questionId) {
  const description = window.prompt("Descreva o erro encontrado:");
  if (!description) return;
  reportQuestion(questionId, description);
  showToast("Reporte enviado para revisao.");
}

async function runAuth(fn) {
  try {
    await fn();
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel autenticar. Verifique o metodo ou use modo de teste.");
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}
