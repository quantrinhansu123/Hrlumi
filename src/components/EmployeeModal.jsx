import React, { useEffect, useState } from 'react'
import { fbPush, fbUpdate } from '../services/firebase'

function EmployeeModal({ employee, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    ho_va_ten: '',
    email: '',
    sđt: '',
    chi_nhanh: 'HCM',
    bo_phan: '',
    vi_tri: '',
    trang_thai: 'Thử việc',
    ngay_vao_lam: '',
    cccd: '',
    ngay_cap: '',
    noi_cap: '',
    que_quan: '',
    gioi_tinh: '',
    tinh_trang_hon_nhan: '',
    avatarDataUrl: '',
    images: [],
    files: []
  })
  const [avatarPreview, setAvatarPreview] = useState('')
  const [imagesPreview, setImagesPreview] = useState([])
  const [filesPreview, setFilesPreview] = useState([])

  useEffect(() => {
    if (employee) {
      setFormData({
        ho_va_ten: employee.ho_va_ten || '',
        email: employee.email || '',
        sđt: employee.sđt || employee.sdt || '',
        chi_nhanh: employee.chi_nhanh || 'HCM',
        bo_phan: employee.bo_phan || '',
        vi_tri: employee.vi_tri || '',
        trang_thai: employee.trang_thai || employee.status || 'Thử việc',
        ngay_vao_lam: employee.ngay_vao_lam || '',
        cccd: employee.cccd || '',
        ngay_cap: employee.ngay_cap || '',
        noi_cap: employee.noi_cap || '',
        que_quan: employee.que_quan || '',
        gioi_tinh: employee.gioi_tinh || '',
        tinh_trang_hon_nhan: employee.tinh_trang_hon_nhan || '',
        avatarDataUrl: employee.avatarDataUrl || employee.avatarUrl || employee.avatar || '',
        images: employee.images || [],
        files: employee.files || []
      })
      setAvatarPreview(employee.avatarDataUrl || employee.avatarUrl || employee.avatar || '')
      setImagesPreview(employee.images || [])
      setFilesPreview(employee.files || [])
    } else {
      resetForm()
    }
  }, [employee, isOpen])

  const resetForm = () => {
    setFormData({
      ho_va_ten: '',
      email: '',
      sđt: '',
      chi_nhanh: 'HCM',
      bo_phan: '',
      vi_tri: '',
      trang_thai: 'Thử việc',
      ngay_vao_lam: '',
      cccd: '',
      ngay_cap: '',
      noi_cap: '',
      que_quan: '',
      gioi_tinh: '',
      tinh_trang_hon_nhan: '',
      avatarDataUrl: '',
      images: [],
      files: []
    })
    setAvatarPreview('')
    setImagesPreview([])
    setFilesPreview([])
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target.result
        setAvatarPreview(dataUrl)
        setFormData({ ...formData, avatarDataUrl: dataUrl })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImagesChange = async (e) => {
    const files = Array.from(e.target.files)
    const newImages = []
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          newImages.push(e.target.result)
          if (newImages.length === files.length) {
            setImagesPreview([...imagesPreview, ...newImages])
            setFormData({ 
              ...formData, 
              images: [...formData.images, ...newImages] 
            })
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleFilesChange = async (e) => {
    const files = Array.from(e.target.files)
    const newFiles = []
    
    for (const file of files) {
      const reader = new FileReader()
      reader.onload = (e) => {
        newFiles.push({
          name: file.name,
          data: e.target.result,
          type: file.type
        })
        if (newFiles.length === files.length) {
          setFilesPreview([...filesPreview, ...newFiles])
          setFormData({ 
            ...formData, 
            files: [...formData.files, ...newFiles] 
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (index) => {
    const newImages = imagesPreview.filter((_, i) => i !== index)
    setImagesPreview(newImages)
    setFormData({ ...formData, images: newImages })
  }

  const removeFile = (index) => {
    const newFiles = filesPreview.filter((_, i) => i !== index)
    setFilesPreview(newFiles)
    setFormData({ ...formData, files: newFiles })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const oldStatus = employee ? (employee.trang_thai || employee.status || '') : ''
      const newStatus = formData.trang_thai

      if (employee && employee.id) {
        await fbUpdate(`employees/${employee.id}`, formData)

        // Log thay đổi trạng thái nếu có đổi
        if (oldStatus !== newStatus) {
          await fbPush('hr/employee_status_history', {
            employeeId: employee.id,
            employeeName: formData.ho_va_ten || employee.ho_va_ten || '',
            newStatus: newStatus,
            oldStatus: oldStatus,
            effectiveDate: new Date().toISOString().split('T')[0],
            actor: 'HR',
            note: 'Cập nhật trạng thái nhân sự',
            createdAt: new Date().toISOString()
          })
        }
      } else {
        await fbPush('employees', formData)
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
            <i className="fas fa-user"></i>
            {employee ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Họ và tên *</label>
                <input
                  type="text"
                  name="ho_va_ten"
                  value={formData.ho_va_ten}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>SĐT</label>
                <input
                  type="text"
                  name="sđt"
                  value={formData.sđt}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Chi nhánh</label>
                <select
                  name="chi_nhanh"
                  value={formData.chi_nhanh}
                  onChange={handleChange}
                >
                  <option value="HCM">HCM</option>
                  <option value="Hà Nội">Hà Nội</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bộ phận</label>
                <input
                  type="text"
                  name="bo_phan"
                  value={formData.bo_phan}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Vị trí</label>
                <input
                  type="text"
                  name="vi_tri"
                  value={formData.vi_tri}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  name="trang_thai"
                  value={formData.trang_thai}
                  onChange={handleChange}
                >
                  <option value="Thử việc">Thử việc</option>
                  <option value="Chính thức">Chính thức</option>
                  <option value="Tạm nghỉ">Tạm nghỉ</option>
                  <option value="Nghỉ việc">Nghỉ việc</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ngày vào làm</label>
                <input
                  type="date"
                  name="ngay_vao_lam"
                  value={formData.ngay_vao_lam}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>CCCD/CMND</label>
                <input
                  type="text"
                  name="cccd"
                  value={formData.cccd}
                  onChange={handleChange}
                  placeholder="Số CCCD/CMND"
                />
              </div>
              <div className="form-group">
                <label>Ngày cấp</label>
                <input
                  type="date"
                  name="ngay_cap"
                  value={formData.ngay_cap}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nơi cấp</label>
                <input
                  type="text"
                  name="noi_cap"
                  value={formData.noi_cap}
                  onChange={handleChange}
                  placeholder="Nơi cấp CCCD/CMND"
                />
              </div>
              <div className="form-group">
                <label>Quê quán</label>
                <input
                  type="text"
                  name="que_quan"
                  value={formData.que_quan}
                  onChange={handleChange}
                  placeholder="Quê quán"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Giới tính</label>
                <select
                  name="gioi_tinh"
                  value={formData.gioi_tinh}
                  onChange={handleChange}
                >
                  <option value="">-- Chọn giới tính --</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tình trạng hôn nhân</label>
                <select
                  name="tinh_trang_hon_nhan"
                  value={formData.tinh_trang_hon_nhan}
                  onChange={handleChange}
                >
                  <option value="">-- Chọn tình trạng --</option>
                  <option value="Độc thân">Độc thân</option>
                  <option value="Đã kết hôn">Đã kết hôn</option>
                  <option value="Ly hôn">Ly hôn</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            {/* Avatar */}
            <div className="form-group">
              <label>Ảnh đại diện</label>
              {avatarPreview && (
                <div style={{ marginBottom: '10px' }}>
                  <img 
                    src={avatarPreview} 
                    alt="Avatar"
                    style={{
                      width: '100px',
                      height: '100px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Multiple Images */}
            <div className="form-group">
              <label>Nhiều ảnh</label>
              {imagesPreview.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {imagesPreview.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img 
                        src={img} 
                        alt={`Preview ${idx}`}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'var(--danger)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
              />
            </div>

            {/* Multiple Files */}
            <div className="form-group">
              <label>Nhiều file</label>
              {filesPreview.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  {filesPreview.map((file, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      marginBottom: '5px'
                    }}>
                      <span>{file.name || `File ${idx + 1}`}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        style={{
                          background: 'var(--danger)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                multiple
                onChange={handleFilesChange}
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

export default EmployeeModal

