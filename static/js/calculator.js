const STRATEGIES = [
  { key: 'pp',     label: 'PP',                  rate: 0.0119, isDPS: true,  isDIP: false },
  { key: 'dps_k',  label: 'DPS konzervativní', rate: 0.0131, isDPS: true,  isDIP: false },
  { key: 'dps_v',  label: 'DPS vyvážené',       rate: 0.0414, isDPS: true,  isDIP: false },
  { key: 'dps_d',  label: 'DPS dynamické',       rate: 0.0715, isDPS: true,  isDIP: false },
  { key: 'dip',    label: 'DIP',                 rate: 0, isDPS: false, isDIP: true  },
];

const COLORS = ['#403726', '#816f4b', '#b4a27e', '#679867', '#4c704c'];

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIRH1Nrr2ZblR85Ii8UgJkzZjJs-o7medHKcN_hC7ffSP5Q6IliJYeUMY4l6JKCmb5/exec";

function fmt(n) {
  return Math.round(n).toLocaleString('cs-CZ') + ' Kč';
}

function stateContribution(monthlyClient, isDPS) {
  if (!isDPS) return 0;
  if (monthlyClient >= 500) {
    return Math.min(monthlyClient * 0.20, 340)
  } else {
    return 0;
  }
}

function annualTaxDeduction(yearlyClientTotal, isDIP) {
  if (isDIP) {
    return Math.min(yearlyClientTotal * 0.15, 7200);
  } else {
    const monthlyClient = yearlyClientTotal / 12;
    const qualifyingMonthly = Math.max(0, monthlyClient - 1700);
    return Math.min(qualifyingMonthly * 12 * 0.15, 7200);
  }
}

function calcFV(inputs, strategy, yearIndex) {
  const { monthlyClient, monthlyEmployer, yearlyEmployer, horizon, reinvestTax } = inputs;
  const r = strategy.rate;
  const isDPS = strategy.isDPS;
  const isDIP = strategy.isDIP;
  const n = yearIndex !== undefined ? yearIndex : horizon;

  const stateMonthly = stateContribution(monthlyClient, isDPS);
  const totalMonthly = monthlyClient + monthlyEmployer + stateMonthly;

  let fvMonthly = 0;
  for (let k = 1; k <= 12 * n; k++) {
    fvMonthly += totalMonthly * Math.pow(1 + r, (12 * n - k) / 12);
  }

  let fvYearlyEmployer = 0;
  for (let y = 1; y <= n; y++) {
    fvYearlyEmployer += yearlyEmployer * Math.pow(1 + r, n - y);
  }

  let fvTax = 0;
  if (reinvestTax) {
    let prevDeduction = 0;
    for (let y = 1; y <= n; y++) {
      const baseYearly = monthlyClient * 12;
      let effectiveBase;
      if (isDIP) {
        effectiveBase = baseYearly + prevDeduction;
      } else {
        const monthlyEffective = (baseYearly + prevDeduction) / 12;
        const qualifyingMonthly = Math.max(0, monthlyEffective - 1700);
        effectiveBase = qualifyingMonthly * 12;
      }
      const deduction = Math.min(0.15 * effectiveBase, 7200);
      fvTax += deduction * Math.pow(1 + r, n - y);
      prevDeduction = deduction;
    }
  }

  return fvMonthly + fvYearlyEmployer + fvTax;
}

function calcTotalInvested(inputs, strategy) {
  const { monthlyClient, monthlyEmployer, yearlyEmployer, horizon, reinvestTax } = inputs;
  const isDPS = strategy.isDPS;
  const isDIP = strategy.isDIP;
  const stateMonthly = stateContribution(monthlyClient, isDPS);
  const totalMonthly = monthlyClient + monthlyEmployer + stateMonthly;
  let invested = totalMonthly * 12 * horizon + yearlyEmployer * horizon;

  if (reinvestTax) {
    let deduction = 0;
    for (let y = 1; y <= horizon; y++) {
      const effectiveYearly = monthlyClient * 12 + deduction;
      if (isDIP) {
        deduction = Math.min(effectiveYearly * 0.15, 7200);
      } else {
        const effectiveMonthly = effectiveYearly / 12;
        deduction = Math.min(Math.max(0, effectiveMonthly - 1700) * 12 * 0.15, 7200);
      }
      if (y < horizon) invested += deduction;
    }
  }
  return invested;
}

