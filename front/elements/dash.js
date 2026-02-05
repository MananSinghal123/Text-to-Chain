/**
 * Dashboard / overview panel content for TTC-IP dApp
 */
export function renderDashContent() {
  return `
    <div class="dash-panel">
      <section class="dash-section">
        <h2 class="dash-section__title">Overview</h2>
        <p class="dash-section__text">Protocol stats and active pools. Phone credit → chain.</p>
      </section>
      <section class="dash-section">
        <h2 class="dash-section__title">Tokenized assets</h2>
        <p class="dash-section__text">Local balance tokenization — the primitive for SMS DeFi.</p>
      </section>
      <section class="dash-section">
        <h2 class="dash-section__title">Yield</h2>
        <p class="dash-section__text">Pool yield and fee data. Connect wallet or use Mobile (OTC) to join.</p>
      </section>
    </div>
  `;
}
