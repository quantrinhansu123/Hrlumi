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

// Map Supabase DB columns (English) -> App State (Vietnamese)
export const mapUserToApp = (user) => {
  if (!user) return null
  return {
    id: user.id,
    employeeId: user.employee_id || '',
    ho_va_ten: user.name || '',
    email: user.email || '',
    sđt: user.phone || '',
    chi_nhanh: user.branch || '',
    bo_phan: user.department || '',
    vi_tri: user.position || '',
    trang_thai: user.employment_status || user.status || 'Thử việc', // Fallback to status if employment_status empty
    ca_lam_viec: user.shift || '',
    ngay_vao_lam: user.join_date || '',
    ngay_lam_chinh_thuc: user.official_date || '',
    cccd: user.cccd || '',
    ngay_cap: user.identity_issue_date || '', // New column
    noi_cap: user.identity_issue_place || '', // New column
    dia_chi_thuong_tru: user.address || '',
    que_quan: user.hometown || '',
    ngay_sinh: user.dob || '',
    gioi_tinh: user.gender || '',
    tinh_trang_hon_nhan: user.marital_status || '',
    avatarDataUrl: user.avatar_url || '',
    // Preserve other potential fields or map them as needed
    role: user.role || 'user',
    username: user.username || ''
  }
}

// Map App State (Vietnamese) -> Supabase DB columns (English)
export const mapAppToUser = (data) => {
  if (!data) return null
  return {
    // id field is usually handled by Supabase or passed separately for updates
    employee_id: data.employeeId || '',
    name: data.ho_va_ten || '',
    email: data.email || '',
    phone: data.sđt || data.sdt || '',
    branch: data.chi_nhanh || '',
    department: data.bo_phan || '',
    position: data.vi_tri || '',
    employment_status: data.trang_thai || '',
    shift: data.ca_lam_viec || '',
    join_date: data.ngay_vao_lam || null, // Date fields should be null if empty string
    official_date: data.ngay_lam_chinh_thuc || null,
    cccd: data.cccd || '',
    identity_issue_date: data.ngay_cap || null,
    identity_issue_place: data.noi_cap || '',
    address: data.dia_chi_thuong_tru || '',
    hometown: data.que_quan || '',
    dob: data.ngay_sinh || null,
    gender: data.gioi_tinh || '',
    marital_status: data.tinh_trang_hon_nhan || '',
    avatar_url: data.avatarDataUrl || data.avatarUrl || data.avatar || '',
    // Add default fields if creating new user, though usually handled by DB defaults
    role: data.role || 'user',
    username: data.username || data.email?.split('@')[0] || data.employeeId || ''
  }
}
