const main = document.querySelector("main");

const elements = main.querySelectorAll("header, section, div, p, h1, h2, h3, h4, h5, h6, a, img, figure");

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
}, { threshold: 0.1 });

window.addEventListener("load", () => {
    elements.forEach((element) => {
        observer.observe(element);
        element.classList.remove("visible");
    });
    setTimeout(() => {
        const charts = main.querySelectorAll(".plot-d6a7b5-swatches, .plot-d6a7b5-swatches-wrap, .plot-d6a7b5-figure");
        charts.forEach(chart => observer.observe(chart));
    }, 50);
});