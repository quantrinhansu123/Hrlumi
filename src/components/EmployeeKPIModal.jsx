import { useEffect, useState } from 'react'
import { fbPush, fbUpdate } from '../services/firebase'
import { normalizeString } from '../utils/helpers'

function EmployeeKPIModal({ employeeKPI, employees, kpiTemplates, targetedKPIId, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employeeId: '',
    month: '',
    status: 'Chưa chốt',
    kpiValues: {}
  })

  // Searchable Select State
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Sync search term with formData.employeeId
  useEffect(() => {
    if (formData.employeeId) {
      const emp = employees.find(e => e.id === formData.employeeId)
      if (emp) {
        setSearchTerm(emp.ho_va_ten || emp.name || '')
      }
    } else {
      setSearchTerm('')
    }
  }, [formData.employeeId, employees])

  useEffect(() => {
    if (employeeKPI) {
      setFormData({
        employeeId: employeeKPI.employeeId || '',
        month: employeeKPI.month || '',
        status: employeeKPI.status || 'Chưa chốt',
        kpiValues: employeeKPI.kpiValues || {}
      })
    } else {
      resetForm()
    }
  }, [employeeKPI, isOpen])

  const resetForm = () => {
    const today = new Date()
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    setFormData({
      employeeId: '',
      month: monthStr,
      status: 'Chưa chốt',
      kpiValues: {}
    })
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleKPIValueChange = (kpiId, field, value) => {
    setFormData(prev => ({
      ...prev,
      kpiValues: {
        ...prev.kpiValues,
        [kpiId]: {
          ...prev.kpiValues[kpiId],
          kpiId,
          [field]: field === 'target' || field === 'actual' ? (typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) || 0 : value) : value
        }
      }
    }))
  }

  const calculateTotalWeight = () => {
    return Object.values(formData.kpiValues).reduce((sum, kpi) => {
      const template = kpiTemplates.find(t => t.id === kpi.kpiId || t.code === kpi.kpiId)
      return sum + (template?.weight || 0)
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const totalWeight = calculateTotalWeight()
      if (totalWeight !== 100 && !targetedKPIId) {
        if (!confirm(`Tổng trọng số hiện tại là ${totalWeight}%. Bạn có muốn tiếp tục?`)) {
          return
        }
      }

      if (employeeKPI && employeeKPI.id) {
        await fbUpdate(`hr/employeeKPIs/${employeeKPI.id}`, formData)
      } else {
        await fbPush('hr/employeeKPIs', formData)
      }
      onSave()
      onClose()
      resetForm()
    } catch (error) {
      alert('Lỗi khi lưu: ' + error.message)
    }
  }

  if (!isOpen) return null

  // Filter templates: if targetedKPIId is present, show only that template
  const activeTemplates = kpiTemplates
    .filter(t => t.status === 'Đang áp dụng')
    .filter(t => !targetedKPIId || t.id === targetedKPIId || t.code === targetedKPIId)

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-user-check"></i>
            {targetedKPIId ? 'Nhập kết quả KPI chi tiết' : (employeeKPI ? 'Sửa KPI nhân viên' : 'Gán KPI cho nhân viên')}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {!targetedKPIId && (
              <div className="form-row">
                <div className="form-group">
                  <label>Nhân viên *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Tìm kiếm nhân viên..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setShowDropdown(true)
                        // Clear ID if text changes (force re-select)
                        if (formData.employeeId) {
                          handleChange({ target: { name: 'employeeId', value: '' } })
                        }
                      }}
                      onFocus={() => setShowDropdown(true)}
                      style={{ width: '100%', padding: '8px' }}
                      required // Input itself required if ID is empty? Form validation checks formData.employeeId mostly.
                    />
                    {/* Hidden select to satisfy required attribute if needed, or just rely on validation. 
                       Here we ensure visual requirement. The actual validation checks formData.employeeId in handleSubmit usually or native form validation.
                       For native form validation to work with custom input, we might need a hidden input being the specific one.
                   */}
                    <input
                      type="text"
                      style={{ display: 'none' }}
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={() => { }}
                      required
                    />

                    {showDropdown && (
                      <ul style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '0 0 4px 4px',
                        zIndex: 1000,
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}>
                        {employees
                          .filter(emp => {
                            const name = emp.ho_va_ten || emp.name || ''
                            return normalizeString(name).includes(normalizeString(searchTerm))
                          })
                          .map(emp => (
                            <li
                              key={emp.id}
                              onClick={() => {
                                handleChange({ target: { name: 'employeeId', value: emp.id } })
                                setSearchTerm(emp.ho_va_ten || emp.name || '')
                                setShowDropdown(false)
                              }}
                              style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eee',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.target.style.background = '#fff'}
                            >
                              <strong>{emp.ho_va_ten || emp.name || 'N/A'}</strong>
                              <br />
                              <small style={{ color: '#666' }}>{emp.vi_tri || '-'} | {emp.bo_phan || '-'}</small>
                            </li>
                          ))}
                        {employees.filter(emp => normalizeString(emp.ho_va_ten || emp.name || '').includes(normalizeString(searchTerm))).length === 0 && (
                          <li style={{ padding: '10px', color: '#999', textAlign: 'center' }}>
                            Không tìm thấy nhân viên
                          </li>
                        )}
                      </ul>
                    )}
                    {/* Overlay to close dropdown */}
                    {showDropdown && (
                      <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                        onClick={() => setShowDropdown(false)}
                      />
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Tháng *</label>
                  <input
                    type="month"
                    name="month"
                    value={formData.month}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}

            {activeTemplates.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                {!targetedKPIId && <h4>Nhập giá trị KPI</h4>}
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Mã KPI</th>
                        <th>Tên KPI</th>
                        <th>Đơn vị</th>
                        <th>Kế hoạch</th>
                        <th>Trọng số (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTemplates.map(template => {
                        const kpiValue = formData.kpiValues[template.id] || formData.kpiValues[template.code] || {}
                        return (
                          <tr key={template.id}>
                            <td>{template.code || template.id}</td>
                            <td>{template.name}</td>
                            <td>{template.unit}</td>
                            <td>
                              <input
                                type={template.unit === 'VNĐ' ? 'text' : 'number'}
                                value={kpiValue.target || ''}
                                onChange={(e) => {
                                  if (template.unit === 'VNĐ') {
                                    const numValue = parseFloat(e.target.value.replace(/[^\d.-]/g, '')) || 0
                                    handleKPIValueChange(template.id, 'target', numValue)
                                  } else {
                                    handleKPIValueChange(template.id, 'target', parseFloat(e.target.value) || 0)
                                  }
                                }}
                                placeholder="Nhập kế hoạch"
                                style={{ width: '150px' }}
                              />
                            </td>
                            <td>{template.weight}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <strong>Tổng trọng số: {calculateTotalWeight()}%</strong>
                  {calculateTotalWeight() !== 100 && (
                    <span style={{ color: 'var(--warning)', marginLeft: '10px' }}>
                      (Khuyến nghị: 100%)
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Trạng thái</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Chưa chốt">Chưa chốt</option>
                <option value="Đã giao">Đã giao</option>
              </select>
            </div>

            <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-save"></i>
                Lưu
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EmployeeKPIModal

