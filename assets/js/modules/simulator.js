/* =========================================================
   SIMULADOR DE CRÉDITO (cuota fija - método francés)
   ========================================================= */
import { $, formatCurrency } from '../utils/helpers.js';

/**
 * Calcula la cuota mensual.
 * @param {number} amount  Monto del préstamo
 * @param {number} months  Número de cuotas
 * @param {number} tea     Tasa efectiva anual (0.28 = 28%)
 */
export function calculateQuota(amount, months, tea) {
  const monthlyRate = Math.pow(1 + tea, 1 / 12) - 1;
  if (monthlyRate === 0) return amount / months;
  return (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

export function initSimulator() {
  const form = $('[data-simulator]');
  if (!form) return;

  const amountInput = $('[data-sim-amount]', form);
  const amountOutput = $('[data-sim-amount-output]', form);
  const termSelect = $('[data-sim-term]', form);
  const quotaEl = $('[data-sim-quota]', form);
  const totalEl = $('[data-sim-total]', form);
  const teaEl = $('[data-sim-tea]', form);
  const tea = Number(form.dataset.tea) || 0.28;

  const update = () => {
    const amount = Number(amountInput.value);
    const months = Number(termSelect.value);
    const quota = calculateQuota(amount, months, tea);

    // Relleno de color de la barra
    const min = Number(amountInput.min);
    const max = Number(amountInput.max);
    const progress = ((amount - min) / (max - min)) * 100;
    amountInput.style.setProperty('--progress', `${progress}%`);

    amountOutput.textContent = formatCurrency(amount).replace('.00', '');
    quotaEl.textContent = formatCurrency(quota);
    totalEl.textContent = formatCurrency(quota * months);
    teaEl.textContent = `${(tea * 100).toFixed(2)}%`;
  };

  amountInput.addEventListener('input', update);
  termSelect.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
}
