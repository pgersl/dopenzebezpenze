Chart.defaults.font.family = 'Raleway, sans-serif';

// BUILDER

const categoryToggles = document.querySelectorAll('.category-title');

categoryToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const category = toggle.parentElement;
        category.classList.toggle('toggled');
    });
});

const categoryListOptionCheckboxes = document.querySelectorAll('.category-list-option-checkbox');

categoryListOptionCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const weightInput = this.parentElement.querySelector('input[type="text"]');
        if (this.checked) {
            weightInput.disabled = false;
        } else {
            weightInput.disabled = true;
            weightInput.value = '';
        }
    });
});

let instrumentsData = [];

fetch('/json/app.json')
    .then(res => res.json())
    .then(data => {
        instrumentsData = data.instruments;
    });

function getSelectedInstrumentsWithWeights() {
    const selected = [];

    instrumentsData.forEach(instr => {
        const checkbox = document.getElementById(instr.id);
        const weightInput = document.getElementById(`${instr.id}_weight`);

        if (!checkbox || !checkbox.checked) return;

        const weight = parseFloat(weightInput.value) || 0;
        if (weight <= 0) return;

        selected.push({
            ...instr,
            weight: weight / 100 // normalize to 0–1
        });
    });

    return selected;
}

function getCommonYears(selectedInstruments) {
    if (selectedInstruments.length === 0) return [];

    return Object.keys(selectedInstruments[0].cagr)
        .map(Number)
        .filter(year =>
            selectedInstruments.every(instr =>
                instr.cagr[year] !== undefined &&
                instr.totalReturn[year] !== undefined
            )
        )
        .sort((a, b) => a - b);
}

function calculatePortfolioCAGR(selected, years) {
    const result = {};

    years.forEach(year => {
        result[year] = selected.reduce((sum, instr) => {
            return sum + instr.weight * instr.cagr[year];
        }, 0);
    });

    return result;
}

function calculatePortfolioTotalReturn(selected, years) {
    const result = {};

    years.forEach(year => {
        result[year] = selected.reduce((sum, instr) => {
            return sum + instr.weight * instr.totalReturn[year];
        }, 0);
    });

    return result;
}

function renderPortfolioTable(years, cagr, totalReturn) {
    const container = document.getElementById('portfolio-table-body');

    if (years.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = ``;

    years.forEach(year => {
        html += `
            <tr>
                <td>${year} let</td>
                <td>${totalReturn[year].toFixed(2)} %</td>
                <td>${cagr[year].toFixed(2)} % p.a. <button data-value="${cagr[year].toFixed(2)}"><i class="fa-solid fa-arrow-right-from-bracket"></i></button></td>
            </tr>
        `;
    });

    container.innerHTML = html;
}

const cty = document.getElementById('portfolio-chart');

const portfolioChart = new Chart(cty, {
    type: 'pie',
    data: {
        labels: [
            'Akcie',
            'Dluhopisy',
            'Nemovitosti',
            'Drahé kovy',
            'Bitcoin'
        ],
        datasets: [{
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
                '#c2a070',
                '#b3884d',
                '#639c6f',
                '#507c59',
                '#3c5d42'
            ]
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom'
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const data = context.dataset.data;
                        const value = context.raw;
                        const total = data.reduce((a, b) => a + b, 0);

                        if (total === 0) return `${context.label}: 0%`;

                        const percentage = ((value / total) * 100).toFixed(0);
                        return `${context.label}: ${percentage}%`;
                    }
                }
            }
        }
    }
});

function groupByCategory(selected) {
    const groups = {};

    selected.forEach(instr => {
        if (!groups[instr.type]) {
            groups[instr.type] = [];
        }
        groups[instr.type].push(instr);
    });
    return groups;
}

function scoreAssetClasses(selected) {
    const groups = groupByCategory(selected);

    const classWeights = Object.values(groups).map(items =>
        items.reduce((sum, i) => sum + i.weight, 0)
    );

    const usedClasses = classWeights.filter(w => w >= 0.05).length;

    let score = 0;
    if (usedClasses === 1) score = 0;
    else if (usedClasses === 2) score = 45;
    else if (usedClasses === 3) score = 75;
    else if (usedClasses >= 4) score = 100;
    return score;
}

function scoreConcentration(selected) {
    const groups = {};

    selected.forEach(instr => {
        const type = instr.type;
        groups[type] = (groups[type] || 0) + instr.weight;
    });

    const categoryWeights = Object.values(groups);
    const largestCategory = Math.max(...categoryWeights);

    let score = 100;

    if (largestCategory >= 0.6) score = 10;
    else if (largestCategory >= 0.4) score = 40;
    else if (largestCategory > 0.3) score = 75;

    return Math.max(0, Math.min(100, score));
}


function getDiversificationGrade(selected) {
    const A = scoreAssetClasses(selected);
    const C = scoreConcentration(selected);

    const finalScore = 0.5 * A + 0.5 * C;
    let grade = 'F';
    let label = 'Tak toto by neprošlo. Zkuste si s vaším portfoliem více pohrát a přidat další třídy aktiv, případně více různých nástrojů.';

    if (finalScore >= 95) { grade = 'A+'; label = 'Tak toto je na výbornou, skvěle diversifikované portfolio!'; }
    else if (finalScore >= 90) { grade = 'A'; label = 'Skvělá práce, tohle je téměř perfektně diversifikované portfolio.'; }
    else if (finalScore >= 80) { grade = 'B'; label = 'Tohle vypadá na solidní portfolio. Ale je připravené na všechno?'; }
    else if (finalScore >= 70) { grade = 'C'; label = 'Tohle portfolio vypadá zajímavě, ale v některých aktivech je možná trochu moc koncentrované, zkuste něco přidat!'; }
    else if (finalScore >= 50) { grade = 'D'; label = 'Tohle není portfolio do každého počasí, zkuste si s ním ještě pohrát!'; }

    return {
        score: Math.round(finalScore),
        grade,
        label,
        breakdown: { A, C }
    };
}

function getCryptoWarning(selected) {
    const cryptoWeight = selected
        .filter(i => i.type === 'crypto')
        .reduce((s, i) => s + i.weight, 0);
    if (cryptoWeight >= 0.3) {
        return 'Vypadá to, že kryptoměny tvoří nemalou část vašeho portfolia. Mějte na paměti, že kryptoměny jsou velmi volatilní a mohou výrazně ovlivnit stabilitu vašeho portfolia.';
    }

    return null;
}


function getWeights() {
    const usStocks = parseInt(document.getElementById('us_stocks_weight').value) || 0;
    const euStocks = parseInt(document.getElementById('eu_stocks_weight').value) || 0;
    const emStocks = parseInt(document.getElementById('em_stocks_weight').value) || 0;
    const equity = usStocks + euStocks + emStocks;

    const usBonds = parseInt(document.getElementById('us_bonds_weight').value) || 0;
    const corpBonds = parseInt(document.getElementById('corp_bonds_weight').value) || 0;
    const bonds = usBonds + corpBonds;

    const realEstate = parseInt(document.getElementById('real_estate_weight').value) || 0;

    const gold = parseInt(document.getElementById('gold_weight').value) || 0;
    const silver = parseInt(document.getElementById('silver_weight').value) || 0;
    const commodities = gold + silver;

    const bitcoin = parseInt(document.getElementById('bitcoin_weight').value) || 0;

    const weightCheck = equity + bonds + realEstate + commodities + bitcoin;
    const alertMessage = document.getElementById('pie-alert');
    if (weightCheck !== 100) {
        alertMessage.classList.add('alerted');
        cty.style.opacity = 0;
    } else {
        alertMessage.classList.remove('alerted');
        cty.style.opacity = 1;
    }

    
    return [equity, bonds, realEstate, commodities, bitcoin];
}

function updatePortfolioData() {
    const selected = getSelectedInstrumentsWithWeights();
    const years = getCommonYears(selected);

    if (years.length === 0) {
        document.getElementById('portfolio-data').innerHTML = '';
        return;
    }

    const cagr = calculatePortfolioCAGR(selected, years);
    const totalReturn = calculatePortfolioTotalReturn(selected, years);

    renderPortfolioTable(years, cagr, totalReturn);
    const diversification = getDiversificationGrade(selected);
    const cryptoWarning = getCryptoWarning(selected);
    
    document.getElementById('diversification-grade-letter').textContent = diversification.grade;
    document.getElementById('diversification-grade-letter').setAttribute('data-score', diversification.grade);
    document.getElementById('diversification-label').textContent = diversification.label;


    if (cryptoWarning) {
        document.getElementById('crypto-warning').textContent = cryptoWarning;
        document.getElementById('crypto-warning').classList.add('warning');
    } else {
        document.getElementById('crypto-warning').classList.remove('warning');
    }

}

