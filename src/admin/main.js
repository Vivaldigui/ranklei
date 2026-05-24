import { initAuth, isAdminUser, logout, onAuthChange, signInAdminWithEmail } from "../services/authService.js";
import { deleteQuestionFromCloud, loadUserData } from "../services/dataService.js";
import {
  addDiscipline,
  addSubject,
  addSubSubject,
  deleteQuestion,
  getState,
  importQuestionsBatch,
  setUser,
  subscribe,
  upsertQuestion
} from "../state/store.js";
import { renderAdmin } from "../views/adminView.js";
import { icon } from "../ui/components.js";
import { escapeHtml, uid } from "../utils/format.js";
import { parseBulkQuestionsWithReport } from "../utils/bulkImport.js";

const app = document.getElementById("admin-app");
const toast = document.getElementById("toast");

const ui = {
  loading: true,
  message: ""
};

bootstrap();

async function bootstrap() {
  subscribe(renderApp);
  bindEvents();
  await initAuth();
  onAuthChange(handleAuthChange);
}

async function handleAuthChange(user) {
  ui.loading = true;
  renderApp(getState());

  if (!user || user.provider !== "firebase") {
    setUser(null, null);
    ui.loading = false;
    renderApp(getState());
    return;
  }

  if (!isAdminUser(user)) {
    setUser(null, null);
    ui.message = "Este e-mail nao tem permissao de administrador.";
    ui.loading = false;
    renderApp(getState());
    return;
  }

  const data = await loadUserData(user);
  setUser(user, data);
  ui.message = "";
  ui.loading = false;
  renderApp(getState());
}

function renderApp(state) {
  if (document.documentElement) document.documentElement.dataset.theme = "light";
  if (ui.loading) {
    app.innerHTML = `
      <div class="boot-screen">
        <span class="brand-orb">RL</span>
        <strong>Carregando painel admin...</strong>
      </div>
    `;
  } else if (!state.user || !state.isAdmin) {
    app.innerHTML = renderAdminLogin();
  } else {
    app.innerHTML = renderAdminShell(state, renderAdmin(state));
  }
  if (window.lucide) window.lucide.createIcons();
}

function renderAdminLogin() {
  return `
    <main class="admin-login-page">
      <section class="auth-card-public admin-login-card">
        <div>
          <span class="eyebrow">RankLei Admin</span>
          <h1>Painel de conteudo</h1>
          <p>Entre com e-mail e senha de uma conta administradora para cadastrar questoes, disciplinas, assuntos e subassuntos.</p>
          ${ui.message ? `<div class="empty-state">${escapeHtml(ui.message)}</div>` : ""}
          <a class="ghost-button" href="./">${icon("arrow-left")}Voltar ao site</a>
        </div>
        <form class="auth-form" data-admin-form="login">
          <label class="field">
            <span>E-mail admin</span>
            <input name="email" type="email" autocomplete="username" required placeholder="admin@ranklei.com" />
          </label>
          <label class="field">
            <span>Senha</span>
            <input name="password" type="password" autocomplete="current-password" required placeholder="Senha do Firebase Auth" />
          </label>
          <button class="primary-button" type="submit">${icon("lock-keyhole")}Entrar no painel</button>
        </form>
      </section>
    </main>
  `;
}

function renderAdminShell(state, content) {
  return `
    <div class="private-shell admin-portal-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-orb">RL</span>
          <div>
            <strong>RankLei Admin</strong>
            <small>Conteudo e taxonomias</small>
          </div>
        </div>
        <nav class="side-nav">
          <section>
            <p>Painel separado</p>
            <button class="nav-link active" type="button">${icon("shield-check")}<span>Administracao</span></button>
            <a class="nav-link" href="./">${icon("external-link")}<span>Ir para o site</span></a>
          </section>
        </nav>
      </aside>
      <main class="workspace">
        <header class="topbar">
          <div>
            <span class="eyebrow">Acesso administrativo</span>
            <h1>Cadastro de conteudo</h1>
          </div>
          <div class="user-menu">
            <span class="sync-pill">Firebase</span>
            <span class="avatar">${escapeHtml((state.user?.name || "A").slice(0, 1).toUpperCase())}</span>
            <div>
              <strong>${escapeHtml(state.user?.name || "Admin")}</strong>
              <small>${escapeHtml(state.user?.email || "")}</small>
            </div>
            <button class="icon-button" data-admin-action="logout" title="Sair">${icon("log-out")}</button>
          </div>
        </header>
        <section class="content-area">${content}</section>
      </main>
    </div>
  `;
}

