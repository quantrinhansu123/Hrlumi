import React, { useState, useEffect } from 'react'
import { fbPush, fbUpdate } from '../services/firebase'

function DependentModal({ dependent, employees, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employeeId: '',
    hoTen: '',
    quanHe: '',
    ngaySinh: '',
    cccd: '',
    tuNgay: '',
    denNgay: '',
    status: 'Đang áp dụng'
  })

  useEffect(() => {
    if (dependent) {
      setFormData({
        employeeId: dependent.employeeId || '',
        hoTen: dependent.hoTen || dependent.name || '',
        quanHe: dependent.quanHe || dependent.relationship || '',
        ngaySinh: dependent.ngaySinh || '',
        cccd: dependent.cccd || dependent.cmnd || '',
        tuNgay: dependent.tuNgay || '',
        denNgay: dependent.denNgay || '',
        status: dependent.status || 'Đang áp dụng'
      })
    } else {
      resetForm()
    }
  }, [dependent, isOpen])

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      employeeId: '',
      hoTen: '',
      quanHe: '',
      ngaySinh: '',
      cccd: '',
      tuNgay: today,
      denNgay: '',
      status: 'Đang áp dụng'
    })
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (dependent && dependent.id) {
        await fbUpdate(`hr/dependents/${dependent.id}`, formData)
      } else {
        await fbPush('hr/dependents', formData)
      }
      onSave()
      onClose()
      resetForm()
    } catch (error) {
      alert('Lỗi khi lưu: ' + error.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-users"></i>
            {dependent ? 'Sửa người phụ thuộc' : 'Thêm người phụ thuộc'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
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

            <div className="form-row">
              <div className="form-group">
                <label>Họ tên người phụ thuộc *</label>
                <input
                  type="text"
                  name="hoTen"
                  value={formData.hoTen}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Quan hệ *</label>
                <select
                  name="quanHe"
                  value={formData.quanHe}
                  onChange={handleChange}
                  required
                >
                  <option value="">Chọn quan hệ</option>
                  <option value="Con">Con</option>
                  <option value="Vợ">Vợ</option>
                  <option value="Chồng">Chồng</option>
                  <option value="Cha">Cha</option>
                  <option value="Mẹ">Mẹ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ngày sinh *</label>
                <input
                  type="date"
                  name="ngaySinh"
                  value={formData.ngaySinh}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>CCCD/CMND</label>
                <input
                  type="text"
                  name="cccd"
                  value={formData.cccd}
                  onChange={handleChange}
                  placeholder="..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Thời gian giảm trừ từ *</label>
                <input
                  type="date"
                  name="tuNgay"
                  value={formData.tuNgay}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Thời gian giảm trừ đến</label>
                <input
                  type="date"
                  name="denNgay"
                  value={formData.denNgay}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Trạng thái</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Đang áp dụng">Đang áp dụng</option>
                <option value="Ngừng áp dụng">Ngừng áp dụng</option>
              </select>
            </div>

            <div style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px', fontSize: '0.9rem' }}>
              <strong>Lưu ý:</strong> Mỗi người phụ thuộc được giảm trừ 4.400.000 VNĐ/tháng trong tính thuế TNCN.
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

export default DependentModal

