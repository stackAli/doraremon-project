const table = document.getElementById("scoreTable");
const best = document.getElementById("bestScore");
const clear = document.getElementById("clearScores");
const savedRuns = document.getElementById("savedRuns");
const totalComics = document.getElementById("totalComics");

function renderScores() {
  const scores = Store.scores();
  best.textContent = scores[0]?.score || 0;
  savedRuns.textContent = scores.length;
  totalComics.textContent = scores.reduce((sum, item) => sum + Number(item.comics || 0), 0);
  if (!scores.length) {
    table.innerHTML = `<tr><td colspan="4">No scores saved yet. Play the Adventure Game first.</td></tr>`;
    return;
  }
  table.innerHTML = scores.map((s, i) => `<tr><td>#${i + 1}</td><td>${s.score}</td><td>${s.comics}</td><td>${s.date}</td></tr>`).join("");
}

clear.addEventListener("click", () => {
  if (!confirm("Reset all scores?")) return;
  Store.write(Store.keys.scores, []);
  renderScores();
});

renderScores();
