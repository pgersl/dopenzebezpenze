/**
 * prezentace.js
 * Handles: scroll-based slide tracking, nav dots, progress bar,
 * keyboard navigation, employer savings calculator, growth chart.
 */

(() => {
  'use strict';

  // ── Constants ─────────────────────────────────────────────
  const ANNUAL_RATE = 0.079;
  const SOCIAL_HEALTH_MULTIPLIER = 0.338; // employer overhead rate

  // ── DOM refs ──────────────────────────────────────────────
  const slides      = Array.from(document.querySelectorAll('.prez-slide'));
  const dots        = Array.from(document.querySelectorAll('.prez-dot'));
  const progress    = document.getElementById('prez-progress');
  const counter     = document.getElementById('prez-counter');
  const currentEl   = document.getElementById('prez-current');
  const hint        = document.getElementById('prez-hint');

  let currentSlide  = 0;
  let hintHidden    = false;
  let isScrolling   = false;  // debounce flag to prevent multi-slide jumps

  // ── Snap to slide ─────────────────────────────────────────
  function goTo(index) {
    const target = Math.max(0, Math.min(index, slides.length - 1));
    if (target === currentSlide) return;
    slides[target].scrollIntoView({ behavior: 'smooth' });
    activateSlide(target);
    hideHint();
  }

  function throttledScroll(delta) {
    if (isScrolling) return;
    isScrolling = true;
    if (delta > 0) goTo(currentSlide + 1);
    else           goTo(currentSlide - 1);
    setTimeout(() => { isScrolling = false; }, 900);
  }

  // ── Wheel (mouse scroll) ──────────────────────────────────
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    throttledScroll(e.deltaY);
  }, { passive: false });

  // ── Touch swipe ───────────────────────────────────────────
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) throttledScroll(delta);
  }, { passive: true });

  // ── Helpers ───────────────────────────────────────────────
  function formatCZK(value) {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  function pad(n) {
    return String(n + 1).padStart(2, '0');
  }

  // ── Slide activation ──────────────────────────────────────
  function activateSlide(index) {
    currentSlide = index;

    // Dots
    dots.forEach((d, i) => d.classList.toggle('active', i === index));

    // Counter
    currentEl.textContent = pad(index);

    // Progress bar
    const pct = slides.length <= 1 ? 100 : (index / (slides.length - 1)) * 100;
    progress.style.width = pct + '%';

    // Dark-slide styling for counter
    const slide = slides[index];
    const isDark = slide.classList.contains('slide-dark') || slide.classList.contains('slide-accent');
    counter.classList.toggle('on-dark', isDark);

    // Dot colour on dark slides
    const navEl = document.getElementById('prez-nav');
    navEl.classList.toggle('on-dark', isDark);
  }

  // ── IntersectionObserver for slide entry animations ───────
  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        const idx = slides.indexOf(entry.target);
        if (idx !== -1) activateSlide(idx);
      }
    });
  }, {
    threshold: 0.4,
  });

  slides.forEach(s => slideObserver.observe(s));

  // ── Keyboard navigation ───────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      goTo(currentSlide + 1);
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goTo(currentSlide - 1);
    }
  });

  // ── Dot click navigation ──────────────────────────────────
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      slides[i].scrollIntoView({ behavior: 'smooth' });
      activateSlide(i);
      hideHint();
    });
  });

  // ── Hint auto-hide ────────────────────────────────────────
  function hideHint() {
    if (hintHidden) return;
    hintHidden = true;
    hint.classList.add('hidden');
  }

  // Hide after 5 seconds
  setTimeout(hideHint, 5000);

  // ── SLIDE 4: Employer savings calculator + chart ──────────
  const scAmount    = document.getElementById('sc-amount');
  const scEmployees = document.getElementById('sc-employees');
  const scMonthly   = document.getElementById('sc-monthly');
  const scAnnual    = document.getElementById('sc-annual');
  const scCanvas    = document.getElementById('sc-chart');

  let scChart = null;

  function calcSavings() {
    const amount    = parseFloat(scAmount?.value)    || 0;
    const employees = parseInt(scEmployees?.value)   || 0;
    const benefitTotal  = amount * employees;
    const salaryTotal   = benefitTotal * (1 + SOCIAL_HEALTH_MULTIPLIER);
    const saving        = salaryTotal - benefitTotal;

    if (scMonthly) scMonthly.textContent = formatCZK(saving);
    if (scAnnual)  scAnnual.textContent  = formatCZK(saving * 12);

    renderSavingsChart(benefitTotal, salaryTotal);
  }

  function renderSavingsChart(benefit, salary) {
    if (!scCanvas) return;
    const ctx = scCanvas.getContext('2d');
    const data = {
      labels: ['Příspěvek na DIP', 'Jako navýšení mzdy'],
      datasets: [{
        data: [benefit, salary],
        backgroundColor: ['rgba(242,239,233,0.7)', 'rgba(242,239,233,0.15)'],
        borderColor:     ['rgba(242,239,233,0.9)', 'rgba(242,239,233,0.3)'],
        borderWidth: 1,
        borderRadius: 2,
        barPercentage: 0.55,
      }],
    };

    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(21,30,21,0.92)',
          titleColor:      '#f2efe9',
          bodyColor:       'rgba(242,239,233,0.7)',
          padding: 10,
          cornerRadius: 2,
          callbacks: {
            label: ctx => ' ' + formatCZK(ctx.raw),
          },
        },
      },
      scales: {
        x: {
          grid:   { display: false },
          border: { display: false },
          ticks: {
            color: 'rgba(242,239,233,0.45)',
            font: { family: "'Inter', sans-serif", size: 11 },
          },
        },
        y: {
          beginAtZero: true,
          grid:   { color: 'rgba(242,239,233,0.08)', drawTicks: false },
          border: { display: false },
          ticks: {
            color: 'rgba(242,239,233,0.35)',
            font: { family: "'Inter', sans-serif", size: 10 },
            maxTicksLimit: 4,
            callback: v => v >= 1000 ? (v/1000).toFixed(0) + ' tis.' : v,
          },
        },
      },
    };

    if (scChart) {
      scChart.data = data;
      scChart.update('none');
    } else {
      scChart = new Chart(ctx, { type: 'bar', data, options: opts });
    }
  }

  [scAmount, scEmployees].forEach(el => el?.addEventListener('input', calcSavings));
  calcSavings();

  // ── SLIDE 5: Growth chart ─────────────────────────────────
  const giEmployer  = document.getElementById('gi-employer');
  const giYears     = document.getElementById('gi-years');
  const giEmpVal    = document.getElementById('gi-employer-val');
  const giYrsVal    = document.getElementById('gi-years-val');
  const grYearsEl   = document.getElementById('gr-years');
  const grValueEl   = document.getElementById('gr-value');
  const growthCanvas= document.getElementById('growth-chart');

  let growthChart = null;

  function calcGrowth(monthlyEmployer, years) {
    const labels   = [];
    const invested = [];
    const fvs      = [];

    for (let y = 0; y <= years; y++) {
      labels.push(y);
      invested.push(monthlyEmployer * 12 * y);

      let fv = 0;
      for (let m = 1; m <= 12 * y; m++) {
        fv += monthlyEmployer * Math.pow(1 + ANNUAL_RATE, (12 * y - m) / 12);
      }
      fvs.push(Math.round(fv));
    }
    return { labels, invested, fvs };
  }

  function renderGrowthChart() {
    if (!growthCanvas) return;
    const employer = parseInt(giEmployer?.value) || 1334;
    const years    = parseInt(giYears?.value)    || 25;

    if (giEmpVal) giEmpVal.textContent = employer.toLocaleString('cs-CZ');
    if (giYrsVal) giYrsVal.textContent = years;
    if (grYearsEl) grYearsEl.textContent = years;

    const { labels, invested, fvs } = calcGrowth(employer, years);
    const finalFV = fvs[fvs.length - 1];
    if (grValueEl) grValueEl.textContent = formatCZK(finalFV);

    const gridCol  = 'rgba(28,28,24,0.08)';
    const tickCol  = 'rgba(28,28,24,0.45)';

    const data = {
      labels,
      datasets: [
        {
          label: 'Vloženo',
          data: invested,
          borderColor:     '#151e15',
          borderWidth:     1.5,
          pointRadius:     0,
          tension:         0.3,
          fill:            false,
        },
        {
          label: 'Budoucí hodnota',
          data: fvs,
          borderColor:     '#4c704c',
          backgroundColor: 'rgba(76,112,76,0.08)',
          borderWidth:     2.5,
          pointRadius:     0,
          pointHoverRadius: 4,
          tension:          0.3,
          fill:             { target: 0 },
        },
      ],
    };

    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: "'Inter', sans-serif", size: 11 },
            color: tickCol,
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(28,28,24,0.9)',
          titleColor: '#f2efe9',
          bodyColor:  'rgba(242,239,233,0.7)',
          padding: 10,
          cornerRadius: 2,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatCZK(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Roky',
            color: tickCol,
            font: { family: "'Inter', sans-serif", size: 11 },
          },
          grid:  { color: gridCol },
          ticks: { color: tickCol, font: { size: 11 } },
          border: { display: false },
        },
        y: {
          title: {
            display: true,
            text: 'Hodnota (Kč)',
            color: tickCol,
            font: { family: "'Inter', sans-serif", size: 11 },
          },
          grid:  { color: gridCol },
          ticks: {
            color: tickCol,
            font: { family: "'Inter', sans-serif", size: 11 },
            callback: v => {
              if (v >= 1000000) return (v/1000000).toFixed(1) + ' mil.';
              if (v >= 1000)    return (v/1000).toFixed(0) + ' tis.';
              return v;
            },
          },
          border: { display: false },
        },
      },
    };

    if (growthChart) {
      growthChart.data = data;
      growthChart.update();
    } else {
      growthChart = new Chart(growthCanvas.getContext('2d'), { type: 'line', data, options: opts });
    }
  }

  [giEmployer, giYears].forEach(el => el?.addEventListener('input', renderGrowthChart));
  renderGrowthChart();

})();