import { controlAuthConfig } from "./js/config.js";
import { establishControlSession, hasValidControlSession } from "./js/auth.js";

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (next && next.startsWith("/control")) {
    return next;
  }
  return "/control/";
}

function updateStatus(message, isError) {
  const node = document.querySelector("[data-lock-status]");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("is-error", Boolean(isError));
}

function initControlLogin() {
  if (hasValidControlSession()) {
    window.location.replace(getNextPath());
    return;
  }

  const ownerNode = document.querySelector("[data-owner-label]");
  if (ownerNode) {
    ownerNode.textContent = controlAuthConfig.ownerLabel;
  }

  const form = document.querySelector("[data-control-login-form]");
  const passphraseInput = document.querySelector("[data-control-passphrase]");
  if (!form || !passphraseInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const passphrase = String(passphraseInput.value || "").trim();

    if (passphrase.length < 8) {
      updateStatus("Bitte gib eine gueltige Passphrase ein.", true);
      return;
    }

    updateStatus("Session wird geprueft...", false);
    const ok = await establishControlSession(passphrase);
    if (!ok) {
      updateStatus("Passphrase nicht korrekt. Zugriff verweigert.", true);
      return;
    }

    updateStatus("Zugriff freigeschaltet. Weiterleitung...", false);
    window.location.replace(getNextPath());
  });
}

document.addEventListener("DOMContentLoaded", initControlLogin);

