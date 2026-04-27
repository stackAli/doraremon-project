const form = document.getElementById("episodeForm");
const grid = document.getElementById("episodeGrid");
const search = document.getElementById("episodeSearch");
const filter = document.getElementById("episodeFilter");
const cancelEdit = document.getElementById("cancelEdit");
const sourceType = document.getElementById("episodeSourceType");
const youtubeInput = document.getElementById("episodeYoutube");
const fileInput = document.getElementById("episodeFile");

function esc(text) {
  return String(text || "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function youtubeEmbed(url) {
  const value = String(url || "").trim();
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : "";
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toggleSourceInputs() {
  const local = sourceType.value === "local";
  youtubeInput.style.display = local ? "none" : "block";
  fileInput.style.display = local ? "block" : "none";
}

function mediaHTML(ep) {
  if (ep.sourceType === "youtube" && ep.youtubeUrl) {
    const embed = youtubeEmbed(ep.youtubeUrl);
    if (embed) return `<div class="episode-media"><iframe src="${embed}" title="${esc(ep.title)}" allowfullscreen></iframe></div>`;
    return `<p><a class="btn ghost" href="${esc(ep.youtubeUrl)}" target="_blank" rel="noopener">Open YouTube Episode</a></p>`;
  }
  if (ep.sourceType === "local" && ep.videoData) {
    return `<div class="episode-media"><video controls src="${ep.videoData}"></video></div>`;
  }
  return `<p class="muted">No video attached.</p>`;
}

function renderEpisodes() {
  const q = (search.value || "").toLowerCase();
  const category = filter.value;
  const episodes = Store.episodes().filter(ep => {
    const text = `${ep.title} ${ep.gadget} ${ep.description}`.toLowerCase();
    return text.includes(q) && (category === "all" || ep.category === category);
  });
  if (!episodes.length) {
    grid.innerHTML = `<div class="empty-state"><h2>No episodes found</h2><p class="muted">Try another search or add a new episode record.</p></div>`;
    return;
  }
  grid.innerHTML = episodes.map(ep => `<article class="episode-card"><div class="gadget-icon">📺</div><div class="badges"><span class="badge">${esc(ep.category)}</span><span class="badge">⭐ ${Number(ep.rating || 0)}/5</span><span class="badge">${ep.sourceType === "local" ? "Local video" : "YouTube"}</span></div><h3>${esc(ep.title)}</h3>${mediaHTML(ep)}<p class="muted">${esc(ep.description)}</p><p><strong>Main Gadget:</strong> ${esc(ep.gadget)}</p><div class="card-actions"><button class="btn ghost" onclick="editEpisode(${ep.id})">Edit</button><button class="btn danger" onclick="deleteEpisode(${ep.id})">Delete</button></div></article>`).join("");
}

function resetForm() {
  form.reset();
  document.getElementById("episodeId").value = "";
  document.getElementById("episodeFormTitle").textContent = "Add Episode";
  document.getElementById("episodeRating").value = 4;
  sourceType.value = "youtube";
  toggleSourceInputs();
}

function editEpisode(id) {
  const ep = Store.episodes().find(item => item.id === id);
  if (!ep) return;
  document.getElementById("episodeId").value = ep.id;
  document.getElementById("episodeTitle").value = ep.title || "";
  document.getElementById("episodeCategory").value = ep.category || "Adventure";
  document.getElementById("episodeGadget").value = ep.gadget || "";
  document.getElementById("episodeRating").value = ep.rating || 4;
  sourceType.value = ep.sourceType || "youtube";
  youtubeInput.value = ep.youtubeUrl || "";
  document.getElementById("episodeDesc").value = ep.description || "";
  document.getElementById("episodeFormTitle").textContent = "Edit Episode";
  toggleSourceInputs();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteEpisode(id) {
  if (!confirm("Delete this episode record?")) return;
  Store.saveEpisodes(Store.episodes().filter(ep => ep.id !== id));
  renderEpisodes();
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const id = document.getElementById("episodeId").value;
  const episodes = Store.episodes();
  const existing = id ? episodes.find(ep => ep.id === Number(id)) : null;
  let videoData = existing?.videoData || "";
  let fileName = existing?.fileName || "";
  if (sourceType.value === "local" && fileInput.files[0]) {
    videoData = await readFileAsDataURL(fileInput.files[0]);
    fileName = fileInput.files[0].name;
  }
  const data = {
    id: id ? Number(id) : Date.now(),
    title: document.getElementById("episodeTitle").value.trim(),
    category: document.getElementById("episodeCategory").value,
    gadget: document.getElementById("episodeGadget").value.trim(),
    rating: Number(document.getElementById("episodeRating").value),
    description: document.getElementById("episodeDesc").value.trim(),
    sourceType: sourceType.value,
    youtubeUrl: sourceType.value === "youtube" ? youtubeInput.value.trim() : "",
    videoData: sourceType.value === "local" ? videoData : "",
    fileName: sourceType.value === "local" ? fileName : ""
  };
  if (id) Store.saveEpisodes(episodes.map(ep => ep.id === Number(id) ? data : ep));
  else Store.saveEpisodes([data, ...episodes]);
  resetForm();
  renderEpisodes();
});

search.addEventListener("input", renderEpisodes);
filter.addEventListener("change", renderEpisodes);
cancelEdit.addEventListener("click", resetForm);
sourceType.addEventListener("change", toggleSourceInputs);
toggleSourceInputs();
renderEpisodes();
