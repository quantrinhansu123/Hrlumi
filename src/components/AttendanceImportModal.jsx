import { useState } from 'react'
import { read, utils, writeFile } from 'xlsx'
import { fbPush } from '../services/firebase'
import { normalizeString } from '../utils/helpers'

function AttendanceImportModal({ employees, isOpen, onClose, onSave }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [importMonth, setImportMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const parseTime = (timeRaw) => {
    if (timeRaw === null || timeRaw === undefined || timeRaw === '') return null

    // Excel serial time (fraction of day)
    if (typeof timeRaw === 'number') {
      if (timeRaw > 0 && timeRaw < 1) {
        const totalMinutes = Math.round(timeRaw * 24 * 60)
        const h = Math.floor(totalMinutes / 60) % 24
        const m = totalMinutes % 60
        return { h, m, val: h + m / 60, str: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
      }
      // Excel datetime serial — take time portion
      if (timeRaw > 1) {
        const fraction = timeRaw % 1
        if (fraction > 0) return parseTime(fraction)
      }
      return null
    }

    const timeStr = String(timeRaw).trim()
    if (!timeStr || timeStr === '-' || timeStr === '------') return null

    // HH:MM or H:MM:SS
    const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/)
    if (match) {
      const h = Number(match[1])
      const m = Number(match[2])
      if (isNaN(h) || isNaN(m)) return null
      return { h, m, val: h + m / 60, str: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
    }

    // Decimal string like 0.333
    const numVal = parseFloat(timeStr)
    if (!isNaN(numVal) && numVal > 0 && numVal < 1) {
      return parseTime(numVal)
    }

    return null
  }

  const calculateStats = (timeStrs) => {
    if (!timeStrs || timeStrs.length === 0) return null

    const parsed = timeStrs
      .map(t => (typeof t === 'object' && t?.str ? t : parseTime(t)))
      .filter(Boolean)
      .sort((a, b) => a.val - b.val)

    if (parsed.length === 0) return null

    const checkInStr = parsed[0].str
    const checkOutStr = parsed.length > 1 ? parsed[parsed.length - 1].str : null
    const inTime = parsed[0]
    const outTime = parsed.length > 1 ? parsed[parsed.length - 1] : null

    if (!outTime || parsed.length === 1) {
      return {
        checkIn: checkInStr,
        checkOut: null,
        hours: 0,
        status: 'Thiếu ra',
        lateMinutes: 0,
        earlyMinutes: 0,
        punches: parsed.map(p => p.str)
      }
    }

    const STANDARD_START = 8.0
    const STANDARD_END = 17.5
    const LUNCH_START = 12.0
    const LUNCH_END = 13.5
    const LUNCH_DURATION = 1.5

    let hours = outTime.val - inTime.val
    if (inTime.val <= LUNCH_END && outTime.val >= LUNCH_START) {
      hours -= LUNCH_DURATION
    }
    hours = Math.max(0, Math.round(hours * 10) / 10)

    const isLate = inTime.val > STANDARD_START
    const isEarly = outTime.val < STANDARD_END
    let lateMinutes = isLate ? Math.round((inTime.val - STANDARD_START) * 60) : 0
    let earlyMinutes = isEarly ? Math.round((STANDARD_END - outTime.val) * 60) : 0

    let status = 'Đủ'
    const notes = []
    if (isLate) notes.push(`Muộn ${lateMinutes}p`)
    if (isEarly) notes.push(`Sớm ${earlyMinutes}p`)
    if (notes.length > 0) status = notes.join(' & ')
    if (hours < 4) status = 'Vắng/Nghỉ'

    return {
      checkIn: checkInStr,
      checkOut: checkOutStr,
      hours,
      status,
      lateMinutes,
      earlyMinutes,
      punches: parsed.map(p => p.str)
    }
  }

  const findEmployee = (code, name) => {
    const codeStr = String(code || '').trim()
    const nameStr = String(name || '').trim()
    const normalizedName = normalizeString(nameStr)

    // Prefer name matching first so import does not depend on exact employee code.
    if (normalizedName) {
      const exactByName = employees.find(e =>
        normalizeString(e.ho_va_ten || e.name || '') === normalizedName
      )
      if (exactByName) return exactByName

      const fuzzyByName = employees.find(e =>
        normalizeString(e.ho_va_ten || e.name || '').includes(normalizedName) ||
        normalizedName.includes(normalizeString(e.ho_va_ten || e.name || ''))
      )
      if (fuzzyByName) return fuzzyByName
    }

    if (codeStr) {
      const byCode = employees.find(e =>
        String(e.employeeId || '') === codeStr ||
        String(e.employee_id || '') === codeStr ||
        String(e.username || '') === codeStr ||
        String(e.code || '') === codeStr ||
        String(e.id || '') === codeStr
      )
      if (byCode) return byCode

      // Soft code match for files where formatting differs (spaces, dashes, etc.)
      const normalizedCode = normalizeString(codeStr).replace(/[^a-z0-9]/g, '')
      if (normalizedCode) {
        const bySoftCode = employees.find(e => {
          const candidate = normalizeString(
            e.employeeId || e.employee_id || e.username || e.code || e.id || ''
          ).replace(/[^a-z0-9]/g, '')
          return candidate && candidate === normalizedCode
        })
        if (bySoftCode) return bySoftCode
      }
    }

    return null
  }

  const buildFallbackEmployee = (code, name, rowIndex = 0) => {
    const codeStr = String(code || '').trim()
    const nameStr = String(name || '').trim()
    const fallbackCode = codeStr || `ROW${rowIndex + 1}`
    const fallbackName = nameStr || `NV ${fallbackCode}`
    return {
      id: `external:${fallbackCode}:${rowIndex + 1}`,
      employeeId: fallbackCode,
      username: fallbackCode,
      ho_va_ten: fallbackName,
      name: fallbackName,
      bo_phan: '',
      vi_tri: ''
    }
  }

  const parseDateValue = (dateRaw) => {
    if (dateRaw === null || dateRaw === undefined || dateRaw === '') return null

    if (typeof dateRaw === 'number') {
      const d = new Date(Math.round((dateRaw - 25569) * 86400 * 1000))
      if (isNaN(d.getTime())) return null
      return d.toISOString().split('T')[0]
    }

    const str = String(dateRaw).trim()
    if (!str) return null

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10)
    }

    // M/D/YYYY or D/M/YYYY or DD/MM/YYYY
    const slash = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
    if (slash) {
      let a = Number(slash[1])
      let b = Number(slash[2])
      const y = Number(slash[3])
      // Prefer M/D/YYYY when first > 12 impossible for day in VN style... 
      // Sample file uses M/D/YYYY (5/1/2026). If a > 12 => D/M. If b > 12 => M/D.
      let month, day
      if (a > 12) {
        day = a
        month = b
      } else if (b > 12) {
        month = a
        day = b
      } else {
        // Ambiguous: default M/D/YYYY (US / Excel sample)
        month = a
        day = b
      }
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    const d = new Date(str)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return null
  }

  const buildLog = (sysEmp, dateStr, stats, extra = {}) => {
    const baseDate = new Date(`${dateStr}T00:00:00`)
    const checkInStr = stats.checkIn || extra.vao || ''
    const checkOutStr = stats.checkOut || extra.ra || ''

    let checkInDate = null
    if (checkInStr) {
      const [inH, inM] = String(checkInStr).split(':')
      checkInDate = new Date(baseDate)
      checkInDate.setHours(Number(inH), Number(inM) || 0, 0, 0)
    }

    let checkOutDate = null
    if (checkOutStr) {
      const [outH, outM] = String(checkOutStr).split(':')
      checkOutDate = new Date(baseDate)
      checkOutDate.setHours(Number(outH), Number(outM) || 0, 0, 0)
    }

    const hours = Number(extra.hours ?? stats.hours ?? 0) || 0
    const gioPlus = Number(extra.gioPlus ?? 0) || 0
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

    return {
      employeeId: sysEmp.id,
      employeeCode: extra.employeeCode || sysEmp.employeeId || sysEmp.username || '',
      employeeName: extra.employeeName || sysEmp.ho_va_ten || sysEmp.name || '',
      machineName: extra.machineName || extra.employeeName || sysEmp.ho_va_ten || sysEmp.name || '',
      tenTheoMayChamCong: extra.machineName || extra.employeeName || sysEmp.ho_va_ten || sysEmp.name || '',
      department: extra.department || sysEmp.bo_phan || '',
      position: extra.position || sysEmp.vi_tri || '',
      date: dateStr,
      dayOfWeek: extra.dayOfWeek || dayNames[baseDate.getDay()] || '',
      timestamp: baseDate.getTime(),
      checkIn: checkInDate ? checkInDate.toISOString() : null,
      checkOut: checkOutDate ? checkOutDate.toISOString() : null,
      vao: checkInStr,
      ra: checkOutStr,
      cong: Number(extra.cong ?? (hours >= 8 ? 1 : hours > 0 ? 0.5 : 0)) || 0,
      hours,
      gio: hours,
      congPlus: Number(extra.congPlus ?? 0) || 0,
      gioPlus,
      lateMinutes: Number(extra.lateMinutes ?? stats.lateMinutes ?? 0) || 0,
      earlyMinutes: Number(extra.earlyMinutes ?? stats.earlyMinutes ?? 0) || 0,
      tc1: Number(extra.tc1 ?? 0) || 0,
      tc2: Number(extra.tc2 ?? 0) || 0,
      tc3: Number(extra.tc3 ?? 0) || 0,
      shiftName: extra.shiftName || '',
      tenCa: extra.shiftName || '',
      kyHieu: extra.kyHieu || stats.status || '',
      kyHieuPlus: extra.kyHieuPlus || '',
      tongGio: Number(extra.tongGio ?? hours + gioPlus) || 0,
      status: extra.kyHieu || stats.status || '',
      punches: stats.punches || []
    }
  }

  /** Format đầy đủ theo bảng chấm công công ty */
  const processFullAttendanceFormat = (jsonData, headers, headerRowIdx) => {
    const idxOf = (...keys) => headers.findIndex(h => keys.some(k => h.includes(k)))
    const codeIdx = idxOf('mã n', 'ma n', 'mã nv', 'ma nv', 'employee')
    const nameIdx = idxOf('tên nhân', 'ten nhan', 'họ tên', 'ho ten', 'tên nv')
    const machineNameIdx = idxOf('tên theo máy', 'ten theo may', 'tên máy', 'ten may', 'tên chấm công', 'ten cham cong')
    const deptIdx = idxOf('phòng ban', 'phong ban')
    const posIdx = idxOf('chức vụ', 'chuc vu')
    const dateIdx = idxOf('ngày', 'ngay')
    const thuIdx = idxOf('thứ', 'thu')
    const vaoIdx = headers.findIndex(h => h === 'vào' || h === 'vao' || h.includes('giờ vào') || h.includes('check-in'))
    const raIdx = headers.findIndex(h => h === 'ra' || h.includes('giờ ra') || h.includes('check-out') || (h.includes('ra') && !h.includes('sớm') && !h.includes('som')))
    const congIdx = headers.findIndex(h => h === 'công' || h === 'cong')
    const gioIdx = headers.findIndex(h => h === 'giờ' || h === 'gio')
    const congPlusIdx = idxOf('công+', 'cong+')
    const gioPlusIdx = idxOf('giờ+', 'gio+')
    const lateIdx = idxOf('vào trễ', 'vao tre', 'vào t')
    const earlyIdx = idxOf('ra sớm', 'ra som')
    const tc1Idx = headers.findIndex(h => h === 'tc1')
    const tc2Idx = headers.findIndex(h => h === 'tc2')
    const tc3Idx = headers.findIndex(h => h === 'tc3')
    const caIdx = idxOf('tên ca', 'ten ca')
    const kyIdx = headers.findIndex(h => h === 'kí hiệu' || h === 'ki hieu' || h === 'ký hiệu')
    const kyPlusIdx = idxOf('kí hiệu+', 'ki hieu+', 'ký hiệu+')
    const tongIdx = idxOf('tổng giờ', 'tong gio')

    const logs = []
    const skipped = []
    const num = (v) => {
      const n = parseFloat(String(v ?? '').replace(',', '.'))
      return isNaN(n) ? 0 : n
    }

    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      const empCode = codeIdx >= 0 ? row[codeIdx] : ''
      const empName = nameIdx >= 0 ? row[nameIdx] : ''
      const machineName = machineNameIdx >= 0 ? row[machineNameIdx] : ''
      const dateRaw = dateIdx >= 0 ? row[dateIdx] : ''
      if ((!empCode && !empName) || (dateRaw === '' || dateRaw == null)) continue

      const sysEmp = findEmployee(empCode, empName) || buildFallbackEmployee(empCode, empName, i)

      const dateStr = parseDateValue(dateRaw)
      if (!dateStr) continue

      const vao = vaoIdx >= 0 ? (parseTime(row[vaoIdx])?.str || '') : ''
      const ra = raIdx >= 0 ? (parseTime(row[raIdx])?.str || '') : ''
      const times = [vao, ra].filter(Boolean)
      const stats = times.length ? calculateStats(times) : { checkIn: vao, checkOut: ra, hours: num(row[gioIdx]), status: 'Đủ', lateMinutes: 0, earlyMinutes: 0, punches: times }

      logs.push(buildLog(sysEmp, dateStr, stats, {
        employeeCode: String(empCode || sysEmp.employeeId || ''),
        employeeName: String(empName || sysEmp.ho_va_ten || ''),
        machineName: String(machineName || empName || sysEmp.ho_va_ten || ''),
        department: deptIdx >= 0 ? String(row[deptIdx] || '') : '',
        position: posIdx >= 0 ? String(row[posIdx] || '') : '',
        dayOfWeek: thuIdx >= 0 ? String(row[thuIdx] || '') : '',
        vao,
        ra,
        cong: congIdx >= 0 ? num(row[congIdx]) : undefined,
        hours: gioIdx >= 0 ? num(row[gioIdx]) : undefined,
        congPlus: congPlusIdx >= 0 ? num(row[congPlusIdx]) : 0,
        gioPlus: gioPlusIdx >= 0 ? num(row[gioPlusIdx]) : 0,
        lateMinutes: lateIdx >= 0 ? num(row[lateIdx]) : undefined,
        earlyMinutes: earlyIdx >= 0 ? num(row[earlyIdx]) : undefined,
        tc1: tc1Idx >= 0 ? num(row[tc1Idx]) : 0,
        tc2: tc2Idx >= 0 ? num(row[tc2Idx]) : 0,
        tc3: tc3Idx >= 0 ? num(row[tc3Idx]) : 0,
        shiftName: caIdx >= 0 ? String(row[caIdx] || '') : '',
        kyHieu: kyIdx >= 0 ? String(row[kyIdx] || '') : '',
        kyHieuPlus: kyPlusIdx >= 0 ? String(row[kyPlusIdx] || '') : '',
        tongGio: tongIdx >= 0 ? num(row[tongIdx]) : undefined
      }))
    }

    return { logs, skipped }
  }

  /** Format mới: Mã NV | Tên NV | Phòng ban | Ngày | Lần 1 ... Lần 7 */
  const processPunchLogFormat = (jsonData, headers, headerRowIdx) => {
    const codeIdx = headers.findIndex(h =>
      h.includes('mã nv') || h === 'mã' || h.includes('ma nv') || h === 'code' || h === 'id nv'
    )
    const nameIdx = headers.findIndex(h =>
      h.includes('tên nv') || h.includes('ho ten') || h.includes('họ tên') || h.includes('họ và tên') || h === 'tên'
    )
    const dateIdx = headers.findIndex(h => h.includes('ngày') || h.includes('ngay') || h === 'date')

    const lanIndexes = []
    headers.forEach((h, idx) => {
      if (/^l[aầ]n\s*\d+$/i.test(h) || h.includes('lần') || /^lan\s*\d+$/i.test(h)) {
        lanIndexes.push(idx)
      }
    })

    // Fallback: any column after Ngày that looks like punch columns
    if (lanIndexes.length === 0 && dateIdx >= 0) {
      for (let i = dateIdx + 1; i < headers.length; i++) {
        const h = headers[i]
        if (!h) continue
        if (h.includes('phòng') || h.includes('bộ phận') || h.includes('ghi chú')) continue
        lanIndexes.push(i)
      }
    }

    const logs = []
    const skipped = []

    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (!row || row.length === 0) continue

      const empCode = codeIdx >= 0 ? row[codeIdx] : ''
      const empName = nameIdx >= 0 ? row[nameIdx] : ''
      const dateRaw = dateIdx >= 0 ? row[dateIdx] : ''

      if (!empCode && !empName) continue
      if (!dateRaw && dateRaw !== 0) continue

      const times = []
      lanIndexes.forEach(idx => {
        const parsed = parseTime(row[idx])
        if (parsed) times.push(parsed.str)
      })

      // Row without any punch times = skip (not absent day unless needed)
      if (times.length === 0) continue

      const dateStr = parseDateValue(dateRaw)
      if (!dateStr) {
        skipped.push(`Dòng ${i + 1}: ngày không hợp lệ (${dateRaw})`)
        continue
      }

      const sysEmp = findEmployee(empCode, empName) || buildFallbackEmployee(empCode, empName, i)

      const stats = calculateStats(times)
      if (stats) {
        logs.push(buildLog(sysEmp, dateStr, stats, {
          employeeCode: String(empCode || sysEmp.employeeId || ''),
          employeeName: String(empName || sysEmp.ho_va_ten || ''),
          machineName: String(empName || sysEmp.ho_va_ten || '')
        }))
      }
    }

    return { logs, skipped }
  }

  const processMatrixFormat = (jsonData, headers, headerRowIdx, year, month) => {
    const mergedData = {}
    const nameColIdx = headers.findIndex(h =>
      String(h).includes('họ tên') || String(h).includes('tên') || String(h).includes('name')
    )
    const codeColIdx = headers.findIndex(h =>
      String(h).includes('mã') || String(h).includes('code')
    )

    const dateCols = []
    headers.forEach((h, idx) => {
      const valStr = String(h).trim()
      if (valStr && /^\d{1,2}$/.test(valStr)) {
        const val = Number(valStr)
        if (val >= 1 && val <= 31) dateCols.push({ day: val, idx })
      }
    })

    let currentSysEmp = null

    for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
      const row = jsonData[r]
      if (!row || row.length === 0) continue

      const empName = nameColIdx >= 0 ? row[nameColIdx] : ''
      const empCode = codeColIdx >= 0 ? row[codeColIdx] : ''

      if (empName || empCode) {
        currentSysEmp = findEmployee(empCode, empName) || buildFallbackEmployee(empCode, empName, r)
      }
      if (!currentSysEmp) continue

      dateCols.forEach(({ day, idx }) => {
        const cellContent = row[idx]
        if (!cellContent || String(cellContent).trim() === '') return

        const cellStr = String(cellContent).trim()
        const extractedTimes = []
        const timeMatches = cellStr.match(/(\d{1,2}:\d{2})/g)
        if (timeMatches) extractedTimes.push(...timeMatches)

        if (extractedTimes.length === 0) {
          const parsed = parseTime(cellContent)
          if (parsed) extractedTimes.push(parsed.str)
        }

        if (extractedTimes.length > 0) {
          const key = `${currentSysEmp.id}_${day}`
          if (!mergedData[key]) {
            mergedData[key] = { emp: currentSysEmp, day, times: [] }
          }
          mergedData[key].times.push(...extractedTimes)
        }
      })
    }

    const logs = []
    Object.values(mergedData).forEach(item => {
      const { emp, day, times } = item
      if (!times || times.length === 0) return
      const stats = calculateStats(times)
      if (!stats) return

      const dateObj = new Date(year, month - 1, day)
      if (dateObj.getMonth() !== month - 1) return
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      logs.push(buildLog(emp, dateStr, stats))
    })

    return { logs, skipped: [] }
  }

  const processListFormat = (jsonData, headers, headerRowIdx) => {
    const codeIdx = headers.findIndex(h => h.includes('mã') || h.includes('code') || h.includes('nv'))
    const nameIdx = headers.findIndex(h => h.includes('tên') || h.includes('name'))
    const dateIdx = headers.findIndex(h => h.includes('ngày') || h.includes('date'))
    const inIdx = headers.findIndex(h => h.includes('giờ vào') || h.includes('check-in') || h.includes('checkin') || h.includes('vào'))
    const outIdx = headers.findIndex(h => h.includes('giờ ra') || h.includes('check-out') || h.includes('checkout') || h.includes('ra'))
    const timeIdx = headers.findIndex(h => h.includes('giờ') || h.includes('time'))

    const logs = []
    const groupedData = {}
    const skipped = []

    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      const empCode = codeIdx >= 0 ? row[codeIdx] : ''
      const empName = nameIdx >= 0 ? row[nameIdx] : ''
      const dateRaw = dateIdx >= 0 ? row[dateIdx] : ''
      if ((!empCode && !empName) || (!dateRaw && dateRaw !== 0)) continue

      const key = `${empCode}_${empName}_${dateRaw}`
      if (!groupedData[key]) groupedData[key] = { empCode, empName, dateRaw, times: [] }

      if (inIdx >= 0) {
        const t = parseTime(row[inIdx])
        if (t) groupedData[key].times.push(t.str)
      }
      if (outIdx >= 0) {
        const t = parseTime(row[outIdx])
        if (t) groupedData[key].times.push(t.str)
      }
      if (inIdx < 0 && outIdx < 0 && timeIdx >= 0) {
        const t = parseTime(row[timeIdx])
        if (t) groupedData[key].times.push(t.str)
      }
    }

    for (const key in groupedData) {
      const group = groupedData[key]
      if (group.times.length === 0) continue

      const sysEmp = findEmployee(group.empCode, group.empName) || buildFallbackEmployee(group.empCode, group.empName)

      const dateStr = parseDateValue(group.dateRaw)
      if (!dateStr) continue

      const stats = calculateStats(group.times)
      if (stats) {
        logs.push(buildLog(sysEmp, dateStr, stats, {
          employeeCode: String(group.empCode || sysEmp.employeeId || ''),
          employeeName: String(group.empName || sysEmp.ho_va_ten || ''),
          machineName: String(group.empName || sysEmp.ho_va_ten || '')
        }))
      }
    }

    return { logs, skipped }
  }

  const detectFormat = (headers) => {
    const hasFull =
      headers.some(h => h.includes('công+') || h.includes('cong+') || h === 'tc1' || h.includes('kí hiệu') || h.includes('tổng giờ') || h.includes('chức vụ'))
    const hasLan = headers.some(h => /l[aầ]n\s*\d+/i.test(h) || h.startsWith('lần') || h.startsWith('lan '))
    const hasNgay = headers.some(h => h.includes('ngày') || h.includes('ngay') || h === 'date')
    const hasDayCols = headers.some(h => /^\d{1,2}$/.test(String(h).trim()) && Number(h) >= 1 && Number(h) <= 31)

    if (hasFull && hasNgay) return 'full'
    if (hasLan && hasNgay) return 'punch'
    if (hasDayCols) return 'matrix'
    return 'list'
  }

  const handlePreview = async () => {
    if (!file) {
      alert('Vui lòng chọn file Excel')
      return
    }

    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      // raw:true to keep Excel time serials; also keep strings
      const jsonData = utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' })

      let headerRowIdx = -1
      let headers = []

      for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
        const row = jsonData[i] || []
        const lower = row.map(c => String(c || '').toLowerCase().trim())
        const rowStr = lower.join(' ')
        if (
          (rowStr.includes('mã nv') && rowStr.includes('ngày')) ||
          (rowStr.includes('ma nv') && rowStr.includes('ngay')) ||
          (rowStr.includes('họ tên') || rowStr.includes('tên nv')) ||
          (rowStr.includes('mã') && rowStr.includes('ngày')) ||
          lower.some(h => /l[aầ]n\s*\d+/i.test(h))
        ) {
          headerRowIdx = i
          headers = lower
          break
        }
      }

      if (headerRowIdx === -1) {
        throw new Error('Không tìm thấy dòng tiêu đề hợp lệ (cần Mã NV, Ngày, Lần 1...)')
      }

      const format = detectFormat(headers)
      let result = { logs: [], skipped: [] }
      let detectedDays = []
      let modeLabel = 'Danh sách'

      if (format === 'full') {
        result = processFullAttendanceFormat(jsonData, headers, headerRowIdx)
        modeLabel = 'Bảng chấm công đầy đủ'
      } else if (format === 'punch') {
        result = processPunchLogFormat(jsonData, headers, headerRowIdx)
        modeLabel = 'Nhật ký chấm công (Lần 1–7)'
      } else if (format === 'matrix') {
        const [year, month] = importMonth.split('-').map(Number)
        headers.forEach((h) => {
          const trimmedH = String(h).trim()
          if (/^\d{1,2}$/.test(trimmedH)) {
            const val = Number(trimmedH)
            if (val >= 1 && val <= 31) detectedDays.push(val)
          }
        })
        detectedDays.sort((a, b) => a - b)
        result = processMatrixFormat(jsonData, headers, headerRowIdx, year, month)
        modeLabel = 'Bảng công (Ma trận ngày)'
      } else {
        result = processListFormat(jsonData, headers, headerRowIdx)
        modeLabel = 'Danh sách (Vào/Ra)'
      }

      if (result.logs.length === 0) {
        const hint = result.skipped.slice(0, 5).join('\n')
        alert(`Không tìm thấy dữ liệu hợp lệ.\n${hint || 'Vui lòng kiểm tra lại file và mã NV khớp hệ thống.'}`)
        setPreviewData(null)
      } else {
        const uniqueEmployeeCount = new Set(
          result.logs
            .map(log => normalizeString(
              log.employeeName ||
              log.machineName ||
              log.tenTheoMayChamCong ||
              log.employeeCode ||
              log.employeeId ||
              ''
            ))
            .filter(Boolean)
        ).size

        setPreviewData({
          count: result.logs.length,
          uniqueEmployeeCount,
          modeLabel,
          isMatrixMode: format === 'matrix',
          detectedDays,
          skipped: result.skipped,
          logs: result.logs
        })
      }
    } catch (error) {
      alert('Lỗi: ' + error.message)
      console.error(error)
      setPreviewData(null)
    } finally {
      setLoading(false)
    }
  }

  const executeImport = async () => {
    if (!previewData || !previewData.logs) return
    setLoading(true)
    try {
      const logs = previewData.logs
      const BATCH_SIZE = 50
      let count = 0

      for (let i = 0; i < logs.length; i += BATCH_SIZE) {
        const chunk = logs.slice(i, i + BATCH_SIZE)
        await Promise.all(chunk.map(log => fbPush('hr/attendanceLogs', log)))
        count += chunk.length
      }

      alert(`Đã import thành công ${count} bản ghi!`)
      onSave()
      onClose()
      setFile(null)
      setPreviewData(null)
    } catch (error) {
      alert('Lỗi khi lưu dữ liệu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadNewTemplate = () => {
    const headers = [
      'Mã N.Viên', 'Tên nhân viên', 'Tên theo máy chấm công', 'Phòng ban', 'Chức vụ', 'Ngày', 'Thứ',
      'Vào', 'Ra', 'Công', 'Giờ', 'Công+', 'Giờ+', 'Vào trễ', 'Ra sớm',
      'TC1', 'TC2', 'TC3', 'Tên ca', 'Kí hiệu', 'Kí hiệu+', 'Tổng giờ'
    ]
    const sample = [
      ['NV001', 'Nguyễn Văn A', 'Nguyen Van A', 'Kế toán', 'Nhân viên', '2026-05-01', 'Thứ 6', '08:00', '17:30', 1, 8, 0, 0, 0, 0, 0, 0, 0, 'Ca full', 'X', '', 8],
      ['NV001', 'Nguyễn Văn A', 'Nguyen Van A', 'Kế toán', 'Nhân viên', '2026-05-02', 'Thứ 7', '07:55', '17:35', 1, 8, 0.5, 1, 0, 0, 0, 0, 0, 'Ca full', 'X', 'TC', 9]
    ]
    const ws = utils.aoa_to_sheet([headers, ...sample])
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'ChamCong')
    writeFile(wb, 'Mau_nhap_cham_cong.xlsx')
  }

  const handleClose = () => {
    setFile(null)
    setPreviewData(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal show" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-file-import"></i>
            Import Bảng Công (Excel)
          </h3>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-body">
          {!previewData ? (
            <>
              <div className="form-group">
                <label>Chọn tháng chấm công (dùng cho mẫu ma trận ngày) *</label>
                <input
                  type="month"
                  value={importMonth}
                  onChange={(e) => setImportMonth(e.target.value)}
                  style={{ width: '100%', marginBottom: '15px' }}
                />
              </div>
              <div className="form-group">
                <label>File Excel dữ liệu</label>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div style={{ marginTop: '-10px', marginBottom: '10px' }}>
                <button
                  type="button"
                  className="btn btn-link"
                  style={{ fontSize: '0.85rem', padding: 0 }}
                  onClick={downloadNewTemplate}
                >
                  <i className="fas fa-download"></i> Tải file mẫu (đầy đủ cột chấm công)
                </button>
              </div>
              <div className="alert alert-info" style={{ marginTop: '15px', background: '#e8f5e9', padding: '10px', borderRadius: '4px' }}>
                <small>
                  <strong>Hỗ trợ import:</strong><br />
                  1) Bảng đầy đủ: Mã N.Viên, Tên, Tên theo máy chấm công, Phòng ban, Chức vụ, Ngày, Thứ, Vào, Ra, Công, Giờ, Công+, Giờ+, Vào trễ, Ra sớm, TC1–3, Tên ca, Kí hiệu, Kí hiệu+, Tổng giờ<br />
                  2) Nhật ký Lần 1–7 (vẫn dùng được)<br />
                  • Không bắt buộc mã NV khớp tuyệt đối, hệ thống sẽ ưu tiên ghép theo tên nhân viên
                </small>
              </div>
            </>
          ) : (
            <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
              <h4>Kết quả phân tích:</h4>
              <ul>
                <li><strong>Chế độ:</strong> {previewData.modeLabel}</li>
                <li><strong>Số nhân viên (không trùng):</strong> {previewData.uniqueEmployeeCount}</li>
                <li><strong>Tổng số dòng chấm công:</strong> {previewData.count}</li>
                {previewData.isMatrixMode && (
                  <li>
                    <strong>Các cột ngày tìm thấy:</strong>{' '}
                    <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                      {previewData.detectedDays.join(', ')}
                    </span>
                  </li>
                )}
                {previewData.skipped?.length > 0 && (
                  <li style={{ color: '#b45309' }}>
                    <strong>Bỏ qua:</strong> {previewData.skipped.length} dòng
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      {previewData.skipped.slice(0, 5).map((s, i) => <div key={i}>{s}</div>)}
                    </div>
                  </li>
                )}
              </ul>
              <div style={{ marginTop: '10px' }}>
                <strong>Danh sách chấm công tải lên:</strong>
              </div>
              <div style={{ maxHeight: '260px', overflowY: 'auto', marginTop: '8px', fontSize: '0.85rem', border: '1px solid #ddd', borderRadius: '6px' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#eee' }}>
                      <th style={{ padding: '5px' }}>STT</th>
                      <th style={{ padding: '5px' }}>Mã NV</th>
                      <th style={{ padding: '5px' }}>Tên NV</th>
                      <th style={{ padding: '5px' }}>Tên máy chấm công</th>
                      <th style={{ padding: '5px' }}>Ngày</th>
                      <th style={{ padding: '5px' }}>Vào</th>
                      <th style={{ padding: '5px' }}>Ra</th>
                      <th style={{ padding: '5px' }}>Công</th>
                      <th style={{ padding: '5px' }}>Giờ</th>
                      <th style={{ padding: '5px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.logs.slice(0, 50).map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '5px', textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ padding: '5px' }}>{l.employeeCode || '-'}</td>
                        <td style={{ padding: '5px' }}>{l.employeeName || employees.find(e => e.id === l.employeeId)?.ho_va_ten || l.employeeId}</td>
                        <td style={{ padding: '5px' }}>{l.machineName || l.tenTheoMayChamCong || l.employeeName || '-'}</td>
                        <td style={{ padding: '5px' }}>{l.date}</td>
                        <td style={{ padding: '5px' }}>{l.checkIn ? new Date(l.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td style={{ padding: '5px' }}>{l.checkOut ? new Date(l.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td style={{ padding: '5px', textAlign: 'center' }}>{l.cong ?? '-'}</td>
                        <td style={{ padding: '5px' }}>{l.hours}</td>
                        <td style={{ padding: '5px' }}>{l.status}</td>
                      </tr>
                    ))}
                    {previewData.logs.length > 50 && (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '5px' }}>
                          ...và {previewData.logs.length - 50} dòng khác
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={handleClose}>Đóng</button>

            {!previewData ? (
              <button type="button" className="btn btn-primary" onClick={handlePreview} disabled={loading || !file}>
                {loading ? <><i className="fas fa-spinner fa-spin"></i> Đang đọc file...</> : 'Tiếp tục (Xem trước) >'}
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewData(null)}>{'< Quay lại'}</button>
                <button type="button" className="btn btn-success" onClick={executeImport} disabled={loading}>
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</> : <><i className="fas fa-check"></i> Xác nhận Import</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttendanceImportModal
