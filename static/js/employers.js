let employerChart = null;
 
    function formatCZK(value) {
      return new Intl.NumberFormat('cs-CZ').format(Math.round(value)) + '\u00a0Kč';
    }
 
    function updateEmployerChart(benefitCosts, payrollCosts) {
      const chartData = {
        labels: ['Náklady na příspěvky', 'Mzdové náklady'],
        datasets: [{
          data: [benefitCosts, payrollCosts],
          backgroundColor: ['#4c704c', '#ece6df'],
          borderWidth: 0,
          borderRadius: 2,
          barPercentage: 0.55
        }]
      };
 
      if (employerChart) {
        employerChart.data.datasets[0].data = [benefitCosts, payrollCosts];
        employerChart.update('none');
        return;
      }
 
      employerChart = new Chart(document.getElementById('chart'), {
        type: 'bar',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500, easing: 'easeInOutQuart' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1c1c18',
              titleColor: '#fcf9f3',
              bodyColor: 'rgba(252,249,243,0.7)',
              padding: 10,
              cornerRadius: 2,
              titleFont: { family: "'Inter', sans-serif", size: 11, weight: '500' },
              bodyFont: { family: "'Inter', sans-serif", size: 11 },
              callbacks: {
                label: ctx => ' ' + formatCZK(ctx.raw)
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                font: { family: "'Inter', sans-serif", size: 11 },
                color: 'rgba(28,28,24,0.45)'
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(28,28,24,0.07)',
                drawTicks: false
              },
              border: { display: false },
              ticks: {
                font: { family: "'Inter', sans-serif", size: 10 },
                color: 'rgba(28,28,24,0.4)',
                maxTicksLimit: 5,
                callback: v => {
                  if (v >= 1000000) return (v / 1000000).toFixed(1) + ' mil. Kč';
                  if (v >= 1000) return (v / 1000).toFixed(0) + ' tis. Kč';
                  return v + ' Kč';
                }
              }
            }
          }
        }
      });
    }
 
    function updateEmployerCalculator() {
      const monthly = parseFloat(document.getElementById('employer-monthly').value) || 0;
      const employees = parseInt(document.getElementById('employer-employees').value) || 0;
      const benefitCosts = monthly * employees;
      const payrollCosts = benefitCosts * 1.338;
      const savings = payrollCosts - benefitCosts;
      document.getElementById('savings').textContent = formatCZK(savings);
      updateEmployerChart(benefitCosts, payrollCosts);
    }
 
    ['employer-monthly', 'employer-employees'].forEach(id =>
      document.getElementById(id).addEventListener('input', updateEmployerCalculator)
    );
 
    updateEmployerCalculator();