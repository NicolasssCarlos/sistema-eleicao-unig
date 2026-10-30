const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? "";

function setFeedback(element, message, kind = "error") {
  if (!element) return;
  element.textContent = message;
  element.hidden = !message;
  element.classList.toggle("is-success", kind === "success");
}

const loginForm = document.querySelector("#login-form");

if (loginForm) {
  const message = document.querySelector("#login-message");
  const submitButton = loginForm.querySelector('button[type="submit"]');

  const params = new URLSearchParams(window.location.search);
  if (params.get("cadastro") === "sucesso") {
    setFeedback(message, "Cadastro criado. Entre com sua matrícula e senha.", "success");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback(message, "");

    if (!loginForm.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(loginForm.action, {
        method: "POST",
        body: new FormData(loginForm),
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.sucesso) {
        window.location.assign("/urna");
        return;
      }

      const feedback = response.status === 401
        ? "Matrícula ou senha inválidas. Confira os dados e tente novamente."
        : result?.mensagem || result?.erro || "Não foi possível entrar. Verifique a conexão com o sistema.";
      setFeedback(message, feedback);
    } catch {
      setFeedback(message, "Não foi possível conectar ao sistema. Tente novamente.");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  });
}

const signupForm = document.querySelector("#signup-form");

if (signupForm) {
  const message = document.querySelector("#signup-message");
  const submitButton = signupForm.querySelector('button[type="submit"]');
  const password = signupForm.querySelector("#senha");
  const passwordConfirmation = signupForm.querySelector("#confirmar-senha");

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback(message, "");

    if (!signupForm.reportValidity()) return;
    if (password.value !== passwordConfirmation.value) {
      setFeedback(message, "As senhas não conferem.");
      passwordConfirmation.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(signupForm.action, {
        method: "POST",
        body: new FormData(signupForm),
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
      });

      if (response.redirected && new URL(response.url).pathname === "/login") {
        window.location.assign("/login?cadastro=sucesso");
        return;
      }

      if (!response.ok) {
        const backendMessage = (await response.text()).trim();
        setFeedback(message, backendMessage || "Não foi possível concluir o cadastro.");
        return;
      }

      setFeedback(message, "Não foi possível concluir o cadastro. Confira os dados e tente novamente.");
    } catch {
      setFeedback(message, "Não foi possível conectar ao sistema. Tente novamente.");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  });
}
