import { useEffect, useState } from 'react'
import SeedEmployeeStatusButton from '../components/SeedEmployeeStatusButton'
import { fbGet } from '../services/firebase'
import { escapeHtml } from '../utils/helpers'

function EmployeeStatusHistory() {
  const [logs, setLogs] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load employees
      const empData = await fbGet('employees')
      let empList = []
      if (empData) {
        if (Array.isArray(empData)) {
          empList = empData.filter(item => item !== null && item !== undefined)
        } else if (typeof empData === "object") {
          empList = Object.entries(empData)
            .filter(([k, v]) => v !== null && v !== undefined)
            .map(([k, v]) => ({ ...v, id: k }))
        }
      }
      setEmployees(empList)

      const hrData = await fbGet('hr')
      const rawLogs = hrData?.employee_status_history
        ? Object.entries(hrData.employee_status_history)
          .filter(([k, v]) => v !== null && v !== undefined)
          .map(([k, v]) => ({ ...v, id: k }))
        : []
      // Sắp xếp mới nhất lên trên
      rawLogs.sort((a, b) => new Date(b.effectiveDate || b.createdAt || 0) - new Date(a.effectiveDate || a.createdAt || 0))
      setLogs(rawLogs)
      setLoading(false)
    } catch (error) {
      console.error('Error loading status history:', error)
      setLogs([])
      setLoading(false)
    }
  }

  const filterByDate = (items) => {
    if (!fromDate && !toDate) return items
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    return items.filter(item => {
      const d = item.effectiveDate || item.createdAt
      if (!d) return false
      const dt = new Date(d)
      if (from && dt < from) return false
      if (to) {
        const toEnd = new Date(to)
        toEnd.setHours(23, 59, 59, 999)
        if (dt > toEnd) return false
      }
      return true
    })
  }

  const filteredLogs = filterByDate(logs)

  if (loading) {
    return <div className="loadingState">Đang tải dữ liệu...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-history"></i>
          Lịch sử trạng thái nhân sự
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '4px' }}
          />
          <span>-</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '4px' }}
          />
          <button className="btn btn-primary" onClick={loadData}>
            <i className="fas fa-sync"></i>
            Làm mới
          </button>
          <SeedEmployeeStatusButton employees={employees} onComplete={loadData} />
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã nhân viên</th>
              <th>Tên nhân viên</th>
              <th>Trạng thái mới</th>
              <th>Ngày hiệu lực</th>
              <th>Người thực hiện</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => (
                <tr key={log.id || idx}>
                  <td>{idx + 1}</td>
                  <td>{escapeHtml(log.employeeCode || log.employeeId || '')}</td>
                  <td>{escapeHtml(log.employeeName || '')}</td>
                  <td>{escapeHtml(log.newStatus || '')}</td>
                  <td>{log.effectiveDate ? new Date(log.effectiveDate).toLocaleDateString('vi-VN') : ''}</td>
                  <td>{escapeHtml(log.actor || 'HR')}</td>
                  <td>{escapeHtml(log.note || '')}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-state">Không có thay đổi trạng thái trong kỳ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EmployeeStatusHistory


