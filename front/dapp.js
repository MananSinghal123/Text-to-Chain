import { renderDashContent } from "./elements/dash.js";
import { renderPoolsPanel, mockPools } from "./elements/pools.js";

const dappContent = document.getElementById("dapp-content");
const sidebarStats = document.getElementById("dapp-sidebar-stats");

const LOGIN_KEY = "ttc-login";

function isLoggedIn() {
  return !!localStorage.getItem(LOGIN_KEY);
}

function updateNavAuth() {
  const loginBtn = document.getElementById("nav-login");
  const walletLink = document.getElementById("nav-wallet");
  if (isLoggedIn()) {
    if (loginBtn) loginBtn.style.display = "none";
    if (walletLink) walletLink.style.display = "inline-flex";
  } else {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (walletLink) walletLink.style.display = "none";
  }
}

function getFilters() {
  const country = document.querySelector('[data-filter="country"]')?.value || "";
  const currency = document.querySelector('[data-filter="currency"]')?.value || "";
  return { country, currency };
}

function renderWalletPanel() {
  const method = localStorage.getItem(LOGIN_KEY) || "wallet";
  const isMobile = method === "mobile";
  const id = isMobile ? "+1 ••• ••• 1234" : "0x7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6a2c1";
  return `
    <div class="dapp-wallet-panel">
      <h2 class="dapp-wallet-panel__title">Wallet</h2>
      <div class="dapp-wallet-user">
        <div class="dapp-wallet-user__row">
          <div class="dapp-wallet-user__avatar">${isMobile ? "📱" : "◆"}</div>
          <div>
            <div class="dapp-wallet-user__name">${isMobile ? "Mobile (OTC)" : "Wallet"}</div>
            <div class="dapp-wallet-user__id">${id}</div>
          </div>
        </div>
      </div>
      <div class="dapp-wallet-actions__title">Quick actions</div>
      <div class="dapp-wallet-actions">
        <button type="button" class="dapp-wallet-actions__btn"><span>↑</span><span>Send</span></button>
        <button type="button" class="dapp-wallet-actions__btn"><span>↓</span><span>Receive</span></button>
        <button type="button" class="dapp-wallet-actions__btn"><span>⇄</span><span>Swap</span></button>
        <button type="button" class="dapp-wallet-actions__btn"><span>◇</span><span>Bridge</span></button>
      </div>
    </div>
  `;
}

function renderSidebarStats() {
  const totalTVL = "2.1M";
  const topPoolsByTvl = [...mockPools].sort((a, b) => {
    const parse = (s) => parseFloat(String(s).replace(/[M%—]/g, "")) || 0;
    return parse(b.tvl) - parse(a.tvl);
  });
  const top10Pools = topPoolsByTvl.slice(0, 10);
  const mostYieldPool = mockPools.filter((p) => p.yield !== "—").sort((a, b) => parseFloat(b.yield) - parseFloat(a.yield))[0];
  const newPool = topPoolsByTvl[topPoolsByTvl.length - 1];
  const topYieldVal = mostYieldPool?.yield ?? "—";
  if (!sidebarStats) return;
  sidebarStats.innerHTML = `
    <div class="dapp-sidebar__stat-section">
      <div class="dapp-sidebar__stat-row">
        <span class="dapp-sidebar__stat-label">TVL</span>
        <span class="dapp-sidebar__stat-value">${totalTVL}</span>
      </div>
      <div class="dapp-sidebar__stat-row">
        <span class="dapp-sidebar__stat-label">Top yield</span>
        <span class="dapp-sidebar__stat-value">${topYieldVal}</span>
      </div>
    </div>
    <div class="dapp-sidebar__stat-section">
      <h3 class="dapp-sidebar__stat-title">Top 10 pools</h3>
      <ul class="dapp-sidebar__stat-list">
        ${top10Pools.map((p) => `<li class="dapp-sidebar__stat-item"><span>${p.country} · ${p.provider}</span><span class="dapp-sidebar__stat-num">${p.tvl}</span></li>`).join("")}
      </ul>
    </div>
    <div class="dapp-sidebar__stat-section dapp-sidebar__stat-section--highlight">
      <h3 class="dapp-sidebar__stat-title">Most yield</h3>
      <div class="dapp-sidebar__stat-item dapp-sidebar__stat-item--highlight">
        <span>${mostYieldPool ? `${mostYieldPool.country} · ${mostYieldPool.provider}` : "—"}</span>
        <span class="dapp-sidebar__stat-num">${mostYieldPool?.yield ?? "—"}</span>
      </div>
    </div>
    <div class="dapp-sidebar__stat-section dapp-sidebar__stat-section--highlight">
      <h3 class="dapp-sidebar__stat-title">New pool</h3>
      <div class="dapp-sidebar__stat-item dapp-sidebar__stat-item--highlight">
        <span>${newPool ? `${newPool.country} · ${newPool.provider}` : "—"}</span>
        <span class="dapp-sidebar__stat-num">${newPool?.active ? "Live" : "Soon"}</span>
      </div>
    </div>
  `;
}

