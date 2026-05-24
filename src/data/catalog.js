export const disciplines = [
  { id: "constitucional", name: "Direito Constitucional" },
  { id: "administrativo", name: "Direito Administrativo" },
  { id: "penal", name: "Direito Penal" },
  { id: "civil", name: "Direito Civil" },
  { id: "processo-civil", name: "Processo Civil" }
];

export const subjects = [
  { id: "direitos-fundamentais", disciplineId: "constitucional", name: "Direitos Fundamentais" },
  { id: "administracao-publica", disciplineId: "administrativo", name: "Administracao Publica" },
  { id: "licitacoes", disciplineId: "administrativo", name: "Licitacoes e Contratos" },
  { id: "iter-criminis", disciplineId: "penal", name: "Iter Criminis" },
  { id: "responsabilidade-civil", disciplineId: "civil", name: "Responsabilidade Civil" },
  { id: "tutela-provisoria", disciplineId: "processo-civil", name: "Tutela Provisoria" }
];

export const subSubjects = [
  { id: "art-5", subjectId: "direitos-fundamentais", name: "Art. 5" },
  { id: "principios-adm", subjectId: "administracao-publica", name: "Principios da Administracao" },
  { id: "fase-preparatoria", subjectId: "licitacoes", name: "Fase preparatoria" },
  { id: "tentativa", subjectId: "iter-criminis", name: "Tentativa" },
  { id: "ato-ilicito", subjectId: "responsabilidade-civil", name: "Ato ilicito" },
  { id: "urgencia", subjectId: "tutela-provisoria", name: "Tutela de urgencia" }
];

export const lawCodes = [
  { id: "cf", name: "Constituicao Federal" },
  { id: "lei-14133", name: "Lei 14.133/2021" },
  { id: "cp", name: "Codigo Penal" },
  { id: "cc", name: "Codigo Civil" },
  { id: "cpc", name: "Codigo de Processo Civil" }
];

export const institutions = ["TJ-CE", "TRF", "INSS", "Receita Federal", "Policia Civil"];
export const positions = ["Analista", "Tecnico", "Oficial de Justica", "Auditor", "Delegado"];

export const materials = [
  {
    id: "mat-cf",
    title: "Constituicao Federal - artigos essenciais",
    disciplineId: "constitucional",
    subjectId: "direitos-fundamentais",
    description: "Roteiro de leitura dos artigos mais cobrados em provas objetivas.",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm"
  },
  {
    id: "mat-14133",
    title: "Lei 14.133/2021 - mapa de licitacoes",
    disciplineId: "administrativo",
    subjectId: "licitacoes",
    description: "Consulta externa ao texto atualizado da nova lei de licitacoes.",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"
  },
  {
    id: "mat-cp",
    title: "Codigo Penal - parte geral",
    disciplineId: "penal",
    subjectId: "iter-criminis",
    description: "Leitura guiada para tentativa, desistencias e consumacao.",
    url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm"
  }
];

export const mockRankingUsers = [
  { id: "u-ana", name: "Ana Paula", points: 480, totalAnswered: 260, totalCorrect: 196, streak: 18 },
  { id: "u-bruno", name: "Bruno Lima", points: 430, totalAnswered: 220, totalCorrect: 162, streak: 11 },
  { id: "u-carol", name: "Carolina Dias", points: 390, totalAnswered: 180, totalCorrect: 139, streak: 8 },
  { id: "u-diego", name: "Diego Alves", points: 340, totalAnswered: 160, totalCorrect: 112, streak: 5 }
];
