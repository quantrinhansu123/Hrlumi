import { useEffect, useState } from 'react'
import { fbPush, fbUpdate } from '../services/firebase'
import { formatMoney } from '../utils/helpers'

function InsuranceModal({ insurance, employees, employeeSalaries, salaryGrades, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employeeId: '',
    soSoBHXH: '',
    ngayThamGia: '',
    mucLuongDong: 0,
    tyLeNLD: 10.5,
    tyLeDN: 21.5,
    status: 'Đang tham gia'
  })

  useEffect(() => {
    if (insurance) {
      setFormData({
        employeeId: insurance.employeeId || '',
        soSoBHXH: insurance.soSoBHXH || insurance.soSo || '',
        ngayThamGia: insurance.ngayThamGia || '',
        mucLuongDong: insurance.mucLuongDong || insurance.mucLuong || 0,
        tyLeNLD: insurance.tyLeNLD || insurance.tyLeNhanVien || 10.5,
        tyLeDN: insurance.tyLeDN || insurance.tyLeDoanhNghiep || 21.5,
        status: insurance.status || 'Đang tham gia'
      })
    } else {
      resetForm()
    }
  }, [insurance, isOpen])

  const resetForm = () => {
    setFormData({
      employeeId: '',
      soSoBHXH: '',
      ngayThamGia: '',
      mucLuongDong: 0,
      tyLeNLD: 10.5,
      tyLeDN: 21.5,
      status: 'Đang tham gia'
    })
  }

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value

    // Auto-fill Salary from Grade if Employee changes
    if (e.target.name === 'employeeId') {
      const empId = value
      // Find salary in employeeSalaries
      const empSalaryRecord = employeeSalaries?.find(es => es.employeeId === empId)
      let salaryValue = 0

      if (empSalaryRecord) {
        const grade = salaryGrades?.find(g => g.id === empSalaryRecord.salaryGradeId)
        if (grade) {
          salaryValue = grade.salary || 0
        }
      }

      if (salaryValue > 0) {
        setFormData(prev => ({
          ...prev,
          [e.target.name]: value,
          mucLuongDong: salaryValue
        }))
        return
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (insurance && insurance.id) {
        await fbUpdate(`hr/insuranceInfo/${insurance.id}`, formData)
      } else {
        await fbPush('hr/insuranceInfo', formData)
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
            <i className="fas fa-hospital"></i>
            {insurance ? 'Sửa thông tin BHXH' : 'Thêm thông tin BHXH'}
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
                <label>Số sổ BHXH *</label>
                <input
                  type="text"
                  name="soSoBHXH"
                  value={formData.soSoBHXH}
                  onChange={handleChange}
                  required
                  placeholder="VD: 123456789"
                />
              </div>
              <div className="form-group">
                <label>Ngày tham gia *</label>
                <input
                  type="date"
                  name="ngayThamGia"
                  value={formData.ngayThamGia}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Mức lương đóng BHXH (VNĐ) *</label>
                <input
                  type="number"
                  name="mucLuongDong"
                  value={formData.mucLuongDong}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Đang tham gia">Đang tham gia</option>
                  <option value="Dừng đóng">Dừng đóng</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tỷ lệ NLĐ (%)</label>
                <input
                  type="number"
                  name="tyLeNLD"
                  value={formData.tyLeNLD}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Tỷ lệ DN (%)</label>
                <input
                  type="number"
                  name="tyLeDN"
                  value={formData.tyLeDN}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>

            <div style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px' }}>
              <strong>Mức đóng BHXH hàng tháng:</strong>
              <div style={{ marginTop: '5px' }}>
                NLĐ: {formatMoney((formData.mucLuongDong * formData.tyLeNLD) / 100)}
              </div>
              <div>
                DN: {formatMoney((formData.mucLuongDong * formData.tyLeDN) / 100)}
              </div>
              <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
                Tổng: {formatMoney((formData.mucLuongDong * (formData.tyLeNLD + formData.tyLeDN)) / 100)}
              </div>
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

export default InsuranceModal

