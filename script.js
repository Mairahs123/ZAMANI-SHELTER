let currentUser = null;
let isProcessing = false;
let listings = [];
let currentFilter = 'all';
let processingBtn = null;
let originalBtnText = "";
let selectedPostFile = null;

const ADMIN_USERNAME = "adminpioneer"; // Change to your real Pi username later

Pi.init({ version: "2.0", sandbox: true });  // false = Mainnet

function showToast(msg, duration = 3000) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

function startLoading(btn, text = "Processing...") {
  if (!btn) return;
  originalBtnText = btn.innerHTML;
  processingBtn = btn;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${text}`;
}

function stopLoading() {
  if (processingBtn) {
    processingBtn.innerHTML = originalBtnText;
    processingBtn.disabled = false;
    processingBtn = null;
  }
}

// Login
async function loginWithPi() {
  const btn = document.getElementById("loginBtn");
  if (isProcessing) return;
  isProcessing = true;
  startLoading(btn, "Logging in...");

  try {
    const auth = await Pi.authenticate(['username', 'payments'], () => {});
    currentUser = auth.user;
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("user-bar").style.display = "flex";
    document.getElementById("userInfo").innerHTML = `👤 @${currentUser.username}`;
    document.getElementById("filters").style.display = "flex";
    document.getElementById("tabAdmin").style.display = "block";
    showToast(`Welcome, @${currentUser.username}!`, 2500);
    loadListings();
    showTab(0);
  } catch (err) {
    showToast("Login failed – try again");
  } finally {
    isProcessing = false;
    stopLoading();
  }
}

function logout() {
  currentUser = null;
  document.getElementById("user-bar").style.display = "none";
  document.getElementById("loginBtn").style.display = "block";
  document.getElementById("filters").style.display = "none";
  showToast("Logged out");
}

// Listings
function loadListings() {
  const saved = localStorage.getItem("zamaniListings");
  listings = saved ? JSON.parse(saved) : [
    { id:1, type:"rent", title:"2-Bedroom Flat Gwarinpa", location:"Gwarinpa Estate", price:45, desc:"Clean, 24/7 power", img:"https://images.unsplash.com/photo-1580587771525-78b9e3b2f39e?w=800" },
    { id:2, type:"sale", title:"3-Bedroom House Maitama", location:"Maitama District", price:3200, desc:"Luxury finish", img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800" },
    { id:3, type:"rent", title:"Studio Kubwa", location:"Kubwa Phase 1", price:25, desc:"Affordable", img:"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800" },
    { id:4, type:"sale", title:"Land Plot Jahi", location:"Jahi District", price:850, desc:"Ready to build", img:"https://images.unsplash.com/photo-1600585154340-be6161a56a9c?w=800" }
  ];
  if (!saved) saveListings();
  renderListings();
}

function saveListings() {
  localStorage.setItem("zamaniListings", JSON.stringify(listings));
}

function renderListings(filtered = listings) {
  const container = document.getElementById("listingsContainer");
  if (!currentUser) {
    container.innerHTML = `<p style="text-align:center;padding:3rem 1rem;">Login with Pi to view listings</p>`;
    return;
  }
  container.innerHTML = filtered.map(l => `
    <div class="shelter-card">
      <img class="shelter-img" src="${l.img}" loading="lazy">
      <div class="card-content">
        <span class="badge \( {l.type}"> \){l.type.toUpperCase()}</span>
        <h3 class="card-title">${l.title}</h3>
        <p>📍 ${l.location}</p>
        <p>${l.desc}</p>
        <p style="font-size:1.3rem;font-weight:700;color:var(--primary);margin:12px 0;">${l.price} Pi ${l.type==='rent'?'/month':''}</p>
        <button class="primary" onclick="transactListing(\( {l.id}, this)"> \){l.type==='rent'?'Rent Now':'Buy Now'}</button>
      </div>
    </div>
  `).join('');
}

function filterListings(mode) {
  currentFilter = mode;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', (mode==='all' && b.textContent==='All') || b.textContent.toLowerCase().includes(mode)));
  const filtered = mode==='all' ? listings : listings.filter(l => l.type===mode);
  renderListings(filtered);
}

// Pi Payment
async function transactListing(id, btn) {
  const listing = listings.find(l => l.id === id);
  if (!listing) return;
  startLoading(btn, "Opening payment...");
  const memo = listing.type === "rent" ? `Rent deposit – ${listing.title}` : `Purchase – ${listing.title}`;
  const paymentData = { amount: listing.price, memo, metadata: { listingId: id, type: listing.type, username: currentUser.username } };
  const callbacks = {
    onReadyForServerApproval: () => showToast("Payment request sent..."),
    onReadyForServerCompletion: (p, txid) => showToast(`🎉 Success! Tx: ${txid.slice(0,10)}...`, 5000),
    onCancel: () => showToast("Cancelled"),
    onError: () => showToast("Payment error")
  };
  try { await Pi.createPayment(paymentData, callbacks); } catch(e) {}
  finally { stopLoading(); }
}

// Post Listing
const postPhotoInput = document.getElementById("postPhotoInput");
const postPreview = document.getElementById("postPreview");

postPhotoInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file || file.size > 5*1024*1024) return showToast("Max 5MB image");
  selectedPostFile = file;
  const reader = new FileReader();
  reader.onload = ev => { postPreview.src = ev.target.result; postPreview.style.display = "block"; };
  reader.readAsDataURL(file);
});

async function postNewListing() {
  const btn = document.getElementById("postBtn");
  if (isProcessing) return;
  isProcessing = true;
  startLoading(btn, "Posting...");

  const title = document.getElementById("postTitle").value.trim();
  const type = document.getElementById("postType").value;
  const price = parseFloat(document.getElementById("postPrice").value);
  const location = document.getElementById("postLocation").value.trim();
  const desc = document.getElementById("postDesc").value.trim();

  if (!title || isNaN(price) || !location) {
    showToast("Title, price and location required");
    stopLoading(); isProcessing = false; return;
  }

  let imageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a9c?w=800";

  if (selectedPostFile) {
    const formData = new FormData();
    formData.append("photo", selectedPostFile);
    formData.append("username", currentUser.username);
    try {
      const res = await fetch("https://YOUR-PROJECT-NAME.glitch.me/api/upload-photo", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) imageUrl = data.fileUrl;
    } catch(e) { showToast("Photo upload failed – using default"); }
  }

  const newListing = { id: Date.now(), type, title, location, price, desc: desc || "No description", img: imageUrl };
  listings.unshift(newListing);
  saveListings();
  renderListings();
  showToast("Listing posted! 🎉");

  // Reset form
  document.getElementById("postTitle").value = "";
  document.getElementById("postPrice").value = "";
  document.getElementById("postLocation").value = "";
  document.getElementById("postDesc").value = "";
  postPreview.style.display = "none";
  selectedPostFile = null;

  stopLoading();
  isProcessing = false;
  showTab(0);
}

// Admin Dashboard
function renderAdminDashboard() {
  const total = listings.length;
  const value = listings.reduce((sum, l) => sum + l.price, 0);
  document.getElementById("statsGrid").innerHTML = `
    <div class="stat-box"><h3>${total}</h3><p>Total Listings</p></div>
    <div class="stat-box"><h3>${value}</h3><p>Total Pi Value</p></div>
    <div class="stat-box"><h3>${listings.filter(l=>l.type==='rent').length}</h3><p>Rent</p></div>
    <div class="stat-box"><h3>${listings.filter(l=>l.type==='sale').length}</h3><p>Sale</p></div>
  `;

  document.getElementById("adminListingsContainer").innerHTML = listings.map(l => `
    <div class="admin-listing">
      <div><span class="badge \( {l.type}"> \){l.type.toUpperCase()}</span> <strong>${l.title}</strong><br>📍 ${l.location} • ${l.price} Pi</div>
      <button class="delete-btn" onclick="deleteListing(${l.id})">Delete</button>
    </div>
  `).join('');

  document.getElementById("mockTransactions").innerHTML = `
    <div style="padding:0.5rem 0;border-bottom:1px solid #eee;">@pioneer1 bought Maitama House – 3200 Pi</div>
    <div style="padding:0.5rem 0;border-bottom:1px solid #eee;">@abujauser rented Gwarinpa Flat – 45 Pi/month</div>
  `;
}

function deleteListing(id) {
  if (!confirm("Delete this listing?")) return;
  listings = listings.filter(l => l.id !== id);
  saveListings();
  renderListings();
  renderAdminDashboard();
  showToast("Listing deleted");
}

function clearAllListings() {
  if (confirm("Clear ALL listings?")) {
    listings = [];
    saveListings();
    renderListings();
    renderAdminDashboard();
    showToast("All listings cleared");
  }
}

function showTab(tabIndex) {
  document.getElementById("browseSection").style.display = tabIndex === 0 ? "block" : "none";
  document.getElementById("postSection").style.display   = tabIndex === 1 ? "block" : "none";
  document.getElementById("adminSection").style.display  = tabIndex === 2 ? "block" : "none";

  document.querySelectorAll(".tab").forEach((t, i) => t.classList.toggle("active", i === tabIndex));

  if (tabIndex === 2) renderAdminDashboard();
}

// Initial load
window.onload = () => {
  loadListings();
  showTab(0);
  document.getElementById("tabAdmin").style.display = "none";
};
