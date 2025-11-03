const webAppUrl = "https://script.google.com/macros/s/AKfycbwPnOooa5KIiVOuea9Oslr-2cY33G5Kpwhy0lcPaJMmVax6u6YIAwiZ7xsQnfO9Fm31Kw/exec"; // Apps Script Web App URL
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
  categories = [...new Set(data.map(d => d.Kategori).filter(Boolean))];
  products = data;
  updateCategoryUI();
  updateProductUI();
  updateCategorySelect();
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
      <img src="${p["Görsel URL"]}" alt="${p["Ürün Adı"]}">
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
document.getElementById("saveCategoryBtn").onclick = async ()=>{
  const name=document.getElementById("modalCategoryName").value.trim();
  if(!name) return alert("Kategori adı girin");
  if(editingCategoryIndex===null){
    // Yeni kategori ekle
    const data={action:"add", data:{Kategori:name,"Ürün Adı":"","Fiyat":"","Açıklama":"","Görsel URL":"","CategoryImg":document.getElementById("modalCategoryImg").value}};
    await fetch(webAppUrl,{method:"POST",body:JSON.stringify(data)});
  } else {
    // Düzenle
    const oldName=categories[editingCategoryIndex];
    products.filter(p=>p.Kategori===oldName).forEach(async p=>{
      const data={action:"update", id:p._id, data:{...p,Kategori:name,CategoryImg:document.getElementById("modalCategoryImg").value}};
      await fetch(webAppUrl,{method:"POST",body:JSON.stringify(data)});
    });
  }
  closeCategoryModal();
  fetchData();
};

document.getElementById("saveProductBtn").onclick = async ()=>{
  const name=document.getElementById("modalProductName").value.trim();
  if(!name) return alert("Ürün adı girin");
  const data={action:editingProductId===null?"add":"update", id:editingProductId, data:{
    Kategori:document.getElementById("modalProductCategory").value,
    "Ürün Adı":name,
    Fiyat:document.getElementById("modalProductPrice").value,
    Açıklama:document.getElementById("modalProductDesc").value,
    "Görsel URL":document.getElementById("modalProductImg").value
  }};
  await fetch(webAppUrl,{method:"POST",body:JSON.stringify(data)});
  closeProductModal(); fetchData();
};

// Düzenle modları
function openEditCategory(index){
  editingCategoryIndex=index;
  document.getElementById("modalCategoryName").value=categories[index];
  document.getElementById("modalCategoryImg").value=products.find(p=>p.Kategori===categories[index])?.CategoryImg||"";
  document.getElementById("categoryModal").style.display="block";
}
function openEditProduct(id){
  editingProductId=id;
  const p=products.find(pr=>pr._id===id);
  document.getElementById("modalProductName").value=p["Ürün Adı"];
  document.getElementById("modalProductPrice").value=p.Fiyat;
  document.getElementById("modalProductDesc").value=p.Açıklama;
  document.getElementById("modalProductImg").value=p["Görsel URL"];
  document.getElementById("modalProductCategory").value=p.Kategori;
  document.getElementById("productModal").style.display="block";
}

// Silme
async function deleteProduct(id){
  if(!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
  await fetch(webAppUrl,{method:"POST",body:JSON.stringify({action:"delete",id})});
  fetchData();
}
async function deleteCategory(index){
  const catName=categories[index];
  if(!confirm(`"${catName}" kategorisini ve tüm ürünlerini silmek istediğinize emin misiniz?`)) return;
  for(const p of products.filter(p=>p.Kategori===catName)) await fetch(webAppUrl,{method:"POST",body:JSON.stringify({action:"delete",id:p._id})});
  fetchData();
}

// Sıralama (drag & drop)
async function reorderCategories(evt){
  // opsiyonel: kategorileri sıralamak için backend ekleyebilirsiniz
}
async function reorderProducts(evt){
  // opsiyonel: ürünleri sıralamak için backend ekleyebilirsiniz
}
