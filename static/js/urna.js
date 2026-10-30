const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? "";
const numberInput = document.querySelector("#numero-candidato");
const lookupMessage = document.querySelector("#lookup-message");
const candidateBrief = document.querySelector("#candidate-brief");
const candidateName = document.querySelector("#candidate-name");
const candidateParty = document.querySelector("#candidate-party");
const candidatesList = document.querySelector("#candidates-list");
const confirmButton = document.querySelector("#open-confirm");
const confirmDialog = document.querySelector("#confirm-dialog");
const toastMessage = document.querySelector("#vote-message");

let selectedCandidate = null;
let lookupTimer;
let lookupSequence = 0;

function setLookupMessage(message, state = "idle") {
  lookupMessage.textContent = message;
  lookupMessage.dataset.state = state;
}

function clearCandidate() {
  selectedCandidate = null;
  candidateBrief.hidden = true;
  candidateName.textContent = "";
  candidateParty.textContent = "";
  candidateParty.hidden = true;
  confirmButton.disabled = true;
}

function showToast(message) {
  toastMessage.textContent = message;
  toastMessage.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toastMessage.hidden = true;
  }, 5000);
}

function setCandidateNumber(value) {
  if (numberInput.value.length >= 8) return;
  numberInput.value += value;
  numberInput.dispatchEvent(new Event("input", { bubbles: true }));
  numberInput.focus();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function lookupCandidate(number = numberInput.value) {
  const normalizedNumber = number.replace(/\D/g, "");
  const sequence = ++lookupSequence;
  clearCandidate();

  if (!normalizedNumber) {
    setLookupMessage("Digite o número para consultar os dados do candidato.");
    return;
  }

  setLookupMessage("Consultando candidato no backend...", "loading");

  try {
    const { response, data } = await fetchJson(`/candidatos/${encodeURIComponent(normalizedNumber)}`);
    if (sequence !== lookupSequence || normalizedNumber !== numberInput.value) return;

    if (response.status === 401) {
      window.location.replace("/login");
      return;
    }

    if (!response.ok || !data || data.erro) {
      setLookupMessage(data?.erro || "Número não encontrado. Confira e tente novamente.", "error");
      return;
    }

    selectedCandidate = data;
    candidateName.textContent = data.nome || `Candidato ${normalizedNumber}`;
    const party = typeof data.partido === "string" ? data.partido.trim() : "";
    candidateParty.textContent = party;
    candidateParty.hidden = !party;
    candidateBrief.hidden = false;
    confirmButton.disabled = false;
    setLookupMessage("Confira o nome antes de confirmar o voto.", "success");
  } catch {
    if (sequence !== lookupSequence) return;
    setLookupMessage("Não foi possível consultar o candidato. Verifique a conexão com o banco.", "error");
  }
}

function renderCandidates(candidates) {
  candidatesList.replaceChildren();

  const availableCandidates = Array.isArray(candidates)
    ? candidates.filter((candidate) => candidate && candidate.numero !== undefined && candidate.numero !== null)
    : [];

  if (availableCandidates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "list-state";
    empty.textContent = "Nenhum candidato disponível para esta eleição.";
    candidatesList.append(empty);
    return;
  }

  availableCandidates.forEach((candidate) => {
    const button = document.createElement("button");
    button.className = "candidate-option";
    button.type = "button";
    button.setAttribute("aria-label", `Selecionar ${candidate.nome || "candidato"}, número ${candidate.numero}`);

    const identity = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = candidate.nome || "Candidato";
    const instruction = document.createElement("small");
    instruction.textContent = "Selecionar número";
    identity.append(name, instruction);

    const number = document.createElement("span");
    number.className = "candidate-number";
    number.textContent = String(candidate.numero);

    button.append(identity, number);
    button.addEventListener("click", () => {
      numberInput.value = String(candidate.numero).replace(/\D/g, "").slice(0, 8);
      numberInput.dispatchEvent(new Event("input", { bubbles: true }));
      numberInput.focus();
    });
    candidatesList.append(button);
  });
}

async function loadCandidates() {
  try {
    const { response, data } = await fetchJson("/candidatos");
    if (response.status === 401) {
      window.location.replace("/login");
      return;
    }
    if (!response.ok || !Array.isArray(data)) {
      throw new Error("candidate-list-unavailable");
    }
    renderCandidates(data);
  } catch {
    const unavailable = document.createElement("p");
    unavailable.className = "list-state";
    unavailable.textContent = "Não foi possível carregar os candidatos. Verifique a conexão com o backend.";
    candidatesList.replaceChildren(unavailable);
  }
}

numberInput.addEventListener("input", () => {
  const digits = numberInput.value.replace(/\D/g, "").slice(0, 8);
  if (numberInput.value !== digits) numberInput.value = digits;

  clearCandidate();
  window.clearTimeout(lookupTimer);

  if (!digits) {
    lookupSequence += 1;
    setLookupMessage("Digite o número para consultar os dados do candidato.");
    return;
  }

  lookupTimer = window.setTimeout(() => lookupCandidate(digits), 280);
});

numberInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault();
    if (selectedCandidate) confirmButton.click();
    else lookupCandidate();
  }
});

document.querySelectorAll("[data-digit]").forEach((button) => {
  button.addEventListener("click", () => setCandidateNumber(button.dataset.digit));
});

document.querySelector("#correct-number").addEventListener("click", () => {
  window.clearTimeout(lookupTimer);
  numberInput.value = "";
  lookupSequence += 1;
  clearCandidate();
  setLookupMessage("Número corrigido. Digite novamente.");
  numberInput.focus();
});

confirmButton.addEventListener("click", () => {
  if (!selectedCandidate) return;
  document.querySelector("#dialog-number").textContent = String(selectedCandidate.numero);
  document.querySelector("#dialog-candidate-name").textContent = selectedCandidate.nome || "Candidato";
  confirmDialog.showModal();
});

document.querySelector("#cancel-vote").addEventListener("click", () => confirmDialog.close());

document.querySelector("#submit-vote").addEventListener("click", async (event) => {
  if (!selectedCandidate) return;

  const submitButton = event.currentTarget;
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");

  try {
    const response = await fetch("/votar", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ numero: selectedCandidate.numero }),
    });
    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      window.location.replace("/login");
      return;
    }
    if (!response.ok || !data?.sucesso) {
      throw new Error(data?.mensagem || data?.erro || "Não foi possível registrar o voto.");
    }

    confirmDialog.close();
    document.querySelector("#voting-grid").hidden = true;
    const completion = document.querySelector("#vote-complete");
    completion.hidden = false;
    completion.focus();
  } catch (error) {
    confirmDialog.close();
    showToast(error instanceof Error ? error.message : "Não foi possível registrar o voto.");
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
  }
});

document.querySelector("#logout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      credentials: "same-origin",
      headers: { "X-CSRF-Token": csrfToken },
    });
    if (response.ok) {
      window.location.replace("/login");
      return;
    }
  } catch {
    showToast("Não foi possível encerrar a sessão. Tente novamente.");
    return;
  }

  showToast("Não foi possível encerrar a sessão. Tente novamente.");
});

loadCandidates();
