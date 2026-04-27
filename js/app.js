document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("menuBtn");
  const nav = document.getElementById("navLinks");

  if (menu && nav) {
    menu.addEventListener("click", () => nav.classList.toggle("open"));
  }

  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("#navLinks a").forEach(a => { if (a.getAttribute("href") === current) a.classList.add("active"); });

  const pocketStat = document.getElementById("statPocket");
  const bestStat = document.getElementById("statBest");
  const missionsStat = document.getElementById("statMissions");
  const episodesStat = document.getElementById("statEpisodes");

  if (pocketStat) pocketStat.textContent = Store.pocket().length;

  if (bestStat) {
    const scores = Store.scores();
    bestStat.textContent = scores[0]?.score || 0;
  }

  if (missionsStat) {
    Store.updateMissionProgress();
    missionsStat.textContent = Store.missions().filter(m => m.completed).length;
  }

  if (episodesStat) episodesStat.textContent = Store.episodes().length;
});