function updateChart() {
    const weights = getWeights();
    portfolioChart.data.datasets[0].data = weights;
    portfolioChart.update();

    const weightCheck = weights.reduce((a, b) => a + b, 0);
    if (weightCheck === 100) {
        updatePortfolioData();
    }
    const cagrButtons = document.querySelectorAll('.portfolio-table button');

    cagrButtons.forEach(button => {
        button.addEventListener('click', function() {
            const value = button.getAttribute('data-value');
            scrollTo(0, document.getElementById('investing-calculator').offsetTop - 160);
            growth.value = value;
            oneTime.value = '100000';
            monthly.value = '1500';
            years.value = '10';
            calculate();
        });
    });
}

const chartInputs = document.querySelectorAll('.builder-content input');

chartInputs.forEach(input => {
    input.addEventListener('input', updateChart);
});


// CALCULATOR

const oneTime = document.getElementById('calculator-onetime');
const monthly = document.getElementById('calculator-monthly');
const growth = document.getElementById('calculator-growth');
const years = document.getElementById('calculator-years');
const inflation = document.getElementById('calculator-inflation');
const inflationValueLabel = document.getElementById('inflation-value');
const yearsValueLabel = document.getElementById('years-value');


const subtotalValue = document.getElementById('subtotal-value');
const totalValue = document.getElementById('total-value');
const profitValue = document.getElementById('profit-value');
const profitContainer = document.getElementById('profit');

const ctx = document.getElementById('investment-chart');

let investmentChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Celkové vklady',
                data: [],
                borderWidth: 1,
                tension: 0.3,
                borderColor: '#3b2f2b',
                backgroundColor: '#3b2f2b'
            },
            {
                label: 'Celková hodnota',
                data: [],
                borderWidth: 1,
                tension: 0.3,
                borderColor: '#507c59',
                backgroundColor: '#507c5977',
                fill: {
                    target: 0
                }
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom'
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const value = Math.round(context.parsed.y);
                        return `${context.dataset.label}: ${value.toLocaleString('cs-CZ')} Kč`;
                    }
                }
            }
        },
        scales: {
            y: {
                ticks: {
                    callback: value => `${value.toLocaleString('cs-CZ')} Kč`
                }
            }
        }
        
    }
});

function calculate() {
    const oneTimeValue = parseFloat(oneTime.value) || 0;
    const monthlyValue = parseFloat(monthly.value) || 0;
    const nominalGrowth = parseFloat(growth.value) / 100 || 0;
    const inflationRate = parseFloat(inflation.value) / 100 || 0;
    const yearsValue = years.value || 0;

    inflationValueLabel.textContent = inflation.value;
    yearsValueLabel.textContent = years.value;

    const realGrowth = nominalGrowth - inflationRate;

    const months = yearsValue * 12;

    let labels = [];
    let investedData = [];
    let totalData = [];

    let invested = oneTimeValue;
    let total = oneTimeValue;

    labels.push('0. rok')
    investedData.push(invested);
    totalData.push(total);

    for (let i = 1; i <= months; i++) {
        invested += monthlyValue;

        total *= Math.pow(1 + realGrowth, 1 / 12);
        total += monthlyValue;

        if (i % 12 === 0) {
            labels.push(`${i / 12}. rok`);
            investedData.push(invested);
            totalData.push(total);
        }
    }

    const subtotal = oneTimeValue + monthlyValue * months;
    const profit = total - subtotal;

    if (profit < 0) {
        profitContainer.classList.add('loss');
        investmentChart.data.datasets[1].backgroundColor = '#b84b4b6b';
        investmentChart.data.datasets[1].borderColor = '#b84b4b';
    } else {
        profitContainer.classList.remove('loss');
        investmentChart.data.datasets[1].backgroundColor = '#507c5977';
        investmentChart.data.datasets[1].borderColor = '#507c59';
    }

    subtotalValue.textContent = subtotal.toLocaleString('cs-CZ', {maximumFractionDigits: 0, minimumFractionDigits: 0}) + ' Kč';
    totalValue.textContent = total.toLocaleString('cs-CZ', {maximumFractionDigits: 0, minimumFractionDigits: 0}) + ' Kč';
    profitValue.textContent = profit.toLocaleString('cs-CZ', {maximumFractionDigits: 0, minimumFractionDigits: 0}) + ' Kč';


    investmentChart.data.labels = labels;
    investmentChart.data.datasets[0].data = investedData;
    investmentChart.data.datasets[1].data = totalData;
    investmentChart.update();
}


oneTime.addEventListener('input', calculate);
monthly.addEventListener('input', calculate);
growth.addEventListener('input', calculate);
years.addEventListener('input', calculate);
inflation.addEventListener('input', calculate);

calculate();