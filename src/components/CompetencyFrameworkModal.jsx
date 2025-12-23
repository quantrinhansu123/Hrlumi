import React, { useState, useEffect } from 'react'
import { fbPush, fbUpdate } from '../services/firebase'

function CompetencyFrameworkModal({ framework, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    department: '',
    position: '',
    group: 'Chuyên môn',
    name: '',
    level: 1,
    status: 'Áp dụng',
    note: ''
  })

  useEffect(() => {
    if (framework) {
      setFormData({
        department: framework.department || '',
        position: framework.position || '',
        group: framework.group || 'Chuyên môn',
        name: framework.name || '',
        level: framework.level || 1,
        status: framework.status || 'Áp dụng',
        note: framework.note || ''
      })
    } else {
      resetForm()
    }
  }, [framework, isOpen])

  const resetForm = () => {
    setFormData({
      department: '',
      position: '',
      group: 'Chuyên môn',
      name: '',
      level: 1,
      status: 'Áp dụng',
      note: ''
    })
  }

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) || 1 : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (framework && framework.id) {
        await fbUpdate(`hr/competencyFramework/${framework.id}`, formData)
      } else {
        await fbPush('hr/competencyFramework', formData)
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
            <i className="fas fa-graduation-cap"></i>
            {framework ? 'Sửa khung năng lực' : 'Thêm khung năng lực'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Bộ phận *</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                >
                  <option value="">Chọn bộ phận</option>
                  <option value="MKT">Marketing</option>
                  <option value="Sale">Sale</option>
                  <option value="Vận đơn">Vận đơn</option>
                  <option value="CSKH">CSKH</option>
                </select>
              </div>
              <div className="form-group">
                <label>Vị trí *</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  placeholder="VD: MKT 1, Sale 2, Trưởng team..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nhóm năng lực *</label>
                <select
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                  required
                >
                  <option value="Chuyên môn">Chuyên môn</option>
                  <option value="Lãnh đạo">Lãnh đạo</option>
                  <option value="Cá nhân">Cá nhân</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tên năng lực *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="VD: Lập kế hoạch & giám sát KPI"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Level yêu cầu (1-5) *</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  required
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Áp dụng">Áp dụng</option>
                  <option value="Ngừng">Ngừng</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Ghi chú</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows="3"
              />
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

export default CompetencyFrameworkModal

