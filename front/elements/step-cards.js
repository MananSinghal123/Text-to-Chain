/**
 * Step cards component for onboarding / feature steps
 */
export function renderStepCards(steps = []) {
  if (!steps.length) return "";
  return steps.map((s, i) => `
    <div class="step-card" data-step="${i + 1}">
      <div class="step-card__title">${s.title || `Step ${i + 1}`}</div>
      <div class="step-card__desc">${s.desc || ""}</div>
    </div>
  `).join("");
}
