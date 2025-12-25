import { useState } from 'react'
import { read, utils } from 'xlsx'
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

  const parseTime = (timeStr) => {
    if (!timeStr) return null
    // Handle formats like "07:52" or "7:52"
    const [h, m] = timeStr.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return null
    return { h, m, val: h + m / 60 }
  }

  const calculateStats = (times) => {
    if (!times || times.length === 0) return null

    // Sort times by value
    const sortedTimes = times.sort((a, b) => {
      const ta = parseTime(a)
      const tb = parseTime(b)
      return (ta?.val || 0) - (tb?.val || 0)
    })

    const checkInStr = sortedTimes[0]
    const checkOutStr = sortedTimes.length > 1 ? sortedTimes[sortedTimes.length - 1] : null

    const inTime = parseTime(checkInStr)
    const outTime = checkOutStr ? parseTime(checkOutStr) : null

    if (!inTime) return null

    // If only one time entry, treat as check-in only (no check-out)
    if (!outTime || sortedTimes.length === 1) {
      return {
        checkIn: checkInStr,
        checkOut: null,
        hours: 0,
        status: 'Thiếu ra',
        lateMinutes: 0,
        earlyMinutes: 0
      }
    }

    // Standard Shift: 08:00 - 17:30
    const STANDARD_START = 8.0
    const STANDARD_END = 17.5
    const LUNCH_START = 12.0
    const LUNCH_END = 13.5
    const LUNCH_DURATION = 1.5

    // Calculate worked hours
    let hours = outTime.val - inTime.val

    // Deduct lunch if overlapping
    // Simple logic: if start before lunch end and end after lunch start
    if (inTime.val <= LUNCH_END && outTime.val >= LUNCH_START) {
      hours -= LUNCH_DURATION
    }

    hours = Math.max(0, Math.round(hours * 10) / 10)

    // Analyze status
    const isLate = inTime.val > STANDARD_START // No grace period
    const isEarly = outTime.val < STANDARD_END

    // Calculate exact minutes late/early
    let lateMinutes = 0
    let earlyMinutes = 0

    if (isLate) {
      // How many minutes after 08:00
      lateMinutes = Math.round((inTime.val - STANDARD_START) * 60)
    }

    if (isEarly) {
      // How many minutes before 17:30
      earlyMinutes = Math.round((STANDARD_END - outTime.val) * 60)
    }

    let status = 'Đủ'
    const notes = []

    if (isLate) notes.push(`Muộn ${lateMinutes}p`)
    if (isEarly) notes.push(`Sớm ${earlyMinutes}p`)

    if (notes.length > 0) status = notes.join(' & ')
    if (times.length < 2) status = 'Thiếu ra' // unlikely if sortedTimes logic holds but safecheck
    if (hours < 4) status = 'Vắng/Nghỉ' // simple threshold

    return {
      checkIn: checkInStr,
      checkOut: checkOutStr,
      hours,
      status,
      lateMinutes,
      earlyMinutes
    }
  }

  const processMatrixFormat = (jsonData, headers, headerRowIdx, employees, year, month) => {
    // 1. Aggregation Map: Key = `EmpID_DateNumber`, Value = [TimeStrings...]
    const mergedData = {}
    const nameColIdx = headers.findIndex(h => String(h).toLowerCase().includes('họ tên') || String(h).toLowerCase().includes('tên'))

    // Strict Date Columns Detection - ONLY columns that exist in header
    const dateCols = []
    headers.forEach((h, idx) => {
      const valStr = String(h).trim()
      // Only accept pure numbers "15", "16", etc. that are ACTUALLY in the header
      // Skip empty headers or non-numeric headers
      if (valStr && /^\d{1,2}$/.test(valStr)) {
        const val = Number(valStr)
        if (val >= 1 && val <= 31) {
          dateCols.push({ day: val, idx })
        }
      }
    })

    // DEBUG: Show which day columns were detected
    console.log('Detected day columns:', dateCols.map(d => d.day).sort((a, b) => a - b))

    let currentSysEmp = null

    for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
      const row = jsonData[r]
      if (!row || row.length === 0) continue

      const empName = row[nameColIdx]

      // Update Current Employee if Name exists
      // If Name is empty, we assume it's a continuation row (merged cell) for the previous employee
      if (empName) {
        currentSysEmp = employees.find(e =>
          normalizeString(e.ho_va_ten || e.name) === normalizeString(empName)
        )
      }

      // If we still don't have an employee (and no previous one), skip
      if (!currentSysEmp) continue

      // Limit scope: If row has "Total" or similar keywords in checking Cols?
      // For now, rely on time-pattern matching safety.

      dateCols.forEach(({ day, idx }) => {
        const cellContent = row[idx]

        // STRICT: Only process if cell has actual content (not undefined, null, empty string, or whitespace)
        if (!cellContent || String(cellContent).trim() === '') {
          return
        }

        const cellStr = String(cellContent).trim()

        // Extract times - handle multiple formats
        const extractedTimes = []

        // Method 1: Regex for HH:MM format (text)
        const timeMatches = cellStr.match(/(\d{1,2}:\d{2})/g)
        if (timeMatches) {
          extractedTimes.push(...timeMatches)
        }

        // Method 2: If no text times found, try parsing Excel decimal format
        // Excel stores time as fraction of day (e.g., 0.5 = 12:00)
        if (extractedTimes.length === 0) {
          const numVal = parseFloat(cellStr)
          if (!isNaN(numVal) && numVal > 0 && numVal < 1) {
            // Convert decimal to HH:MM
            const totalMinutes = Math.round(numVal * 24 * 60)
            const hours = Math.floor(totalMinutes / 60)
            const minutes = totalMinutes % 60
            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
            extractedTimes.push(timeStr)
          }
        }

        // DEBUG: Log what we extracted
        if (extractedTimes.length > 0) {
          console.log(`  [Day ${day}] Cell content: "${cellStr}" -> Extracted:`, extractedTimes)
        }

        if (extractedTimes.length > 0) {
          const key = `${currentSysEmp.id}_${day}`
          if (!mergedData[key]) {
            mergedData[key] = {
              empId: currentSysEmp.id,
              day: day,
              times: []
            }
          }
          mergedData[key].times.push(...extractedTimes)
        }
      })
    }
    // 2. Convert Aggregated Data to Logs
    const logs = []

    Object.values(mergedData).forEach(item => {
      const { empId, day, times } = item

      // CRITICAL: Skip if no times were actually found (empty cells)
      if (!times || times.length === 0) {
        return
      }

      // DEBUG: Log what we found
      console.log(`Employee ${empId}, Day ${day}: Found times:`, times)

      const stats = calculateStats(times)

      // DEBUG: Log calculated stats
      if (stats) {
        console.log(`  -> Check-in: ${stats.checkIn}, Check-out: ${stats.checkOut}, Hours: ${stats.hours}`)
      }

      if (stats) {
        const dateObj = new Date(year, month - 1, day)

        // Validate Date Overflow
        if (dateObj.getMonth() !== month - 1) return

        // FIX: Construct local date string
        const yStr = year
        const mStr = String(month).padStart(2, '0')
        const dStr = String(day).padStart(2, '0')
        const dateStr = `${yStr}-${mStr}-${dStr}`

        const [inH, inM] = stats.checkIn.split(':')
        const checkInDate = new Date(dateObj)
        checkInDate.setHours(inH, inM, 0)

        let checkOutDate = null
        if (stats.checkOut) {
          const [outH, outM] = stats.checkOut.split(':')
          checkOutDate = new Date(dateObj)
          checkOutDate.setHours(outH, outM, 0)
        }

        logs.push({
          employeeId: empId,
          date: dateStr,
          timestamp: dateObj.getTime(),
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate ? checkOutDate.toISOString() : null,
          hours: stats.hours,
          status: stats.status,
          lateMinutes: stats.lateMinutes || 0,
          earlyMinutes: stats.earlyMinutes || 0
        })
      }
    })

    return logs
  }

  const processListFormat = (jsonData, headers, headerRowIdx, employees) => {
    // Basic List Format: Mã NV, Ngày, Giờ (or Check-in, Check-out)
    const codeIdx = headers.findIndex(h => h.includes('mã') || h.includes('code') || h.includes('id') || h.includes('nv'))
    const dateIdx = headers.findIndex(h => h.includes('ngày') || h.includes('date'))
    const timeIdx = headers.findIndex(h => h.includes('giờ') || h.includes('time') || h.includes('check'))

    const logs = []
    const groupedData = {} // Group by Emp+Date to finding Min/Max

    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      const empCode = row[codeIdx]
      const dateRaw = row[dateIdx]
      const timeRaw = row[timeIdx]

      if (!empCode || !dateRaw) continue

      const key = `${empCode}_${dateRaw}`
      if (!groupedData[key]) {
        groupedData[key] = { empCode, dateRaw, times: [] }
      }
      if (timeRaw) groupedData[key].times.push(timeRaw)
    }

    for (const key in groupedData) {
      const group = groupedData[key]
      // Resolve Employee
      const sysEmp = employees.find(e =>
        e.id == group.empCode || e.code == group.empCode || e.employee_code == group.empCode ||
        normalizeString(e.ho_va_ten || '') === normalizeString(group.empCode) // fallback match name
      )

      if (sysEmp) {
        let dateStr = group.dateRaw
        // Excel Date Number Handling
        if (typeof group.dateRaw === 'number') {
          const d = new Date(Math.round((group.dateRaw - 25569) * 86400 * 1000))
          dateStr = d.toISOString().split('T')[0]
        }

        // If times are empty, skip or mark absent
        if (group.times.length === 0) continue

        // Use the same calculateStats logic if multiple times exist
        // Or simple min/max if just check-in/out columns
        const stats = calculateStats(group.times)
        if (stats) {
          const baseDate = new Date(dateStr)
          const [inH, inM] = stats.checkIn.split(':')
          const checkInDate = new Date(baseDate)
          checkInDate.setHours(inH, inM, 0)

          const [outH, outM] = stats.checkOut.split(':')
          const checkOutDate = new Date(baseDate)
          checkOutDate.setHours(outH, outM, 0)

          logs.push({
            employeeId: sysEmp.id,
            date: dateStr,
            timestamp: baseDate.getTime(),
            checkIn: checkInDate.toISOString(),
            checkOut: checkOutDate.toISOString(),
            hours: stats.hours,
            status: stats.status
          })
        }
      }
    }
    return logs
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
      const jsonData = utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' })

      // Header Detection
      let headerRowIdx = -1
      let headers = []

      for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        const row = jsonData[i] || []
        const rowStr = row.map(c => String(c).toLowerCase()).join(' ')
        if (
          (rowStr.includes('họ tên') || rowStr.includes('name')) ||
          (rowStr.includes('mã') && rowStr.includes('ngày'))
        ) {
          headerRowIdx = i
          headers = row.map(h => String(h || '').toLowerCase().trim())

          // DEBUG: Show the raw header row
          console.log('=== HEADER ROW DETECTED ===')
          console.log('Row index:', i)
          console.log('Raw headers:', row)
          console.log('Processed headers:', headers)

          break
        }
      }

      if (headerRowIdx === -1) {
        throw new Error('Không tìm thấy dòng tiêu đề hợp lệ (Cần "Họ tên" hoặc "Mã NV, Ngày")')
      }

      // Detect Mode
      const isMatrixMode = headers.some(h => /^\d{1,2}$/.test(String(h).trim()) && Number(h) >= 1 && Number(h) <= 31)

      let processedLogs = []
      let detectedDays = []

      if (isMatrixMode) {
        const [year, month] = importMonth.split('-').map(Number)

        // Capture detected days for preview
        headers.forEach((h) => {
          const trimmedH = String(h).trim()
          if (/^\d{1,2}$/.test(trimmedH)) {
            const val = Number(trimmedH)
            if (val >= 1 && val <= 31) detectedDays.push(val)
          }
        })
        detectedDays.sort((a, b) => a - b)

        processedLogs = processMatrixFormat(jsonData, headers, headerRowIdx, employees, year, month)
      } else {
        // List Mode fallback
        processedLogs = processListFormat(jsonData, headers, headerRowIdx, employees)
      }

      if (processedLogs.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra lại file.')
        setPreviewData(null)
      } else {
        setPreviewData({
          count: processedLogs.length,
          isMatrixMode,
          detectedDays,
          logs: processedLogs
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

      const chunks = []
      for (let i = 0; i < logs.length; i += BATCH_SIZE) {
        chunks.push(logs.slice(i, i + BATCH_SIZE))
      }

      for (const chunk of chunks) {
        const promises = chunk.map(log => fbPush('hr/attendanceLogs', log))
        await Promise.all(promises)
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

  const handleClose = () => {
    setFile(null)
    setPreviewData(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal show" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
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
                <label>Chọn tháng chấm công *</label>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-10px', marginBottom: '10px' }}>
                <button
                  type="button"
                  className="btn btn-link"
                  style={{ fontSize: '0.85rem', padding: 0 }}
                  onClick={() => {
                    const headers = ['Mã NV', 'Họ và tên', 'Ngày (YYYY-MM-DD)', 'Giờ vào (HH:MM)', 'Giờ ra (HH:MM)']
                    const sample = ['NV001', 'Nguyễn Văn A', '2024-11-01', '08:00', '17:30']
                    const ws = utils.aoa_to_sheet([headers, sample])
                    const wb = utils.book_new()
                    utils.book_append_sheet(wb, ws, 'MauChamCong')
                    utils.writeFile(wb, 'Mau_nhap_cham_cong.xlsx')
                  }}
                >
                  <i className="fas fa-download"></i> Tải file mẫu danh sách
                </button>
              </div>
              <div className="alert alert-info" style={{ marginTop: '15px', background: '#e2e3e5', padding: '10px', borderRadius: '4px' }}>
                <small>
                  <strong>Hỗ trợ 2 định dạng:</strong><br />
                  1. Bảng công (Họ tên + Cột ngày 1, 2...31)<br />
                  2. Danh sách (Mã NV + Ngày + Giờ)
                </small>
              </div>
            </>
          ) : (
            <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
              <h4>Kết quả phân tích:</h4>
              <ul>
                <li><strong>Chế độ:</strong> {previewData.isMatrixMode ? 'Bảng công (Ma trận)' : 'Danh sách nhật ký'}</li>
                <li><strong>Số lượng bản ghi:</strong> {previewData.count}</li>
                {previewData.isMatrixMode && (
                  <li>
                    <strong>Các cột ngày tìm thấy:</strong> <br />
                    <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                      {previewData.detectedDays.join(', ')}
                    </span>
                  </li>
                )}
              </ul>
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '10px', fontSize: '0.85rem' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#eee' }}>
                      <th style={{ padding: '5px' }}>NV</th>
                      <th style={{ padding: '5px' }}>Ngày</th>
                      <th style={{ padding: '5px' }}>Vào</th>
                      <th style={{ padding: '5px' }}>Ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.logs.slice(0, 10).map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '5px' }}>{employees.find(e => e.id === l.employeeId)?.ho_va_ten || l.employeeId}</td>
                        <td style={{ padding: '5px' }}>{new Date(l.date).toLocaleDateString('vi-VN')}</td>
                        <td style={{ padding: '5px' }}>{new Date(l.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '5px' }}>{new Date(l.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                    {previewData.logs.length > 10 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '5px' }}>...và {previewData.logs.length - 10} dòng khác</td></tr>}
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
                <button type="button" className="btn btn-secondary" onClick={() => setPreviewData(null)}> {'< Quay lại'}</button>
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

