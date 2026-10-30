const resultsRoot = document.querySelector(".results-app");
const resultsAvailable = resultsRoot?.dataset.resultsAvailable === "true";
const resultsWaiting = document.querySelector("#results-waiting");
const resultsCard = document.querySelector("#results-card");
const resultsError = document.querySelector("#results-error");
const winnerStatus = document.querySelector("#winner-status");
const winnerName = document.querySelector("#winner-name");
const winnerMeta = document.querySelector("#winner-meta");
const totalVotesElement = document.querySelector("#total-votes");
const resultsList = document.querySelector("#results-list");
const numberFormat = new Intl.NumberFormat("pt-BR");

function showResultsError(message) {
  resultsCard.hidden = true;
  resultsError.textContent = message;
  resultsError.hidden = false;
}

function createResultRow(candidate, totalVotes) {
  const row = document.createElement("article");
  row.className = "result-row";

  const top = document.createElement("div");
  top.className = "result-row-top";

  const identity = document.createElement("div");
  identity.className = "result-identity";
  const name = document.createElement("strong");
  name.textContent = candidate.nome;
  const number = document.createElement("span");
  number.textContent = `Número ${candidate.numero}`;
  identity.append(name, number);

  const count = document.createElement("strong");
  count.className = "result-count";
  count.textContent = `${numberFormat.format(candidate.votos)} ${candidate.votos === 1 ? "voto" : "votos"}`;
  top.append(identity, count);

  const progress = document.createElement("progress");
  progress.className = "result-progress";
  progress.max = Math.max(totalVotes, 1);
  progress.value = candidate.votos;
  progress.setAttribute("aria-label", `${candidate.nome}: ${numberFormat.format(candidate.votos)} votos`);

  row.append(top, progress);
  return row;
}

function renderResults(data) {
  const candidates = data
    .filter((candidate) => candidate && candidate.nome !== undefined)
    .map((candidate) => {
      const count = Number(candidate.total_votos ?? 0);
      return {
        nome: String(candidate.nome || "Candidato"),
        numero: String(candidate.numero ?? "—"),
        votos: Number.isFinite(count) ? Math.max(0, count) : 0,
      };
    })
    .sort((first, second) => second.votos - first.votos);

  const totalVotes = candidates.reduce((total, candidate) => total + candidate.votos, 0);
  const highestCount = candidates[0]?.votos ?? 0;
  const winners = highestCount > 0
    ? candidates.filter((candidate) => candidate.votos === highestCount)
    : [];

  if (winners.length === 1) {
    winnerStatus.textContent = "VENCEDOR DA ELEIÇÃO";
    winnerName.textContent = winners[0].nome;
    winnerMeta.textContent = `Número ${winners[0].numero} · ${numberFormat.format(winners[0].votos)} ${winners[0].votos === 1 ? "voto" : "votos"}`;
  } else if (winners.length > 1) {
    winnerStatus.textContent = "EMPATE NA VOTAÇÃO";
    winnerName.textContent = winners.map((candidate) => candidate.nome).join(" e ");
    winnerMeta.textContent = `${numberFormat.format(highestCount)} votos para cada candidatura.`;
  } else {
    winnerStatus.textContent = "SEM VOTOS VÁLIDOS";
    winnerName.textContent = "Nenhum voto registrado";
    winnerMeta.textContent = "Não há vencedor para esta apuração.";
  }

  totalVotesElement.textContent = `${numberFormat.format(totalVotes)} ${totalVotes === 1 ? "voto apurado" : "votos apurados"}`;
  resultsList.replaceChildren();

  if (candidates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "results-empty";
    empty.textContent = "Nenhuma candidatura encontrada para esta eleição.";
    resultsList.append(empty);
  } else {
    candidates.forEach((candidate) => resultsList.append(createResultRow(candidate, totalVotes)));
  }
}

async function loadResults() {
  try {
    const response = await fetch("/resultados", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => null);

    if (response.status === 409) {
      resultsCard.hidden = true;
      resultsWaiting.hidden = false;
      document.querySelector("#results-waiting-title").textContent = "O resultado ainda não foi liberado.";
      document.querySelector("#results-waiting-copy").textContent = "A apuração aparecerá depois que alguém encerrar a votação.";
      return;
    }

    if (!response.ok || !Array.isArray(data)) {
      throw new Error("results-unavailable");
    }

    renderResults(data);
  } catch {
    showResultsError("Não foi possível carregar a apuração. Verifique a conexão do backend com o banco de dados.");
  }
}

if (resultsAvailable) {
  loadResults();
}
