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
