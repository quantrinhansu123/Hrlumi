import React, { useState, useEffect } from 'react'
import { fbPush, fbUpdate } from '../services/firebase'
import { formatMoney } from '../utils/helpers'

function EmployeeKPIModal({ employeeKPI, employees, kpiTemplates, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employeeId: '',
    month: '',
    status: 'Chưa chốt',
    kpiValues: {}
  })

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
      if (totalWeight !== 100) {
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

  const activeTemplates = kpiTemplates.filter(t => t.status === 'Đang áp dụng')

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-user-check"></i>
            {employeeKPI ? 'Sửa KPI nhân viên' : 'Gán KPI cho nhân viên'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nhân viên *</label>
                <select
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Chọn nhân viên</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.ho_va_ten || emp.name || 'N/A'} - {emp.vi_tri || '-'}
                    </option>
                  ))}
                </select>
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

            {activeTemplates.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4>Nhập giá trị KPI</h4>
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

