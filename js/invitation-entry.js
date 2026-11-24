(function () {
  "use strict";

  if (!/^\/(margee|sahil)(\/|$)/i.test(window.location.pathname)) return;
  if (document.querySelector("[data-invitation]")) return;

  const gujarati = document.documentElement.lang === "gu";
  const heading = document.querySelector(".hero h1");
  const names = Array.from(heading?.querySelectorAll(":scope > span") || [], (part) => part.textContent.trim())
    .join(gujarati ? " અને " : " & ");

  const shell = document.createElement("div");
  shell.setAttribute("data-site-shell", "");
  shell.className = "invitation-page-shell";
  shell.append(...document.body.childNodes);
  document.body.append(shell);

  if (heading) {
    heading.setAttribute("data-site-title", "");
    heading.tabIndex = -1;
  }

  const dialog = document.createElement("dialog");
  dialog.className = "invitation";
  dialog.setAttribute("data-invitation", "");
  dialog.setAttribute("aria-labelledby", "invitation-title");
  dialog.setAttribute("aria-describedby", "invitation-hint");
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="invitation__atmosphere" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="invitation__stage">
      <h2 class="invitation__title" id="invitation-title" tabindex="-1"></h2>
      <div class="kankotri" data-kankotri>
        <div class="kankotri__back" aria-hidden="true"></div>
        <div class="kankotri__card" aria-hidden="true">
          <img class="kankotri__monogram" src="/assets/logo/ms-monogram-burgundy.png" alt="" width="2000" height="2000">
          <p data-envelope-names></p><strong data-envelope-wedding></strong><span data-envelope-invitation></span>
        </div>
        <div class="kankotri__flap" aria-hidden="true"></div>
        <div class="kankotri__pocket" aria-hidden="true"></div>
        <button class="kankotri__seal" type="button" data-invitation-open>
          <img src="/assets/logo/ms-monogram-burgundy.png" alt="" width="2000" height="2000">
          <span data-envelope-open-label></span>
        </button>
      </div>
      <p class="invitation__hint" id="invitation-hint"></p>
    </div>`;

  const openLabel = gujarati ? "આમંત્રણ ખોલો" : "Open invitation";
  dialog.querySelector("#invitation-title").textContent = gujarati
    ? `${names}ના લગ્નનું આમંત્રણ`
    : `${names}'s wedding invitation`;
  dialog.querySelector("[data-envelope-names]").textContent = names;
  dialog.querySelector("[data-envelope-wedding]").textContent = gujarati ? "લગ્નનું" : "Wedding";
  dialog.querySelector("[data-envelope-invitation]").textContent = gujarati ? "આમંત્રણ" : "Invitation";
  dialog.querySelector("[data-envelope-open-label]").textContent = openLabel;
  dialog.querySelector("[data-invitation-open]").setAttribute("aria-label", openLabel);
  dialog.querySelector("#invitation-hint").textContent = gujarati
    ? "આમંત્રણ ખોલવા પ્રતીકચિહ્ન પર ટૅપ કરો"
    : "Tap the monogram seal to open";
  document.body.prepend(dialog);
})();
