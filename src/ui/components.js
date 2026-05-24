import { escapeHtml } from "../utils/format.js";

export function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

export function selectField({ label, name, value = "", options = [], placeholder = "Todos" }) {
  const entries = [{ value: "", label: placeholder }, ...options.map(normalizeOption)];
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}" data-filter="${escapeHtml(name)}">
        ${entries
          .map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
          .join("")}
      </select>
    </label>
  `;
}

export function inputField({ label, name, value = "", placeholder = "", type = "text", required = false }) {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${required ? "required" : ""} />
    </label>
  `;
}

export function metricCard({ iconName, label, value, tone = "blue" }) {
  return `
    <article class="metric-card">
      <span class="metric-icon ${tone}">${icon(iconName)}</span>
      <div>
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
    </article>
  `;
}

export function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

export function badge(label, tone = "neutral") {
  return `<span class="badge ${tone}">${escapeHtml(label)}</span>`;
}

export function progressBar(value, label = "") {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return `
    <div class="progress-line" aria-label="${escapeHtml(label)}">
      <span style="--value:${safe}%"></span>
    </div>
  `;
}

function normalizeOption(option) {
  if (typeof option === "string" || typeof option === "number") return { value: option, label: option };
  return option;
}
