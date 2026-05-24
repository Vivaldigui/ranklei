import { icon } from "../ui/components.js";

export function renderLanding(state) {
  const isRegister = state.authMode === "register";
  const isDark = state.theme === "dark";
  const themeLabel = isDark ? "Modo claro" : "Modo escuro";
  return `
    <div class="public-page">
      <header class="public-header">
        <div class="sidebar-brand">
          <span class="brand-orb">RL</span>
          <div>
            <strong>RankLei</strong>
            <small>Estudo orientado por dados</small>
          </div>
        </div>
        <nav>
          <button class="ghost-button theme-toggle" data-action="toggle-theme" title="${themeLabel}">${icon(isDark ? "sun" : "moon")}${themeLabel}</button>
          <button class="ghost-button" data-scroll-target="features">Conhecer recursos</button>
          <a class="ghost-button" href="./admin.html">Painel admin</a>
          <button class="secondary-button" data-auth-mode="login">Entrar</button>
          <button class="primary-button" data-auth-mode="register">Criar conta</button>
        </nav>
      </header>

      <section class="hero-section">
        <div class="hero-copy">
          <span class="eyebrow">Lei seca + questoes certo/errado + ranking</span>
          <h1>Estude como quem esta medindo cada ponto ate a aprovacao.</h1>
          <p>Uma plataforma para ler lei seca, resolver questoes, acompanhar desempenho, revisar erros e competir em rankings sem perder clareza.</p>
          <div class="hero-actions">
            <button class="primary-button" data-auth-mode="login">${icon("log-in")}Entrar</button>
            <button class="secondary-button" data-auth-mode="register">${icon("user-plus")}Criar conta</button>
            <button class="ghost-button" data-scroll-target="features">${icon("sparkles")}Conhecer recursos</button>
          </div>
        </div>
        <div class="hero-panel">
          <div class="panel-header">
            <span>Meu desempenho</span>
            <strong>66%</strong>
          </div>
          <div class="hero-bars">
            <span style="--height:38%"></span>
            <span style="--height:72%"></span>
            <span style="--height:52%"></span>
            <span style="--height:88%"></span>
            <span style="--height:64%"></span>
          </div>
          <div class="hero-question">
            <small>[Art. 37, CF] Principios da Administracao Publica</small>
            <p>A administracao publica direta e indireta obedece aos principios de legalidade, impessoalidade, moralidade, publicidade e eficiencia.</p>
            <div>
              <button>Verdadeiro</button>
              <button>Falso</button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="public-grid">
        <article>
          ${icon("filter")}
          <h2>Como funciona</h2>
          <p>Escolha lei, disciplina, assunto, ano, cargo, instituicao e dificuldade. Resolva questoes certo/errado e acompanhe o resultado em tempo real.</p>
        </article>
        <article>
          ${icon("bar-chart-3")}
          <h2>Recursos principais</h2>
          <p>Dashboard, ranking, filtros salvos, cadernos, comentarios, anotacoes privadas, materiais e Raio-X da Lei Seca.</p>
        </article>
        <article>
          ${icon("target")}
          <h2>Beneficios</h2>
          <p>Voce descobre onde erra, quais artigos mais caem e quais questoes ainda nao tem amostragem suficiente.</p>
        </article>
      </section>

      <section class="auth-card-public">
        <div>
          <span class="eyebrow">${isRegister ? "Cadastro" : "Login"}</span>
          <h2>${isRegister ? "Crie sua conta" : "Acesse sua area de estudos"}</h2>
          <p>Use e-mail e senha, Google ou o modo de teste para conhecer o fluxo completo.</p>
        </div>
        <form class="auth-form" data-form="${isRegister ? "register" : "login"}">
          ${isRegister ? '<input name="name" placeholder="Nome completo" required />' : ""}
          <input name="email" type="email" placeholder="E-mail" required />
          <input name="password" type="password" placeholder="Senha" required minlength="6" />
          <button class="primary-button" type="submit">${isRegister ? "Criar conta" : "Entrar"}</button>
          <button class="secondary-button" type="button" data-action="google-login">${icon("globe")}Entrar com Google</button>
          <button class="ghost-button" type="button" data-action="demo-login">Entrar em modo de teste</button>
        </form>
      </section>
    </div>
  `;
}
