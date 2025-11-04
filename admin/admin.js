// admin.js - FIXED version
// Açıklama:
// - Google Apps Script endpoint'in "full replace" olduğunu söyledin.
// - Bu yüzden "update" isteklerinde eksik/boş alan gönderirsek SHEET'teki hücreler siliniyor.
// - Çözüm: update isteği göndermeden önce mevcut satırı (products dizisinden) merge et,
//   ve eğer modal inputları boşsa mevcut değerleri koru ("" ile overwrite etmeyelim).
// - Ayrıca kategori düzenleme sırasında tüm ürünleri güncellerken eğer modalda CategoryImg boşsa
//   her ürünün mevcut CategoryImg'sini koruruz.

// Apps Script Web App URL (senin kullandığın URL'i koru)
const webAppUrl = "https://script.google.com/macros/s/AKfycbx4q_RQ3YSLDOB9nD7B-8KrKPx2Ouu4UKtQJ2fjDnp5sXD1tGQsFhqew8C2HNFYBQjFDQ/exec";
const PASSWORD = "restoran123";

let categories = [];
let products = [];
let editingCategoryIndex = null;
let editingProductId = null;

document.getElementById("loginBtn").onclick = () => {
  const input = document.getElementById("adminPassword").value;
  if(input === PASSWORD){
    document.getElementById("loginScreen").style.display="none";
    document.getElementById("adminPanel").style.display="block";
    fetchData();
  } else { document.getElementById("loginError").style.display="block"; }
};

// Veri çekme
async function fetchData(){
  const res = await fetch(webAppUrl);
  const data = await res.json();

  // categories: uniq Kategori isimleri (falsyleri filtrele)
  categories = [...new Set(data.map(d => d.Kategori).filter(Boolean))];

  // products: tam satır objeleri (Apps Script'ten gelen her row)
  products = data;

  updateCategoryUI();
  updateProductUI();
  updateCategorySelect();
}

// Yardımcı: gelen yeniData objesini mevcut existing ile merge et.
// Eğer newData'da bir alan "" ise existing'in değerini koru.
// Eğer newData içinde undefined ise yine existing'i koru.
// Bu şekilde full-replace backend'de mevcut değer silinmez.
function mergePreserveEmpty(existing = {}, newData = {}) {
  const merged = { ...existing };
  Object.keys(newData).forEach(key => {
    const val = newData[key];
    // sadece boş string ile overwrite etmiyoruz
    if (val === "" || val === null || val === undefined) {
      // skip -> mevcut değeri koru (do nothing)
    } else {
      merged[key] = val;
    }
  });
  return merged;
}

// Kategori UI
function updateCategoryUI(){
  const container=document.getElementById("categoriesList");
  container.innerHTML="";
  categories.forEach((cat,index)=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`
      <span>${cat}</span>
      <div>
        <button onclick="openEditCategory(${index})">Düzenle</button>
        <button onclick="deleteCategory(${index})">Sil</button>
      </div>
    `;
    container.appendChild(div);
  });
  Sortable.create(container,{ animation:150, onEnd: reorderCategories });
}

// Ürün UI
function updateProductUI(){
  const container=document.getElementById("productsList");
  container.innerHTML="";
  const selectedCat=document.getElementById("categorySelect").value;
  products.filter(p=>p.Kategori===selectedCat).forEach(p=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`
      <img src="${p["Görsel URL"] || ''}" alt="${p["Ürün Adı"]}">
      <div class="details">
        <strong>${p["Ürün Adı"]}</strong>
        <span>₺${p.Fiyat}</span>
        <span>${p.Açıklama}</span>
      </div>
      <div class="actions">
        <button onclick="openEditProduct(${p._id})">Düzenle</button>
        <button onclick="deleteProduct(${p._id})">Sil</button>
      </div>
    `;
    container.appendChild(div);
  });
  Sortable.create(container,{ animation:150, onEnd: reorderProducts });
}

// Seçim listeleri
function updateCategorySelect(){
  const select=document.getElementById("categorySelect");
  const modalSelect=document.getElementById("modalProductCategory");
  select.innerHTML=""; modalSelect.innerHTML="";
  categories.forEach(cat=>{
    const option=document.createElement("option"); option.value=cat; option.textContent=cat;
    select.appendChild(option);
    const option2=option.cloneNode(true);
    modalSelect.appendChild(option2);
  });
  updateProductUI();
}

document.getElementById("categorySelect").addEventListener("change",updateProductUI);

// Modal aç/kapa
document.getElementById("openAddCategoryModal").onclick = ()=>{
  editingCategoryIndex=null;
  document.getElementById("modalCategoryName").value="";
  document.getElementById("modalCategoryImg").value="";
  document.getElementById("categoryModal").style.display="block";
};
function closeCategoryModal(){ document.getElementById("categoryModal").style.display="none"; }

document.getElementById("openAddProductModal").onclick = ()=>{
  editingProductId=null;
  document.getElementById("modalProductName").value="";
  document.getElementById("modalProductPrice").value="";
  document.getElementById("modalProductDesc").value="";
  document.getElementById("modalProductImg").value="";
  document.getElementById("modalProductCategory").value=document.getElementById("categorySelect").value;
  document.getElementById("productModal").style.display="block";
};
function closeProductModal(){ document.getElementById("productModal").style.display="none"; }

// Kaydet butonları

