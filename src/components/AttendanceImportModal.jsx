import { useState } from 'react'
import { read, utils } from 'xlsx'
import { fbPush } from '../services/firebase'

function AttendanceImportModal({ employees, isOpen, onClose, onSave }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleImport = async () => {
    if (!file) {
      alert('Vui lòng chọn file Excel')
      return
    }

    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 })

      // Assume header row is row 0
      // Columns detection: Look for 'Mã NV', 'Ngày', 'Giờ' or similar
      const headers = jsonData[0].map(h => String(h).toLowerCase().trim())
      const codeIdx = headers.findIndex(h => h.includes('mã nv') || h.includes('code') || h.includes('id'))
      const nameIdx = headers.findIndex(h => h.includes('họ tên') || h.includes('tên') || h.includes('name'))
      const dateIdx = headers.findIndex(h => h.includes('ngày') || h.includes('date'))
      const timeIdx = headers.findIndex(h => h.includes('giờ') || h.includes('time') || h.includes('check'))

      if (codeIdx === -1 || nameIdx === -1 || dateIdx === -1 || timeIdx === -1) {
        throw new Error('File Excel cần có các cột: Mã NV, Họ tên, Ngày, Giờ (check-in/out)')
      }

      // Group by Employee + Date
      const groupedData = {}

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        const empCode = row[codeIdx]
        const dateRaw = row[dateIdx]
        const timeRaw = row[timeIdx]

        if (!empCode || !dateRaw || !timeRaw) continue

        // Basic date normalization (assuming format logic based on typical Excel/JS)
        // For robustness, treating as string key
        const key = `${empCode}_${dateRaw}`

        if (!groupedData[key]) {
          groupedData[key] = {
            empCode,
            dateRaw,
            times: []
          }
        }
        groupedData[key].times.push(timeRaw)
      }

      const processedLogs = []

      for (const key in groupedData) {
        const group = groupedData[key]
        const times = group.times

        // Find Min and Max
        // Note: Time formats in Excel can be tricky (fraction of day or string). 
        // We attempt to parse or sort assuming consistent format.
        times.sort() // simple string sort often works for HH:mm:ss, but robust needs parsing

        const earliest = times[0]
        const latest = times[times.length - 1]

        // Map generic empCode to system ID
        // Assuming employees prop is passed as list. Find by some field or ID.
        // Simple heuristic: match 'id' or 'code' or 'employee_code'
        const sysEmp = employees.find(e =>
          e.id == group.empCode || e.code == group.empCode || e.employee_code == group.empCode
        )

        if (sysEmp) {
          // Construct valid DB log
          // Normalize Date to YYYY-MM-DD
          let dateStr = group.dateRaw
          // If Excel date number?
          if (typeof group.dateRaw === 'number') {
            // Excel date to JS Date
            const d = new Date(Math.round((group.dateRaw - 25569) * 86400 * 1000))
            dateStr = d.toISOString().split('T')[0]
          }

          // Calculate hours
          // This requires parsing `earliest` and `latest` into Time objects
          // Simplified for implementation:

          processedLogs.push({
            employeeId: sysEmp.id,
            date: dateStr,
            checkIn: earliest,   // Raw string/value for now, ideally ISO
            checkOut: latest,
            status: times.length >= 2 ? 'Đủ' : 'Thiếu ra',
            source: 'Import'
          })
        }
      }

      for (const log of processedLogs) {
        await fbPush('hr/attendanceLogs', log)
      }

      alert(`Đã xử lý và import ${processedLogs.length} bản ghi công nhật`)
      onSave()
      onClose()
      setFile(null)
    } catch (error) {
      alert('Lỗi khi import: ' + error.message)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-file-import"></i>
            Import chấm công từ Excel
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Chọn file Excel</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '10px' }}
            />
          </div>

          <div style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px', fontSize: '0.9rem' }}>
            <strong>Lưu ý:</strong>
            <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
              <li>File Excel cần có các cột tiêu đề: <b>Mã NV, Họ tên, Ngày, Giờ</b></li>
              <li>Hệ thống sẽ tự động tìm:</li>
              <li>- Giờ vào: Lấy thời gian sớm nhất</li>
              <li>- Giờ ra: Lấy thời gian muộn nhất</li>
            </ul>
          </div>

          <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fas fa-upload"></i> Import & Xử lý
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttendanceImportModal

