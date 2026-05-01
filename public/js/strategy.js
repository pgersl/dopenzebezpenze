const monthlyClient = document.getElementById('monthly-client');

const strategyContainers = document.querySelectorAll('.strategy-output-box');
const strategySavingsContainers = document.querySelectorAll('.strategy-output-savings');

const strategyTaxSavings = document.getElementById('tax-savings');
const strategyStateContribution = document.getElementById('state-contribution');

const cty = document.getElementById("strategy-chart").getContext("2d");

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

initStrategyChart();

function updateStrategy() {
    const monthly = parseFloat(monthlyClient.value) || 0;
    chooseStrategy(monthly);
    updateStrategyChart(monthly);
}

monthlyClient.addEventListener('input', updateStrategy);
updateStrategy();