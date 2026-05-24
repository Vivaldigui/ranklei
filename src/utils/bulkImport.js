import { slug, uid } from "./format.js";

const TRUE_WORDS = ["verdadeiro", "certo", "correto", "true", "sim"];
const FALSE_WORDS = ["falso", "errado", "errada", "incorreto", "incorreta", "false"];
const TRUE_EXACT = [...TRUE_WORDS, "v", "c", "1"];
const FALSE_EXACT = [...FALSE_WORDS, "f", "e", "0", "nao"];

export function parseBulkQuestions(rawText, appData, defaults = {}) {
  return parseBulkQuestionsWithReport(rawText, appData, defaults).questions;
}

export function parseBulkQuestionsWithReport(rawText, appData, defaults = {}) {
  const raw = String(rawText || "").trim();
  const context = createImportContext(appData, defaults);
  if (!raw) return { questions: [], taxonomies: context.taxonomies, createdTaxonomies: context.createdTaxonomies, totalRows: 0, skippedRows: 0 };

  if (raw.startsWith("[") || raw.startsWith("{")) {
    const questions = parseJson(raw, appData, context);
    return { questions, taxonomies: context.taxonomies, createdTaxonomies: context.createdTaxonomies, totalRows: questions.length, skippedRows: 0 };
  }

  const prepared = prepareDelimitedLines(raw);
  const lines = prepared.lines;
  if (!lines.length) return { questions: [], taxonomies: context.taxonomies, createdTaxonomies: context.createdTaxonomies, totalRows: 0, skippedRows: 0 };

  const delimiter = prepared.delimiter || detectDelimiter(lines[0]);
  const firstCells = splitDelimitedLine(lines[0], delimiter);
  const hasHeader = firstCells.some((cell) => ["pergunta", "questao", "enunciado", "statement", "gabarito", "resposta", "answer", "codigo", "codigo_lei", "lei", "front", "back"].includes(normalizeHeader(cell)));
  const rows = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader ? firstCells.map(normalizeHeader) : [];

  const questions = rows
    .map((line, index) => {
      const cells = splitDelimitedLine(line, delimiter);
      return hasHeader ? questionFromHeader(cells, headers, appData, index, context) : questionFromOrderedCells(cells, appData, index, context);
    })
    .filter(Boolean);

  return {
    questions,
    taxonomies: context.taxonomies,
    createdTaxonomies: context.createdTaxonomies,
    totalRows: rows.length,
    skippedRows: Math.max(0, rows.length - questions.length)
  };
}

function parseJson(raw, appData, context) {
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : parsed.questions || [];
  return items.map((item, index) => normalizeImportedQuestion(item, appData, index, context)).filter(Boolean);
}

function questionFromHeader(cells, headers, appData, index, context) {
  const value = (aliases) => {
    const keys = Array.isArray(aliases) ? aliases : [aliases];
    const position = headers.findIndex((header) => keys.includes(header));
    return position >= 0 ? cells[position] || "" : "";
  };

  return normalizeImportedQuestion(
    {
      id: value(["id", "identificador"]),
      number: value(["numero", "n"]),
      statement: value(["pergunta", "questao", "enunciado", "statement", "front", "frente"]),
      correctAnswer: value(["resposta", "resposta_certo_ou_errado", "gabarito", "answer", "verso", "back"]),
      explanation: value(["explicacao", "comentario", "comentario_oficial", "explanation", "verso", "back"]),
      lawCode: value(["codigo_lei", "codigo", "lei", "lawcode", "law"]),
      article: value(["artigo", "article"]),
      paragraph: value(["paragrafo", "paragraph", "§"]),
      inciso: value(["inciso", "inc", "item"]),
      discipline: value(["disciplina", "discipline"]),
      subject: value(["assunto", "subject"]),
      subSubject: value(["subassunto", "subsubject"]),
      year: value(["ano", "year"]),
      institution: value(["instituicao", "institution"]),
      position: value(["cargo", "position"])
    },
    appData,
    index,
    context
  );
}

function questionFromOrderedCells(cells, appData, index, context) {
  if (cells.length < 2) return null;
  const answerCellIndex = findAnswerCellIndex(cells.slice(1));
  const answerCell = answerCellIndex >= 0 ? cells[answerCellIndex + 1] : cells[1];
  const explanation = cells.length > 3 ? cells[2] || answerCell : cells.slice(1).join("\n");

  return normalizeImportedQuestion(
    {
      statement: cells[0],
      correctAnswer: answerCell,
      explanation: explanation || answerCell,
      lawCode: cells[3],
      article: cells[4],
      paragraph: cells[5],
      inciso: cells[6],
      discipline: cells[7],
      subject: cells[8],
      subSubject: cells[9],
      year: cells[10],
      institution: cells[11],
      position: cells[12]
    },
    appData,
    index,
    context
  );
}

