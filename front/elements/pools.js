/**
 * Pools panel and mock data for TTC-IP dApp
 */
export const mockPools = [
  { country: "KE", provider: "Safaricom", tvl: "1.2M", yield: "12%", active: true },
  { country: "NG", provider: "MTN", tvl: "0.8M", yield: "8%", active: true },
  { country: "GH", provider: "Vodafone", tvl: "0.5M", yield: "—", active: true },
  { country: "TZ", provider: "Airtel", tvl: "0.3M", yield: "5%", active: false },
];

export function renderPoolsPanel(filters = {}) {
  const { country = "", currency = "" } = filters;
  const filtered = mockPools.filter((p) => {
    if (country && !p.country.toLowerCase().includes(country.toLowerCase())) return false;
    return true;
  });
  return `
    <div class="dash-filters">
      <select class="dash-filter__select" data-filter="country" aria-label="Filter by country">
        <option value="">All countries</option>
        ${[...new Set(mockPools.map((p) => p.country))].map((c) => `<option value="${c}" ${country === c ? "selected" : ""}>${c}</option>`).join("")}
      </select>
      <select class="dash-filter__select" data-filter="currency" aria-label="Filter by currency">
        <option value="">All</option>
        <option value="USDC" ${currency === "USDC" ? "selected" : ""}>USDC</option>
      </select>
    </div>
    <ul class="pools-list">
      ${filtered.map((p) => `
        <li class="pools-list__item">
          <span class="pools-list__meta">${p.country} · ${p.provider}</span>
          <span class="pools-list__tvl">${p.tvl}</span>
          <span class="pools-list__yield">${p.yield}</span>
          <span class="pools-list__status">${p.active ? "Live" : "Soon"}</span>
        </li>
      `).join("")}
    </ul>
  `;
}