function renderPanel(panel) {
  if (!dappContent) return;
  dappContent.classList.remove("dapp-content--visible");
  dappContent.offsetHeight;
  requestAnimationFrame(() => {
    if (panel === "pools") {
      dappContent.innerHTML = renderPoolsPanel(getFilters());
      bindFilterListeners();
    } else if (panel === "wallet") {
      dappContent.innerHTML = renderWalletPanel();
    } else {
      dappContent.innerHTML = renderDashContent();
    }
    requestAnimationFrame(() => dappContent.classList.add("dapp-content--visible"));
  });
}

function bindFilterListeners() {
  document.querySelectorAll(".dash-filter__select").forEach((select) => {
    select.addEventListener("change", () => {
      dappContent.innerHTML = renderPoolsPanel(getFilters());
      bindFilterListeners();
    });
  });
}

function setDate() {
  const el = document.getElementById("dapp-date");
  if (el) el.textContent = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function initSidebar() {
  const sidebar = document.getElementById("dapp-sidebar");
  const openBtn = document.getElementById("sidebar-open");
  const closeBtn = document.getElementById("sidebar-close");
  openBtn?.addEventListener("click", () => sidebar?.classList.add("is-open"));
  closeBtn?.addEventListener("click", () => sidebar?.classList.remove("is-open"));
}

function initLoginModal() {
  const modal = document.getElementById("login-modal");
  const loginBtn = document.getElementById("nav-login");
  const backdrop = document.getElementById("login-modal-backdrop");
  const closeBtn = document.getElementById("login-modal-close");
  const openModal = () => {
    if (modal) {
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      loginBtn?.setAttribute("aria-expanded", "true");
    }
  };
  const closeModal = () => {
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      loginBtn?.setAttribute("aria-expanded", "false");
    }
  };
  loginBtn?.addEventListener("click", openModal);
  backdrop?.addEventListener("click", closeModal);
  closeBtn?.addEventListener("click", closeModal);
  modal?.querySelectorAll(".login-modal__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const method = btn.getAttribute("data-login");
      if (method) {
        localStorage.setItem(LOGIN_KEY, method);
        closeModal();
        updateNavAuth();
        window.location.hash = "wallet";
        setActive("wallet");
      }
    });
  });
}

function setActive(panel) {
  const current = panel || (window.location.hash.replace("#", "") || "pools");
  document.querySelectorAll(".nav-dapp-link").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("data-panel") === current);
  });
  const walletLink = document.getElementById("nav-wallet");
  if (walletLink) walletLink.classList.toggle("is-active", current === "wallet");
  const headerTitle = document.getElementById("dapp-header-title");
  if (headerTitle) headerTitle.textContent = current === "wallet" ? "Dashboard" : "";
  renderPanel(current);
}

document.addEventListener("DOMContentLoaded", () => {
  setDate();
  initSidebar();
  updateNavAuth();
  initLoginModal();
  renderSidebarStats();

  const html = document.documentElement;
  const themeToggle = document.querySelector(".theme-toggle");
  const saved = localStorage.getItem("ttc-theme");
  if (saved === "light") html.setAttribute("data-theme", "light");
  themeToggle?.addEventListener("click", () => {
    const isLight = html.getAttribute("data-theme") === "light";
    html.setAttribute("data-theme", isLight ? "" : "light");
    localStorage.setItem("ttc-theme", isLight ? "dark" : "light");
  });

  const navLinks = document.querySelectorAll(".nav-dapp-link");
  const walletLink = document.getElementById("nav-wallet");

  const initialHash = window.location.hash.replace("#", "");
  const initialPanel = initialHash || "pools";
  if (!window.location.hash) window.location.hash = "pools";
  setActive(initialPanel);

  window.addEventListener("hashchange", () => setActive(window.location.hash.replace("#", "")));

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const panel = link.getAttribute("data-panel");
      if (panel) {
        window.location.hash = panel;
        setActive(panel);
      }
    });
  });

  walletLink?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = "wallet";
    setActive("wallet");
  });
});
