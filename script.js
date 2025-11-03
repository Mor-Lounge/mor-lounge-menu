// Sheet ID ve JSON URL
const sheetId = "163c-Dcd0b_u7jLyKAH9qwqZdxoNYW4GHk8n5HXjFAiE";
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

// HTML elementleri
const catContainer = document.getElementById('categories');
const menuContainer = document.getElementById('menu');
const themeBtn = document.getElementById('themeToggle');

// VERİYİ ÇEK
fetch(url)
  .then(res => res.text())
  .then(rep => {
    // JSON kısmını ayıkla
    const jsonData = JSON.parse(rep.substring(47, rep.length - 2));
    const rows = jsonData.table.rows;
    const data = {};

    // Satırları işle
    rows.forEach(r => {
      const category = r.c[0]?.v || '';
      const name     = r.c[1]?.v || '';
      const price    = r.c[2]?.v || '';
      const desc     = r.c[3]?.v || '';
      const img      = r.c[4]?.v || '';
      const catImg   = r.c[5]?.v || '';

      if (!data[category]) {
        data[category] = { items: [], img: catImg };
      }
      data[category].items.push({ name, price, desc, img });
    });

    // Kategorileri oluştur
    Object.entries(data).forEach(([cat, info], index) => {
      const div = document.createElement('div');
      div.className = 'category-card' + (index === 0 ? ' active' : '');
      div.style.backgroundImage = `url(${info.img})`;
      div.innerHTML = `<span>${cat}</span>`;
      div.onclick = () => showCategory(cat, div, data);
      catContainer.appendChild(div);
    });

    // İlk kategoriyi göster
    showCategory(Object.keys(data)[0], document.querySelector('.category-card'), data);
  });

// Kategoriye tıklayınca ürünleri göster
function showCategory(category, element, data) {
  document.querySelectorAll('.category-card').forEach(el => el.classList.remove('active'));
  element.classList.add('active');

  menuContainer.innerHTML = '';
  data[category].items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div class="card-content">
        <h3>${item.name}</h3>
        <p class="desc">${item.desc}</p>
        <div class="price">₺${item.price}</div>
      </div>
    `;
    menuContainer.appendChild(card);
  });
}

// DARK/LIGHT MOD
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeBtn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
});

// Sayfa açıldığında dark mod ile başlat
document.body.classList.add('dark');
themeBtn.textContent = '☀️';
