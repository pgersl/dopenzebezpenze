const monthlyClient = document.getElementById('monthly-client');

const strategyContainers = document.querySelectorAll('.strategy-output-box');
const strategySavingsContainers = document.querySelectorAll('.strategy-output-savings');

const strategyTaxSavings = document.getElementById('tax-savings');
const strategyStateContribution = document.getElementById('state-contribution');

const cty = document.getElementById("strategy-chart").getContext("2d");

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIRH1Nrr2ZblR85Ii8UgJkzZjJs-o7medHKcN_hC7ffSP5Q6IliJYeUMY4l6JKCmb5/exec";

function chooseStrategy(monthly) {
    strategyContainers.forEach((container) => container.style.display = 'none');
    strategySavingsContainers.forEach((container) => container.style.display = 'none');
    if (monthly === 0) {
        strategyContainers[0].style.display = 'block';
    } else if (monthly <= 4000) {
        strategyContainers[1].style.display = 'block';
        strategySavingsContainers[0].style.display = 'flex';
    } else if (monthly < 4500) {
        strategyContainers[2].style.display = 'block';
        strategySavingsContainers[0].style.display = 'flex';
    } else if (monthly <= 5700) {
        strategyContainers[3].style.display = 'block';
        strategySavingsContainers.forEach((container) => container.style.display = 'flex');
    } else {
        strategyContainers[4].style.display = 'block';
        strategySavingsContainers.forEach((container) => container.style.display = 'flex');
    }
}

let strategyChart = null;

function getStrategyLabel(monthly) {
    if (monthly <= 4000) return 'DIP';
    if (monthly < 4500)  return 'DIP + Podílový fond';
    if (monthly <= 5700) return 'DIP + Dynamické DPS';
    return 'DIP + Dynamické DPS + Podílový fond';
}

function updateStrategyChart(monthly) {
    let dip = 0, dps = 0, fund = 0, taxSavings = 0, stateContribution = 0;

    if (monthly <= 4000) {
        dip = monthly;
        taxSavings = (monthly * 12 * 0.15).toFixed(0) + ' Kč';
    } else if (monthly < 4500) {
        dip = 4000;
        fund = monthly - 4000;
        taxSavings = 7200 + ' Kč';
    } else if (monthly <= 5700) {
        dip = 4000;
        dps = monthly - 4000;
        taxSavings = 7200 + ' Kč';
        stateContribution = (dps * 0.2).toFixed(0) + ' Kč';
    } else {
        dip = 4000;
        dps = 1700;
        fund = monthly - 5700;
        taxSavings = 7200 + ' Kč';
        stateContribution = 340 + ' Kč';
    }
    strategyTaxSavings.textContent = taxSavings;
    strategyStateContribution.textContent = stateContribution;
    if (strategyChart) {
        strategyChart.data.datasets[0].data = [dip];
        strategyChart.data.datasets[1].data = [dps];
        strategyChart.data.datasets[2].data = [fund];
        strategyChart.update();
    }

    // Update CTA
    updateStrategyCTA(monthly, taxSavings, stateContribution);
}

function initStrategyChart() {
    strategyChart = new Chart(cty, {
        type: 'bar',
        data: {
            labels: ['Úložka'],
            datasets: [
                {
                    label: 'DIP',
                    data: [0],
                    backgroundColor: '#4c704c',
                    borderWidth: 0,
                    borderRadius: { topLeft: 4, bottomLeft: 4 },
                    borderSkipped: false,
                },
                {
                    label: 'Dynamické DPS',
                    data: [0],
                    backgroundColor: '#679867',
                    borderWidth: 0,
                    borderRadius: 0,
                    borderSkipped: false,
                },
                {
                    label: 'Podílový fond',
                    data: [0],
                    backgroundColor: '#a4c1a4',
                    borderWidth: 0,
                    borderRadius: { topRight: 4, bottomRight: 4 },
                    borderSkipped: false,
                },
            ],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}`,
                    },
                },
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: 'rgba(52,87,54,0.08)' },
                    ticks: {
                        color: 'rgba(28,28,24,0.45)',
                        font: { family: 'Inter', size: 11 },
                        callback: (v) => v.toLocaleString('cs-CZ') + ' Kč',
                    },
                    border: { display: false },
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { display: false },
                    border: { display: false },
                },
            },
        },
    });
}

// ── Strategy CTA ──────────────────────────────────────────────────────────

function initStrategyCTA() {
    const calculator = document.getElementById('strategy-calculator');
    if (!calculator) return;

    const ctaHTML = `
        <div class="strategy-cta-box visible" id="strategy-cta" style="display:none;">
            <div class="strategy-cta-text visible">
                <span class="sup-heading">Připraveno pro vás</span>
                <h4>Vaše optimální strategie: <span id="strategy-cta-label"></span></h4>
                <p>Chcete ji nastavit? Rezervujte si nezávaznou 30 minutovou konzultaci nebo nechte e-mail.</p>
            </div>
            <div class="strategy-cta-actions visible">
                <a class="visible primary-button" href="https://tidycal.com/pgersl05/do-penze-bez-penze-btc" target="_blank" class="calc-cta-button">
                    Rezervovat konzultaci &nbsp; &rarr;
                </a>
                <div class="calc-cta-form visible">
                    <p class="calc-cta-form-label visible">Nebo nechte e-mail — ozveme se:</p>
                    <div class="calc-cta-inputs visible">
                        <input type="text"  id="cta-name"  placeholder="Jméno" />
                        <input type="email" id="strategy-cta-email" placeholder="Váš e-mail" />
                        <button id="strategy-cta-submit">Odeslat</button>
                    </div>
                    <p class="visible" id="strategy-cta-feedback" style="font-size:.75rem; margin-top:.5rem;"></p>
                </div>
            </div>
        </div>
    `;

    calculator.insertAdjacentHTML('beforeend', ctaHTML);

    document.getElementById('strategy-cta-submit').addEventListener('click', async () => {
        const email    = document.getElementById('strategy-cta-email').value.trim();
        const name     = document.getElementById('cta-name').value.trim();
        const feedback = document.getElementById('strategy-cta-feedback');
        const monthly  = parseFloat(monthlyClient.value) || 0;

        if (!email) {
            feedback.textContent = 'Vyplňte prosím e-mail.';
            feedback.style.color = '#7a4a3a';
            return;
        }

        const strategy = getStrategyLabel(monthly);

        const payload = {
            email:    email,
            jmeno:    name,
            zprava:  `Zájem ze strategické kalkulačky — strategie: ${strategy} / měsíční úložka: ${monthly} Kč`,
            source:  'strategie-cta',
        };

        document.getElementById('strategy-cta-submit').disabled = true;

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).catch(() => {});

        setTimeout(() => {
            feedback.textContent = 'Odesláno — ozveme se do 2 pracovních dnů.';
            feedback.style.color = 'rgba(242,239,233,0.9)';
            document.getElementById('strategy-cta-email').value = '';
        }, 600);
    });
}

function updateStrategyCTA(monthly, taxSavings, stateContribution) {
    const cta = document.getElementById('strategy-cta');
    if (!cta) return;

    if (monthly <= 0) {
        cta.style.display = 'none';
        return;
    }

    cta.style.display = 'flex';
    document.getElementById('strategy-cta-label').textContent = getStrategyLabel(monthly);
}

initStrategyChart();
initStrategyCTA();

function updateStrategy() {
    const monthly = parseFloat(monthlyClient.value) || 0;
    chooseStrategy(monthly);
    updateStrategyChart(monthly);
}

monthlyClient.addEventListener('input', updateStrategy);
updateStrategy();