function normalizeImportedQuestion(item, appData, index, context = createImportContext(appData)) {
  const statement = clean(item.statement || item.enunciado || item.front || item.frente || item.pergunta || item.questao);
  if (isTemplatePlaceholder(statement)) return null;
  const answerSource = item.correctAnswer ?? item.gabarito ?? item.answer ?? item.resposta ?? item.back ?? item.verso;
  const correctAnswer = parseBooleanAnswer(answerSource);
  if (!statement || correctAnswer === null) return null;

  const tax = context.taxonomies;
  const explicitId = clean(item.id);
  const lawCode = ensureTaxonomyItem(tax, "lawCodes", item.lawCode || item.codigo || item.codigoLei || item.lei || item.law || context.defaults.lawCode, "", {}, context);
  const disciplineId = ensureTaxonomyItem(tax, "disciplines", item.disciplineId || item.discipline || item.disciplina || context.defaults.disciplineId, tax.disciplines[0]?.id || "geral", {}, context);
  const subjectId = ensureSubject(tax, disciplineId, item.subjectId || item.subject || item.assunto || context.defaults.subjectId, context);
  const subSubjectId = ensureSubSubject(tax, subjectId, item.subSubjectId || item.subSubject || item.subassunto || context.defaults.subSubjectId, context);
  const now = new Date().toISOString();

  return {
    id: isUsableQuestionId(explicitId) ? explicitId : uid("q-import"),
    type: "true_false",
    number: Number(item.number || item.numero || 0) || appData.questions.length + index + 1,
    lawCode,
    article: clean(item.article || item.artigo || context.defaults.article),
    paragraph: clean(item.paragraph || item.paragrafo || context.defaults.paragraph),
    inciso: clean(item.inciso || item.inc || context.defaults.inciso),
    disciplineId,
    subjectId,
    subSubjectId,
    year: Number(item.year || item.ano || new Date().getFullYear()),
    institution: clean(item.institution || item.instituicao),
    position: clean(item.position || item.cargo),
    statement,
    correctAnswer,
    explanation: clean(item.explanation || item.explicacao || item.comentario || item.back || item.verso) || (correctAnswer ? "Gabarito: Verdadeiro." : "Gabarito: Falso."),
    source: "import",
    createdAt: now,
    updatedAt: now
  };
}

function parseBooleanAnswer(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  const normalized = normalize(stripHtml(value)).replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const labeled = normalized.match(/\b(?:gabarito|gab|resposta|answer|correta|correto)\s*(?:e|eh|:|-|=)?\s*(verdadeiro|falso|certo|errado|errada|correto|incorreto|incorreta|true|false|sim|nao|v|f|c|e|1|0)\b/);
  if (labeled) return answerTokenToBoolean(labeled[1]);

  const exact = normalized.replace(/[^a-z0-9]+/g, "");
  if (TRUE_EXACT.includes(exact)) return true;
  if (FALSE_EXACT.includes(exact)) return false;

  const tokens = normalized.match(/[a-z0-9]+/g) || [];
  if (!tokens.length) return null;

  const firstTokenAnswer = answerTokenToBoolean(tokens[0], false);
  if (firstTokenAnswer !== null) return firstTokenAnswer;

  const hasTrue = tokens.some((token) => TRUE_WORDS.includes(token));
  const hasFalse = tokens.some((token) => FALSE_WORDS.includes(token));
  if (hasTrue && !hasFalse) return true;
  if (hasFalse && !hasTrue) return false;
  return null;
}

function answerTokenToBoolean(token, allowShort = true) {
  const normalized = normalize(token).replace(/[^a-z0-9]+/g, "");
  if (TRUE_WORDS.includes(normalized) || (allowShort && ["v", "c", "1"].includes(normalized))) return true;
  if (FALSE_WORDS.includes(normalized) || normalized === "nao" || (allowShort && ["f", "e", "0"].includes(normalized))) return false;
  return null;
}

