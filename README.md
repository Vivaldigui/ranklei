# RankLei

Plataforma estatica modular para estudo de lei seca e questoes de Certo ou Errado.

## Fluxo

Landing page -> Login/Cadastro -> Dashboard -> Vade Mecum de Questoes -> Ranking/Estatisticas.

## Estrutura

```text
src/
  data/       dados mockados e catalogos
  services/   autenticacao Firebase/local e persistencia
  state/      store, regras de negocio e seletores
  ui/         layout e componentes reutilizaveis
  utils/      formatacao e calculo de dificuldade
  views/      telas da aplicacao
```

## Rodar localmente

```cmd
cd /d "C:\Users\Users\Documents\New project"
node server.js
```

Abra:

```text
http://localhost:5500
```

## Firebase

O projeto usa `firebase-config.js` para Auth e Firestore quando disponivel. Se o Firebase falhar ou o metodo de login nao estiver habilitado, o app mantem um modo de teste local.

Admin inicial:

```text
gui.rib.pi@gmail.com
```

## Deploy

```cmd
firebase deploy --only hosting,firestore:rules
```
