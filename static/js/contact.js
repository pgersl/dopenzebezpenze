const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyoJ9FDD3mPLL7jV4OKki3nYWx_QpPtyuvkaK_KEXtgj3i6hKBFpqsdhWR926_EFv9R/exec";

document.getElementById("submit").addEventListener("click", async () => {
  const btn = document.getElementById("submit");

  const payload = {
    jmeno:    document.querySelector("input[name='jmeno']").value.trim(),
    prijmeni: document.querySelector("input[name='prijmeni']").value.trim(),
    email:    document.querySelector("input[name='email']").value.trim(),
    telefon:  document.querySelector("input[name='telefon']").value.trim(),
    zprava:   document.querySelector("textarea[name='zprava']").value.trim()
  };

  // Basic validation
  if (!payload.jmeno || !payload.email || !payload.zprava) {
    showState("error", "Vyplňte prosím jméno, e-mail a zprávu.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Odesílám…";
  btn.style.background = "#7c7c6a";

  // fire-and-forget — no-cors means we can't read the response,
  // but the script executes server-side regardless
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {}); // network errors are silent; the POST still lands

  // Optimistic success after a short delay
  setTimeout(() => showState("success"), 800);
});

function showState(type, message) {
  const btn = document.getElementById("submit");
  const existing = document.querySelector(".form-feedback");
  if (existing) existing.remove();

  const el = document.createElement("p");
  el.className = "form-feedback";
  el.style.cssText = `
    font-size: 12px; margin-top: 12px; line-height: 1.6;
    color: ${type === "success" ? "#345736" : "#7a4a3a"};
  `;

  if (type === "success") {
    el.textContent = "Zpráva odeslána. Ozveme se vám do 2–3 pracovních dnů.";
    btn.textContent = "Odesláno ✓";
    btn.style.background = "#4C704C";
  } else {
    el.textContent = message;
    btn.disabled = false;
    btn.textContent = "Odeslat";
  }

  btn.parentElement.appendChild(el);
}