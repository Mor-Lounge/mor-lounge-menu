// ============================
//   Mor Lounge Menü - Final
//   JSON + Sheets fallback
// ============================

// 🔧 Ayarlar
const sheetId = "163c-Dcd0b_u7jLyKAH9qwqZdxoNYW4GHk8n5HXjFAiE";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
const JSON_URL = "data/menu.json"; // GitHub’da otomatik güncellenecek

// HTML elementleri
const catContainer = document.getElementById('categories');
const menuContainer = document.getElementById('menu');
const themeBtn = document.getElementById('themeToggle');

// Başlat
init();

async function init() {
  try {
    // Önce local JSON'dan oku (hızlı)
    const res = await fetch(JSON_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("menu.json bulunamadı");
    const json = await res.json();
    const data = normalizeJson(json);
    buildUI(data);
  } catch (err) {
    console.warn("menu.json okunamadı, Sheets'ten yükleniyor →", err.message);
    const gvizText = await fetch(GVIZ_URL).then(r => r.text());
    const data = parseGviz(gvizText);
    buildUI(data);
  }
}

// ============================
//  JSON ve GVIZ verisini dönüştür
// ============================

function normalizeJson(arr) {
  const data = {};
  arr.forEach(row => {
    const category = row["Kategori"] || "";
    const name = row["Ürün Adı"] || "";
    const price = row["Fiyat"] || "";
    const desc = row["Açıklama"] || "";
    const img = row["Görsel URL"] || "";
    const catImg = row["CategoryImg"] || "";

    if (!data[category]) data[category] = { items: [], img: catImg };
    data[category].items.push({ name, price, desc, img });
  });
  return data;
}

function parseGviz(rep) {
  const jsonData = JSON.parse(rep.substring(47, rep.length - 2));
  const rows = jsonData.table.rows;
  const data = {};
  rows.forEach(r => {
    const category = r.c[0]?.v || '';
    const name = r.c[1]?.v || '';
    const price = r.c[2]?.v || '';
    const desc = r.c[3]?.v || '';
    const img = r.c[4]?.v || '';
    const catImg = r.c[5]?.v || '';
    if (!data[category]) data[category] = { items: [], img: catImg };
    data[category].items.push({ name, price, desc, img });
  });
  return data;
}

// ============================
//  UI oluşturma
// ============================

function buildUI(data) {
  catContainer.innerHTML = "";
  const cats = Object.entries(data);
  cats.forEach(([cat, info], index) => {
    const div = document.createElement("div");
    div.className = "category-card" + (index === 0 ? " active" : "");
    div.dataset.bg = info.img || "";
    div.innerHTML = `<span>${cat}</span>`;
    div.onclick = () => showCategory(cat, div, data);
    catContainer.appendChild(div);
  });

  if (cats.length) showCategory(cats[0][0], catContainer.querySelector(".category-card"), data);
  lazyLoadCategoryImages();
}

function showCategory(category, element, data) {
  document.querySelectorAll(".category-card").forEach(el => el.classList.remove("active"));
  element.classList.add("active");
  menuContainer.innerHTML = "";
  const fragment = document.createDocumentFragment();

  (data[category]?.items || []).forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}" loading="lazy">
      <div class="card-content">
        <h3>${item.name}</h3>
        <p class="desc">${item.desc || ""}</p>
        <div class="price">₺${item.price}</div>
      </div>
    `;
    fragment.appendChild(card);
  });

  requestAnimationFrame(() => menuContainer.appendChild(fragment));
}

// ============================
//  Lazy load (kategori görselleri)
// ============================

function lazyLoadCategoryImages() {
  const obs = new IntersectionObserver((entries, o) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const bg = el.dataset.bg;
        if (bg) {
          el.style.backgroundImage = `url(${bg})`;
          el.removeAttribute("data-bg");
        }
        o.unobserve(el);
      }
    });
  }, { rootMargin: "150px", threshold: 0.1 });
  document.querySelectorAll(".category-card").forEach(el => obs.observe(el));
}

// ============================
//  Tema (dark/light)
// ============================
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeBtn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
});
document.body.classList.add("dark");
themeBtn.textContent = "☀️";
