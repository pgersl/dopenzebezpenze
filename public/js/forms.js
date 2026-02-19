const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxi8XFoQmbSbT03epUrcCxQPZf_mnU0sgWPBdtZ6CpDy8Vbz2VJyeAyxLevK6Yms_eJTQ/exec";

// CONTACT FORM
document.getElementById("contact-form").addEventListener("submit", function(e) {
    e.preventDefault();

    const form = this;
    const button = form.querySelector("button");
    const message = form.querySelector(".form-message");
    const btnText = form.querySelector(".btn-text");
    const btnLoading = form.querySelector(".btn-loading");

    const formData = new FormData(form);

    const data = {
        type: "Leads",
        name: formData.get("name"),
        email: formData.get("email"),
        tel: formData.get("tel")
    };

    button.classList.add("loading");
    btnText.classList.add("hidden");
    btnLoading.classList.remove("hidden");
    message.textContent = "";
    message.className = "form-message";

    fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        message.textContent = "Děkujeme! Ozveme se vám.";
        message.classList.add("success");
        form.reset();
    })
    .catch(() => {
        message.textContent = "Něco se pokazilo. Zkuste to prosím znovu.";
        message.classList.add("error");
    })
    .finally(() => {
        button.classList.remove("loading");
        btnText.classList.remove("hidden");
        btnLoading.classList.add("hidden");
    });
});



// NEWSLETTER FORM
document.getElementById("newsletter-form").addEventListener("submit", function(e) {
    e.preventDefault();

    const form = this;
    const button = form.querySelector("button");
    const message = form.querySelector(".form-message");
    const btnText = form.querySelector(".btn-text");
    const btnLoading = form.querySelector(".btn-loading");

    const formData = new FormData(form);

    const data = {
        type: "Newsletter",
        name: formData.get("name"),
        email: formData.get("email")
    };

    button.classList.add("loading");
    btnText.classList.add("hidden");
    btnLoading.classList.remove("hidden");
    message.textContent = "";
    message.className = "form-message";

    fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        message.textContent = "Děkujeme za přihlášení k newsletteru!";
        message.classList.add("success");
        form.reset();
    })
    .catch(() => {
        message.textContent = "Nepodařilo se přihlásit. Zkuste to prosím znovu.";
        message.classList.add("error");
    })
    .finally(() => {
        button.classList.remove("loading");
        btnText.classList.remove("hidden");
        btnLoading.classList.add("hidden");
    });
});