function prepareDelimitedLines(raw) {
  let delimiter = "";
  const lines = [];

  raw.split(/\r?\n/).forEach((line) => {
    const cleaned = line.replace(/^\uFEFF/, "").trim();
    if (!cleaned) return;

    const separator = cleaned.match(/^#separator:(.+)$/i);
    if (separator) {
      delimiter = separatorFromDirective(separator[1]);
      return;
    }

    if (cleaned.startsWith("#")) return;
    if (/^#(?:html|notetype|deck|tags column|guid column|columns?|notetype column):/i.test(cleaned)) return;
    lines.push(cleaned);
  });

  return { delimiter, lines };
}

function separatorFromDirective(value) {
  const normalized = normalize(value).trim();
  if (normalized === "tab" || normalized === "\\t") return "\t";
  if (normalized === "semicolon" || normalized === "ponto-e-virgula") return ";";
  if (normalized === "comma" || normalized === "virgula") return ",";
  if (value === "\\t") return "\t";
  return value || "";
}

function detectDelimiter(line) {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  return ",";
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function createImportContext(appData, defaults = {}) {
  return {
    defaults,
    taxonomies: cloneTaxonomies(appData.taxonomies || {}),
    createdTaxonomies: {
      disciplines: 0,
      subjects: 0,
      subSubjects: 0,
      lawCodes: 0
    }
  };
}

function cloneTaxonomies(taxonomies = {}) {
  return {
    disciplines: [...(taxonomies.disciplines || [])],
    subjects: [...(taxonomies.subjects || [])],
    subSubjects: [...(taxonomies.subSubjects || [])],
    lawCodes: [...(taxonomies.lawCodes || [])],
    positions: [...(taxonomies.positions || [])]
  };
}

function ensureTaxonomyItem(tax, collectionName, value, fallback, extra = {}, context) {
  const cleaned = clean(value);
  if (!cleaned) return fallback;
  const collection = tax[collectionName] || [];
  const normalized = normalize(cleaned);
  const found = collection.find((item) => normalize(item.id) === normalized || normalize(item.name) === normalized);
  if (found) return found.id;

  const id = uniqueTaxonomyId(collection, slug(cleaned) || fallback || "item");
  collection.push({ id, name: cleaned, ...extra });
  tax[collectionName] = collection;
  if (context?.createdTaxonomies && collectionName in context.createdTaxonomies) {
    context.createdTaxonomies[collectionName] += 1;
  }
  return id;
}

function ensureSubject(tax, disciplineId, value, context) {
  const cleaned = clean(value);
  const items = tax.subjects || [];
  const fallback = items.find((item) => item.disciplineId === disciplineId)?.id || items[0]?.id || "geral";
  if (!cleaned) return fallback;
  const found = items.find((item) => (item.id === cleaned || normalize(item.name) === normalize(cleaned)) && (!item.disciplineId || item.disciplineId === disciplineId));
  if (found) return found.id;

  const id = uniqueTaxonomyId(items, `${disciplineId}-${slug(cleaned)}` || slug(cleaned) || "assunto");
  items.push({ id, disciplineId, name: cleaned });
  tax.subjects = items;
  if (context?.createdTaxonomies) context.createdTaxonomies.subjects += 1;
  return id;
}

function ensureSubSubject(tax, subjectId, value, context) {
  const cleaned = clean(value);
  const items = tax.subSubjects || [];
  const fallback = items.find((item) => item.subjectId === subjectId)?.id || items[0]?.id || "geral";
  if (!cleaned) return fallback;
  const found = items.find((item) => (item.id === cleaned || normalize(item.name) === normalize(cleaned)) && (!item.subjectId || item.subjectId === subjectId));
  if (found) return found.id;

  const id = uniqueTaxonomyId(items, `${subjectId}-${slug(cleaned)}` || slug(cleaned) || "subassunto");
  items.push({ id, subjectId, name: cleaned });
  tax.subSubjects = items;
  if (context?.createdTaxonomies) context.createdTaxonomies.subSubjects += 1;
  return id;
}

function uniqueTaxonomyId(items, baseId) {
  let id = baseId;
  let suffix = 2;
  while (items.some((item) => item.id === id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function clean(value) {
  return stripHtml(value).trim();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ");
}

function normalize(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeHeader(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function isTemplatePlaceholder(statement) {
  const normalized = normalize(statement);
  return normalized.startsWith("cole aqui o enunciado") || normalized.startsWith("digite aqui o enunciado");
}

function findAnswerCellIndex(cells) {
  return cells.findIndex((cell) => parseBooleanAnswer(cell) !== null);
}

function isUsableQuestionId(value) {
  return /^[a-z0-9][a-z0-9_-]{1,}$/i.test(String(value || "").trim());
}
