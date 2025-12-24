export const escapeHtml = (str) => {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export const formatMoney = (n) => {
  try {
    if (n === null || n === undefined || isNaN(n)) return '0 đ'
    return new Intl.NumberFormat('vi-VN').format(Number(n)) + ' đ'
  } catch (e) {
    return String(n || 0) + ' đ'
  }
}


export const normalizeString = (str) => {
  if (!str) return ''
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

// Calculate Personal Income Tax (Progressive)
// Formula based on user request (Standard Vietnam PIT)
export const calculateProgressiveTax = (assessableIncome) => {
  if (assessableIncome <= 0) return 0

  // Tax constants
  const MILLION = 1000000

  if (assessableIncome <= 5 * MILLION) {
    return assessableIncome * 0.05
  } else if (assessableIncome <= 10 * MILLION) {
    return assessableIncome * 0.1 - 250000
  } else if (assessableIncome <= 18 * MILLION) {
    return assessableIncome * 0.15 - 750000
  } else if (assessableIncome <= 32 * MILLION) {
    return assessableIncome * 0.2 - 1650000
  } else if (assessableIncome <= 52 * MILLION) {
    return assessableIncome * 0.25 - 3250000
  } else if (assessableIncome <= 80 * MILLION) {
    return assessableIncome * 0.3 - 5850000
  } else {
    // Over 80M
    return assessableIncome * 0.35 - 9850000
  }
}
