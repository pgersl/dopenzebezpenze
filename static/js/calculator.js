const STRATEGIES = [
  { key: 'pp',     label: 'PP',                  rate: 0.0119, isDPS: true,  isDIP: false },
  { key: 'dps_k',  label: 'DPS konzervativní', rate: 0.0131, isDPS: true,  isDIP: false },
  { key: 'dps_v',  label: 'DPS vyvážené',       rate: 0.0414, isDPS: true,  isDIP: false },
  { key: 'dps_d',  label: 'DPS dynamické',       rate: 0.0715, isDPS: true,  isDIP: false },
  { key: 'dip',    label: 'DIP',                 rate: 0, isDPS: false, isDIP: true  },
];

const COLORS = ['#403726', '#816f4b', '#b4a27e', '#679867', '#4c704c'];

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

  // ---------------- TAX REINVESTMENT (correct recursion) ----------------
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
          ticks: {
            color: tickColor,
            font: { size: 11 },
          },
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

update();