function getInputs() {
  STRATEGIES.find(s => s.key === 'dip').rate = parseFloat(document.getElementById('DIP-yield').value) / 100 || 0;
  return {
    monthlyClient:   parseFloat(document.getElementById('monthly-client').value)   || 0,
    monthlyEmployer: parseFloat(document.getElementById('monthly-employer').value)  || 0,
    yearlyEmployer:  parseFloat(document.getElementById('yearly-employer').value)   || 0,
    horizon:         parseInt(document.getElementById('investment-horizon').value)  || 1,
    reinvestTax:     document.getElementById('tax-deduction').checked,
  };
}

function renderParamsTable(inputs) {
  const { monthlyClient, monthlyEmployer, yearlyEmployer } = inputs;
  const tbody = document.querySelector('#product-parameters tbody');
  tbody.innerHTML = '';

  const rows = [
    {
      label: 'Státní příspěvek měsíčně',
      values: STRATEGIES.map(s => stateContribution(monthlyClient, s.isDPS)),
    },
    {
      label: 'Celková měsíční úložka',
      values: STRATEGIES.map(s => {
        const state = stateContribution(monthlyClient, s.isDPS);
        return monthlyClient + monthlyEmployer + state;
      }),
    },
    {
      label: 'Roční příspěvek zaměstnavatele',
      values: STRATEGIES.map(() => yearlyEmployer),
    },
    {
      label: 'Roční daňová úspora (1. rok)',
      values: STRATEGIES.map(s => annualTaxDeduction(monthlyClient * 12, s.isDIP)),
    },
  ];

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th>${row.label}</th>` +
      row.values.map(v => `<td>${fmt(v)}</td>`).join('');
    tbody.appendChild(tr);
  });
}

function renderProfitsTable(inputs) {
  const tbody = document.querySelector('#profits tbody');
  tbody.innerHTML = '';

  const fvs      = STRATEGIES.map(s => calcFV(inputs, s));
  const invested = STRATEGIES.map(s => calcTotalInvested(inputs, s));
  const profits  = fvs.map((fv, i) => fv - invested[i]);

  const rowsFV = [
    { label: 'Celková budoucí hodnota', values: fvs,      cls: 'profits-row-fv' },
    { label: 'Celkem investováno',      values: invested,  cls: '' },
    { label: 'Celkový výnos',           values: profits,   cls: '' },
  ];

  rowsFV.forEach(row => {
    const tr = document.createElement('tr');
    if (row.cls) tr.className = row.cls;
    tr.innerHTML = `<th>${row.label}</th>` +
      row.values.map(v => `<td>${fmt(v)}</td>`).join('');
    tbody.appendChild(tr);
  });

  // Store results for the CTA box
  window._calcResults = {
    dipFV: fvs[4],
    dipProfit: profits[4],
    monthlyClient: inputs.monthlyClient,
    horizon: inputs.horizon,
  };

  updateCalculatorCTA();
}

// ── Calculator CTA box ─────────────────────────────────────────────────────

function updateCalculatorCTA() {
  const cta = document.getElementById('calc-cta');
  if (!cta || !window._calcResults) return;

  const { dipFV, monthlyClient, horizon } = window._calcResults;

  // Only show if user has entered meaningful values
  if (monthlyClient <= 0) {
    cta.style.display = 'none';
    return;
  }

  cta.style.display = 'flex';

  const dipFVFormatted = Math.round(dipFV).toLocaleString('cs-CZ');
  document.getElementById('cta-result-highlight').textContent =
    `${dipFVFormatted} Kč za ${horizon} let`;
}

function initCalculatorCTA() {
  const resultsSection = document.querySelector('.calc-results');
  if (!resultsSection) return;

  const ctaHTML = `
    <div class="calc-cta-box visible" id="calc-cta" style="display:none;">
      <div class="calc-cta-text visible">
        <span class="sup-heading visible">Váš výsledek</span>
        <h4 class="visible">DIP může vynést až <span id="cta-result-highlight"></span></h4>
        <p class="visible">Chcete vědět, jak konkrétně tohoto výsledku dosáhnout?<br>Rezervujte si nezávaznou 30 minutovou konzultaci.</p>
      </div>
      <div class="calc-cta-actions visible">
        <a class="visible primary-button" href="https://tidycal.com/pgersl05/do-penze-bez-penze-btc" target="_blank" class="calc-cta-button">
          Rezervovat konzultaci &nbsp; &rarr;
        </a>
        <div class="calc-cta-form visible">
          <p class="calc-cta-form-label visible">Nebo nechte e-mail — ozveme se:</p>
          <div class="calc-cta-inputs visible">
            <input type="text"  id="cta-name"  placeholder="Jméno" />
            <input type="email" id="cta-email" placeholder="E-mail" />
            <button id="cta-submit">Odeslat</button>
          </div>
          <p id="cta-feedback" class="visible" style="font-size:.75rem; margin-top:.5rem;"></p>
        </div>
      </div>
    </div>
  `;

  resultsSection.insertAdjacentHTML('beforeend', ctaHTML);

  document.getElementById('cta-submit').addEventListener('click', async () => {
    const name  = document.getElementById('cta-name').value.trim();
    const email = document.getElementById('cta-email').value.trim();
    const feedback = document.getElementById('cta-feedback');

    if (!email) {
      feedback.textContent = 'Vyplňte prosím e-mail.';
      feedback.style.color = '#7a4a3a';
      return;
    }

    const { dipFV, monthlyClient, horizon } = window._calcResults || {};

    const payload = {
      jmeno:    name,
      email:    email,
      zprava:   `Zájem ze srovnávače — DIP projekce: ${Math.round(dipFV).toLocaleString('cs-CZ')} Kč / horizont: ${horizon} let / měsíční úložka: ${monthlyClient} Kč`,
      source:   'srovnavac-cta',
    };

    document.getElementById('cta-submit').disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    setTimeout(() => {
      feedback.textContent = 'Odesláno — ozveme se do 2 pracovních dnů.';
      feedback.style.color = 'rgba(242,239,233,0.2)';
      document.getElementById('cta-name').value  = '';
      document.getElementById('cta-email').value = '';
    }, 600);
  });
}

let growthChart = null;

function renderChart(inputs) {
  const { horizon } = inputs;
  const labels = [];
  for (let y = 0; y <= horizon; y++) labels.push(y === 0 ? '0' : String(y));

  const datasets = STRATEGIES.map((s, i) => {
    const data = labels.map((_, idx) => {
      if (idx === 0) return 0;
      return Math.round(calcFV(inputs, s, idx));
    });
    return {
      label: s.label,
      data,
      borderColor: COLORS[i],
      backgroundColor: COLORS[i] + '18',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: false,
    };
  });

  const legendEl = document.getElementById('chart-legend');
  legendEl.innerHTML = STRATEGIES.map((s, i) => `
    <span class="legend-item">
      <span class="legend-dot" style="background:${COLORS[i]}"></span>
      ${s.label}
    </span>`).join('');

  const gridColor = '#7c7c6a33';
  const tickColor = '#7c7c6a';

  if (growthChart) {
    growthChart.data.labels = labels;
    growthChart.data.datasets = datasets;
    growthChart.update();
    return;
  }

  growthChart = new Chart(document.getElementById('growth-chart'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString('cs-CZ')} Kč`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Rok', color: tickColor, font: { family: "'Inter', sans-serif", size: 11 } },
          ticks: { color: tickColor, font: { size: 11 } },
          grid: { color: gridColor },
        },
        y: {
          title: { display: true, text: 'Hodnota (Kč)', color: tickColor, font: { family: "'Inter', sans-serif", size: 11 } },
          ticks: {
            color: tickColor,
            font: { family: "'Inter', sans-serif", size: 11 },
            callback: v => (v >= 1000000
              ? (v/1000000).toFixed(1) + ' mil.'
              : v >= 1000
              ? (v/1000).toFixed(0) + ' tis.'
              : v),
          },
          grid: { color: gridColor },
        },
      },
    },
  });
}

function update() {
  const inputs = getInputs();
  renderParamsTable(inputs);
  renderChart(inputs);
  renderProfitsTable(inputs);
}

['monthly-client','monthly-employer','yearly-employer','investment-horizon', 'DIP-yield'].forEach(id => {
  document.getElementById(id).addEventListener('input', update);
});
document.getElementById('tax-deduction').addEventListener('change', update);

// Init CTA box then run first update
initCalculatorCTA();
update();