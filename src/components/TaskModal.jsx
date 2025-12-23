import React, { useState, useEffect } from 'react'
import { fbPush, fbUpdate } from '../services/firebase'

function TaskModal({ task, employees, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    department: '',
    assignerId: '',
    assigneeId: '',
    priority: 'Trung bình',
    startDate: '',
    deadline: '',
    status: 'Chưa bắt đầu',
    description: '',
    resultFileLink: ''
  })

  useEffect(() => {
    if (task) {
      setFormData({
        code: task.code || task.id || '',
        name: task.name || task.title || '',
        department: task.department || '',
        assignerId: task.assignerId || '',
        assigneeId: task.assigneeId || '',
        priority: task.priority || 'Trung bình',
        startDate: task.startDate || '',
        deadline: task.deadline || '',
        status: task.status || 'Chưa bắt đầu',
        description: task.description || task.moTa || '',
        resultFileLink: task.resultFileLink || task.linkFileKetQua || ''
      })
    } else {
      resetForm()
    }
  }, [task, isOpen])

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      code: '',
      name: '',
      department: '',
      assignerId: '',
      assigneeId: '',
      priority: 'Trung bình',
      startDate: today,
      deadline: '',
      status: 'Chưa bắt đầu',
      description: '',
      resultFileLink: ''
    })
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const generateTaskCode = () => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `T-${month}-${random}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        code: formData.code || generateTaskCode(),
        assignerName: employees.find(e => e.id === formData.assignerId)?.ho_va_ten || 
                     employees.find(e => e.id === formData.assignerId)?.name || 
                     formData.assignerId
      }

      if (task && task.id) {
        await fbUpdate(`hr/tasks/${task.id}`, data)
      } else {
        await fbPush('hr/tasks', data)
        
        // Create initial log
        await fbPush('hr/taskLogs', {
          taskId: data.code,
          action: 'Tạo công việc',
          description: `Công việc "${data.name}" đã được tạo`,
          createdBy: data.assignerId,
          createdAt: new Date().toISOString()
        })
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-clipboard-list"></i>
            {task ? 'Sửa công việc' : 'Tạo công việc mới'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Mã công việc</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Tự động tạo nếu để trống"
                />
              </div>
              <div className="form-group">
                <label>Tên công việc *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="VD: Lập kế hoạch MKT T12"
                />
              </div>
            </div>

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
                <label>Mức ưu tiên *</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  required
                >
                  <option value="Cao">Cao</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Thấp">Thấp</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Người giao *</label>
                <select
                  name="assignerId"
                  value={formData.assignerId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Chọn người giao</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.ho_va_ten || emp.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Người nhận *</label>
                <select
                  name="assigneeId"
                  value={formData.assigneeId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Chọn người nhận</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.ho_va_ten || emp.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ngày bắt đầu *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Deadline *</label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                  <option value="Đang làm">Đang làm</option>
                  <option value="Đã xong">Đã xong</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                  <option value="Tạm dừng">Tạm dừng</option>
                </select>
              </div>
              <div className="form-group">
                <label>Link file kết quả</label>
                <input
                  type="url"
                  name="resultFileLink"
                  value={formData.resultFileLink}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mô tả công việc</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                placeholder="Mô tả chi tiết công việc..."
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

export default TaskModal

