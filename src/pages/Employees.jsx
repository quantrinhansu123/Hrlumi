import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import EmployeeModal from '../components/EmployeeModal'
import { fbDelete, fbGet, fbPush } from '../services/firebase'
import { escapeHtml } from '../utils/helpers'

function Employees() {
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const fileInputRef = useRef(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [employees, searchTerm, filterBranch, filterDept, filterStatus])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const raw = await fbGet("employees")
      let data = []
      
      if (raw === null || raw === undefined) {
        data = []
      } else if (Array.isArray(raw)) {
        data = raw.filter(item => item !== null && item !== undefined)
      } else if (typeof raw === "object") {
        data = Object.entries(raw)
          .filter(([k,v]) => v !== null && v !== undefined)
          .map(([k,v]) => ({...v, id: k}))
      }
      
      setEmployees(data)
      setLoading(false)
    } catch (err) {
      console.error("Error loading employees:", err)
      setEmployees([])
      setLoading(false)
    }
  }

  const filterEmployees = () => {
    let filtered = employees.filter(item => {
      if (!item) return false
      
      const nameField = item.ho_va_ten || item.name || item.Tên || ""
      const matchSearch = !searchTerm || 
        nameField.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sđt && String(item.sđt || '').includes(searchTerm)) ||
        (item.sdt && String(item.sdt || '').includes(searchTerm))
      
      const matchBranch = !filterBranch || item.chi_nhanh === filterBranch
      const matchDept = !filterDept || item.bo_phan === filterDept
      const matchStatus = !filterStatus || item.trang_thai === filterStatus || item.status === filterStatus
      
      return matchSearch && matchBranch && matchDept && matchStatus
    })
    
    setFilteredEmployees(filtered)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Bạn có chắc muốn xóa nhân viên "${name}"?\n\nHành động này không thể hoàn tác!`)) {
      return
    }
    
    try {
      await fbDelete(`employees/${id}`)
      alert(`Đã xóa nhân viên "${name}"`)
      loadEmployees()
    } catch (error) {
      alert(`Lỗi: ${error.message}`)
    }
  }

  const exportToExcel = () => {
    if (filteredEmployees.length === 0) {
      alert('Không có dữ liệu để xuất!')
      return
    }

    const headers = [
      'STT',
      'Họ và tên',
      'Email',
      'SĐT',
      'Chi nhánh',
      'Bộ phận',
      'Vị trí',
      'Trạng thái',
      'Ngày vào làm',
      'CCCD',
      'Ngày cấp',
      'Nơi cấp',
      'Quê quán',
      'Giới tính',
      'Tình trạng hôn nhân'
    ]

    const escapeCell = (val) => {
      return String(val || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    const rowsHtml = filteredEmployees.map((emp, idx) => {
      const cells = [
        idx + 1,
        emp.ho_va_ten || emp.name || emp.Tên || '',
        emp.email || '',
        emp.sđt || emp.sdt || '',
        emp.chi_nhanh || '',
        emp.bo_phan || '',
        emp.vi_tri || '',
        emp.trang_thai || emp.status || '',
        emp.ngay_vao_lam || '',
        emp.cccd || '',
        emp.ngay_cap || '',
        emp.noi_cap || '',
        emp.que_quan || '',
        emp.gioi_tinh || '',
        emp.tinh_trang_hon_nhan || ''
      ]
      const tds = cells.map(cell => `<td>${escapeCell(cell)}</td>`).join('')
      return `<tr>${tds}</tr>`
    }).join('')

    const headerHtml = headers.map(h => `<th>${escapeCell(h)}</th>`).join('')
    const tableHtml = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`

    // Bọc trong HTML để Excel mở định dạng bảng
    const htmlContent = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>${tableHtml}</body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0]
    link.href = url
    link.download = `Danh_sach_nhan_su_${dateStr}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      if (!rows || rows.length < 2) {
        alert('File không có dữ liệu.')
        return
      }

      const headers = rows[0].map(h => String(h || '').trim().toLowerCase())
      const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell || '').trim() !== ''))
      let imported = 0

      for (const row of dataRows) {
        const rowObj = {}
        headers.forEach((h, idx) => {
          rowObj[h] = row[idx] || ''
        })

        const payload = {
          ho_va_ten: rowObj['ho_va_ten'] || rowObj['ten'] || '',
          email: rowObj['email'] || '',
          sđt: rowObj['sđt'] || rowObj['sdt'] || rowObj['so_dien_thoai'] || '',
          chi_nhanh: rowObj['chi_nhanh'] || '',
          bo_phan: rowObj['bo_phan'] || '',
          vi_tri: rowObj['vi_tri'] || '',
          trang_thai: rowObj['trang_thai'] || '',
          ngay_vao_lam: rowObj['ngay_vao_lam'] || '',
          cccd: rowObj['cccd'] || '',
          ngay_cap: rowObj['ngay_cap'] || '',
          noi_cap: rowObj['noi_cap'] || '',
          que_quan: rowObj['que_quan'] || '',
          gioi_tinh: rowObj['gioi_tinh'] || '',
          tinh_trang_hon_nhan: rowObj['tinh_trang_hon_nhan'] || ''
        }

        if (!payload.ho_va_ten) continue
        await fbPush('employees', payload)
        imported++
      }

      await loadEmployees()
      alert(`Đã import ${imported} dòng.`)
    } catch (error) {
      alert('Lỗi import: ' + error.message)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Get unique departments
  const departments = [...new Set(employees.map(e => e.bo_phan).filter(Boolean))].sort()

  if (loading) {
    return <div className="loadingState">Đang tải dữ liệu...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-users"></i>
          Hồ sơ nhân sự
        </h1>
        <div>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setSelectedEmployee(null)
              setIsModalOpen(true)
            }}
            style={{ marginRight: '10px' }}
          >
            <i className="fas fa-plus"></i>
            Tạo mới NV
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsImportModalOpen(true)}
            style={{ marginRight: '10px' }}
          >
            <i className="fas fa-file-upload"></i>
            Upload Excel
          </button>
          <button 
            className="btn btn-success" 
            onClick={exportToExcel}
            style={{ 
              marginRight: '10px',
              background: '#28a745',
              borderColor: '#28a745',
              color: '#fff'
            }}
          >
            <i className="fas fa-file-excel"></i>
            Tải Excel
          </button>
          <button className="btn btn-primary" onClick={loadEmployees}>
            <i className="fas fa-sync"></i>
            Làm mới
          </button>
        </div>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Tìm theo Mã NV, Họ tên, SĐT, Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
          <option value="">Tất cả chi nhánh</option>
          <option value="HCM">HCM</option>
          <option value="Hà Nội">Hà Nội</option>
        </select>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">Tất cả phòng ban</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="Thử việc">Thử việc</option>
          <option value="Chính thức">Chính thức</option>
          <option value="Tạm nghỉ">Tạm nghỉ</option>
          <option value="Nghỉ việc">Nghỉ việc</option>
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Ảnh</th>
              <th>Họ và tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Chi nhánh</th>
              <th>Bộ phận</th>
              <th>Vị trí</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp, idx) => {
                const name = emp.ho_va_ten || emp.name || emp.Tên || 'N/A'
                const avatar = emp.avatarDataUrl || emp.avatarUrl || emp.avatar || ''
                return (
                  <tr key={emp.id || idx}>
                    <td>{idx + 1}</td>
                    <td>
                      {avatar ? (
                        <img 
                          src={avatar} 
                          alt={name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      ) : (
                        <span style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'inline-block'
                        }}></span>
                      )}
                    </td>
                    <td>{escapeHtml(name)}</td>
                    <td>{escapeHtml(emp.email || '-')}</td>
                    <td>{escapeHtml(emp.sđt || emp.sdt || '-')}</td>
                    <td>{escapeHtml(emp.chi_nhanh || '-')}</td>
                    <td>{escapeHtml(emp.bo_phan || '-')}</td>
                    <td>{escapeHtml(emp.vi_tri || '-')}</td>
                    <td>
                      <div className="actions">
                        <button 
                          className="view" 
                          title="Xem"
                          onClick={() => {
                            setSelectedEmployee(emp)
                            setIsModalOpen(true)
                          }}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="edit" 
                          title="Sửa"
                          onClick={() => {
                            setSelectedEmployee(emp)
                            setIsModalOpen(true)
                          }}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="delete" 
                          title="Xóa"
                          onClick={() => handleDelete(emp.id, name)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="9" className="empty-state">
                  {employees.length === 0 ? 'Chưa có dữ liệu nhân sự' : 'Không tìm thấy kết quả'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EmployeeModal
        employee={selectedEmployee}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedEmployee(null)
        }}
        onSave={loadEmployees}
      />

      {isImportModalOpen && (
        <div className="modal show" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-file-upload"></i>
                Upload Excel nhân sự
              </h3>
              <button className="modal-close" onClick={() => setIsImportModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Chọn tệp (.xlsx, .xls, .csv)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  ref={fileInputRef}
                  onChange={(e) => {
                    handleImportExcel(e)
                    setIsImportModalOpen(false)
                  }}
                />
              </div>
              <div className="form-group">
                <label>Lưu ý định dạng cột (theo thứ tự):</label>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>Họ và tên</li>
                  <li>Email</li>
                  <li>SĐT</li>
                  <li>Chi nhánh</li>
                  <li>Bộ phận</li>
                  <li>Vị trí</li>
                  <li>Trạng thái</li>
                  <li>Ngày vào làm</li>
                  <li>CCCD</li>
                  <li>Ngày cấp</li>
                  <li>Nơi cấp</li>
                  <li>Quê quán</li>
                  <li>Giới tính</li>
                  <li>Tình trạng hôn nhân</li>
                </ul>
                <small>Hàng đầu tiên nên là header với tên cột như trên.</small>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn" onClick={() => setIsImportModalOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees

