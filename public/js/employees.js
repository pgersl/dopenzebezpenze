(() => {
  const ANNUAL_RATE = 0.08;

  const employeeInput = document.getElementById("employee-monthly");
  const employerInput = document.getElementById("employer-monthly");
  const yearsInput    = document.getElementById("employee-years");
  const savingsEl     = document.getElementById("savings");

  // ── Chart setup ──────────────────────────────────────────────────────────
  const ctx = document.getElementById("chart").getContext("2d");

  const chart = new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { family: "Inter, sans-serif", size: 12 },
            color: "#1c1c18",
            boxWidth: 12,
            padding: 20,
          },
        },
        tooltip: {
          backgroundColor: "rgba(28,28,24,0.88)",
          titleColor: "#fcf9f3",
          bodyColor: "#fcf9f3",
          titleFont: { family: "Inter, sans-serif", size: 12 },
          bodyFont:  { family: "Inter, sans-serif", size: 12 },
          padding: 12,
          cornerRadius: 6,
          callbacks: {
            label: (item) =>
              ` ${item.dataset.label}: ${formatCZK(item.raw)}`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Roky",
            font: { family: "Inter, sans-serif", size: 12 },
            color: "rgba(28,28,24,0.45)",
          },
          grid:  { color: "rgba(28,28,24,0.10)" },
          ticks: { font: { family: "Inter, sans-serif", size: 11 }, color: "rgba(28,28,24,0.45)" },
          border: { display: false },
        },
        y: {
          title: {
            display: true,
            text: "Hodnota (Kč)",
            font: { family: "Inter, sans-serif", size: 12 },
            color: "rgba(28,28,24,0.45)",
          },
          grid:  { color: "rgba(28,28,24,0.10)" },
          ticks: {
            font: { family: "Inter, sans-serif", size: 11 },
            color: "rgba(28,28,24,0.45)",
            callback: v => {
              if (v >= 1000000) return (v / 1000000).toFixed(1) + ' mil. Kč';
              if (v >= 1000) return (v / 1000).toFixed(0) + ' tis. Kč';
              return v + ' Kč';
            }
          },
          border: { display: false },
        },
      },
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatCZK(value) {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function calculate(monthlyEmployee, monthlyEmployer, years) {
    const monthlyTotal  = monthlyEmployee + monthlyEmployer;
    const labels        = [];
    const invested      = [];
    const futureValues  = [];

    for (let y = 0; y <= years; y++) {
      const months = y * 12;
      labels.push(y);

      invested.push(monthlyTotal * months);

      let fv = 0;
      for (let m = 1; m <= months; m++) {
        fv += monthlyTotal * Math.pow(1 + ANNUAL_RATE, (12 * y - m) / 12)
      }
      futureValues.push(Math.round(fv));
    }

    return { labels, invested, futureValues };
  }

  function update() {
    const monthlyEmployee = Math.max(0, parseFloat(employeeInput.value) || 0);
    const monthlyEmployer = Math.max(0, parseFloat(employerInput.value) || 0);
    const years           = Math.max(0, Math.min(100, parseInt(yearsInput.value) || 0));

    const { labels, invested, futureValues } = calculate(
      monthlyEmployee, monthlyEmployer, years
    );

    savingsEl.textContent = formatCZK(futureValues[futureValues.length - 1]);

    chart.data.labels = labels;
    chart.data.datasets = [
      {
        label: "Vloženo celkem",
        data: invested,
        borderColor: "#151e15",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: false,
      },
      {
        label: "Budoucí hodnota",
        data: futureValues,
        borderColor: "#4C704C",
        backgroundColor: "rgba(52,87,54,0.08)",
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: {
            target: 0
        },
      },
    ];
    chart.update();
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  [employeeInput, employerInput, yearsInput].forEach((el) =>
    el.addEventListener("input", update)
  );

  // Initial render
  update();
})();