function bindEvents() {
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("click", handleClick);
}

async function handleSubmit(event) {
  const loginForm = event.target.closest("[data-admin-form='login']");
  if (loginForm) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm));
    await runAdminAuth(data.email, data.password);
    return;
  }

  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  const formType = form.dataset.form;
  if (formType === "admin-question") saveQuestion(form);
  if (formType === "discipline") saveDiscipline(form);
  if (formType === "subject") saveSubject(form);
  if (formType === "subsubject") saveSubSubject(form);
  if (formType === "bulk-import") await importBulk(form);
}

async function handleClick(event) {
  const actionButton = event.target.closest("[data-admin-action]");
  if (actionButton?.dataset.adminAction === "logout") {
    await logout();
    ui.message = "Sessao administrativa encerrada.";
    showToast("Sessao encerrada.");
    return;
  }

  const deleteButton = event.target.closest("[data-action='delete-admin-question']");
  if (deleteButton) {
    const questionId = deleteButton.dataset.questionId;
    if (!window.confirm("Excluir esta questao do painel e do Firebase?")) return;
    const user = getState().user;
    deleteQuestion(questionId);
    await deleteQuestionFromCloud(user, questionId);
    showToast("Questao excluida.");
  }
}

async function runAdminAuth(email, password) {
  try {
    const user = await signInAdminWithEmail(email, password);
    if (!isAdminUser(user)) {
      ui.message = "Login feito, mas este e-mail nao esta na lista de administradores.";
      await logout();
      renderApp(getState());
      return;
    }
    showToast("Login administrativo confirmado.");
  } catch (error) {
    console.error(error);
    ui.message = "Nao foi possivel entrar. Confira e-mail, senha e se o metodo E-mail/Senha esta ativo no Firebase.";
    renderApp(getState());
  }
}

function saveQuestion(form) {
  const data = Object.fromEntries(new FormData(form));
  upsertQuestion({
    id: data.id || uid("q"),
    type: "true_false",
    number: getState().appData.questions.length + 1,
    lawCode: data.lawCode,
    article: data.article,
    disciplineId: data.disciplineId,
    subjectId: data.subjectId,
    subSubjectId: data.subSubjectId,
    year: Number(data.year || new Date().getFullYear()),
    institution: data.institution,
    position: data.position,
    statement: data.statement,
    correctAnswer: data.correctAnswer === "true",
    explanation: data.explanation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  form.reset();
  showToast("Questao salva no painel admin.");
}

function saveDiscipline(form) {
  const data = Object.fromEntries(new FormData(form));
  addDiscipline(data.name);
  form.reset();
  showToast("Disciplina adicionada.");
}

function saveSubject(form) {
  const data = Object.fromEntries(new FormData(form));
  addSubject(data.disciplineId, data.name);
  form.reset();
  showToast("Assunto adicionado.");
}

function saveSubSubject(form) {
  const data = Object.fromEntries(new FormData(form));
  addSubSubject(data.subjectId, data.name);
  form.reset();
  showToast("Subassunto adicionado.");
}

async function importBulk(form) {
  const data = Object.fromEntries(new FormData(form));
  const file = form.querySelector('input[name="bulkFile"]')?.files?.[0];
  try {
    const source = file ? await file.text() : data.bulkText;
    const result = parseBulkQuestionsWithReport(source, getState().appData);
    if (!result.questions.length) {
      showToast("Nenhuma questao valida encontrada no lote.");
      return;
    }
    await importQuestionsBatch(result.questions, result.taxonomies);
    form.reset();
    showToast(`${result.questions.length} questoes importadas e salvas no Firebase${taxonomySummary(result.createdTaxonomies)}${result.skippedRows ? `; ${result.skippedRows} linhas ignoradas` : ""}.`);
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel salvar o lote no Firebase. Confira permissoes e tente novamente.");
  }
}

function taxonomySummary(created = {}) {
  const total = Number(created.disciplines || 0) + Number(created.subjects || 0) + Number(created.subSubjects || 0) + Number(created.lawCodes || 0);
  if (!total) return "";
  return `; ${total} cadastros criados`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}