// Kategori kaydet (yeni veya düzenle)
document.getElementById("saveCategoryBtn").onclick = async ()=>{
  const name=document.getElementById("modalCategoryName").value.trim();
  const modalImg = document.getElementById("modalCategoryImg").value.trim();
  if(!name) return alert("Kategori adı girin");

  if(editingCategoryIndex===null){
    // Yeni kategori ekle: boş bir ürün satırı ekleyerek kategori oluşturuyorsun (var olan mantık)
    const data = {
      action:"add",
      data:{
        Kategori: name,
        "Ürün Adı": "",
        Fiyat: "",
        Açıklama: "",
        "Görsel URL": "",
        CategoryImg: modalImg || ""
      }
    };
    await fetch(webAppUrl, { method:"POST", body: JSON.stringify(data) });
  } else {
    // Kategori düzenle: var olan kategori adını -> yeni adına çevir
    const oldName = categories[editingCategoryIndex];
    // her bir ürünü full-replace yapan backend olduğu için, her ürün için mevcut satırdan merge yapıp gönder
    const toUpdate = products.filter(p=>p.Kategori===oldName);
    for(const p of toUpdate){
      // build updated payload: koruma -> eğer modalImg boşsa p.CategoryImg korunsun
      const newDataPartial = {
        ...p, // start with full row to ensure we have all fields (we will override soon)
        Kategori: name,
        // set CategoryImg only if provided; mergePreserveEmpty will keep existing if empty
        CategoryImg: modalImg === "" ? undefined : modalImg
      };
      // mergePreserveEmpty: will keep p'nin değerlerini eğer undefined/"" varsa
      const merged = mergePreserveEmpty(p, newDataPartial);

      const payload = { action: "update", id: p._id, data: merged };
      await fetch(webAppUrl, { method: "POST", body: JSON.stringify(payload) });
    }
  }

  closeCategoryModal();
  await fetchData();
};

// Ürün kaydet (yeni veya düzenle)
document.getElementById("saveProductBtn").onclick = async ()=>{
  const name=document.getElementById("modalProductName").value.trim();
  if(!name) return alert("Ürün adı girin");

  const newPartial = {
    Kategori: document.getElementById("modalProductCategory").value,
    "Ürün Adı": name,
    Fiyat: document.getElementById("modalProductPrice").value,
    Açıklama: document.getElementById("modalProductDesc").value,
    "Görsel URL": document.getElementById("modalProductImg").value.trim()
  };

  if(editingProductId===null){
    // Yeni ürün ekle -> add
    // if Görsel URL is empty, set to "" (that's fine for new)
    const payload = { action: "add", data: newPartial };
    await fetch(webAppUrl, { method: "POST", body: JSON.stringify(payload) });
  } else {
    // Düzenleme -> update (backend full-replace) -> merge with existing product
    const existing = products.find(p=>p._id===editingProductId);
    if(!existing) {
      alert("Mevcut ürün bulunamadı. Yeniden yükleyin ve tekrar deneyin.");
      closeProductModal();
      await fetchData();
      return;
    }

    // Eğer kullanıcı Görsel URL inputunu boş bıraktıysa mevcut görseli koru.
    const merged = mergePreserveEmpty(existing, newPartial);

    // Ayrıca CategoryImg gibi diğer category-level alanları da existing içine zaten var ise korunur.

    const payload = { action: "update", id: editingProductId, data: merged };
    await fetch(webAppUrl, { method: "POST", body: JSON.stringify(payload) });
  }

  closeProductModal(); await fetchData();
};

// Düzenle modları
function openEditCategory(index){
  editingCategoryIndex=index;
  document.getElementById("modalCategoryName").value=categories[index];
  // CategoryImg'i products dizisinden al (ilk bulunan üründen)
  const p = products.find(pr=>pr.Kategori===categories[index]);
  document.getElementById("modalCategoryImg").value = p?.CategoryImg || "";
  document.getElementById("categoryModal").style.display="block";
}
function openEditProduct(id){
  editingProductId=id;
  const p=products.find(pr=>pr._id===id);
  if(!p) return alert("Ürün bulunamadı");
  document.getElementById("modalProductName").value=p["Ürün Adı"] || "";
  document.getElementById("modalProductPrice").value=p.Fiyat || "";
  document.getElementById("modalProductDesc").value=p.Açıklama || "";
  document.getElementById("modalProductImg").value=p["Görsel URL"] || "";
  document.getElementById("modalProductCategory").value=p.Kategori || "";
  document.getElementById("productModal").style.display="block";
}

// Silme
async function deleteProduct(id){
  if(!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
  await fetch(webAppUrl,{method:"POST",body:JSON.stringify({action:"delete",id})});
  await fetchData();
}
async function deleteCategory(index){
  const catName=categories[index];
  if(!confirm(`"${catName}" kategorisini ve tüm ürünlerini silmek istediğinize emin misiniz?`)) return;
  for(const p of products.filter(p=>p.Kategori===catName)) await fetch(webAppUrl,{method:"POST",body:JSON.stringify({action:"delete",id:p._id})});
  await fetchData();
}

// Sıralama (drag & drop)
async function reorderCategories(evt){
  // opsiyonel: kategorileri sıralamak için backend ekleyebilirsiniz
}
async function reorderProducts(evt){
  // opsiyonel: ürünleri sıralamak için backend ekleyebilirsiniz
}
