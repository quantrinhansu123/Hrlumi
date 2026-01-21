import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function EmployeeModal({ employee, isOpen, onClose, onSave, readOnly = false }) {
  const [formData, setFormData] = useState({
    ho_va_ten: '',
    employeeId: '',
    email: '',
    sđt: '',
    chi_nhanh: 'HCM',
    bo_phan: '',
    vi_tri: '',
    trang_thai: 'Thử việc',
    ca_lam_viec: 'Ca full',
    ngay_vao_lam: '',
    ngay_lam_chinh_thuc: '',
    cccd: '',
    ngay_cap: '',
    noi_cap: '',
    dia_chi_thuong_tru: '',
    que_quan: '',
    ngay_sinh: '',
    gioi_tinh: '',
    tinh_trang_hon_nhan: '',
    avatarDataUrl: '',
    images: [],
    files: []
  })
  const [avatarPreview, setAvatarPreview] = useState('')
  const [imagesPreview, setImagesPreview] = useState([])
  const [filesPreview, setFilesPreview] = useState([])

  // State for URL inputs
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [galleryUrlInput, setGalleryUrlInput] = useState('')

  useEffect(() => {
    if (employee) {
      setFormData({
        ho_va_ten: employee.ho_va_ten || '',
        employeeId: employee.employeeId || '',
        email: employee.email || '',
        sđt: employee.sđt || employee.sdt || '',
        chi_nhanh: employee.chi_nhanh || 'HCM',
        bo_phan: employee.bo_phan || '',
        vi_tri: employee.vi_tri || '',
        trang_thai: employee.trang_thai || employee.status || 'Thử việc',
        ca_lam_viec: employee.ca_lam_viec || 'Ca full',
        ngay_vao_lam: employee.ngay_vao_lam || '',
        ngay_lam_chinh_thuc: employee.ngay_lam_chinh_thuc || '',
        cccd: employee.cccd || '',
        ngay_cap: employee.ngay_cap || '',
        noi_cap: employee.noi_cap || '',
        dia_chi_thuong_tru: employee.dia_chi_thuong_tru || '',
        que_quan: employee.que_quan || '',
        ngay_sinh: employee.ngay_sinh || employee.dob || '',
        gioi_tinh: employee.gioi_tinh || '',
        tinh_trang_hon_nhan: employee.tinh_trang_hon_nhan || '',
        avatarDataUrl: employee.avatarDataUrl || employee.avatarUrl || employee.avatar || '',
        images: employee.images || [],
        files: employee.files || []
      })

      const initialAvatar = employee.avatarDataUrl || employee.avatarUrl || employee.avatar || ''
      setAvatarPreview(initialAvatar)
      // If the initial avatar is a URL (starts with http), set it to the input too
      if (initialAvatar.startsWith('http')) {
        setAvatarUrlInput(initialAvatar)
      } else {
        setAvatarUrlInput('')
      }

      setImagesPreview(employee.images || [])
      setFilesPreview(employee.files || [])
    } else {
      resetForm()
    }
  }, [employee, isOpen])

  const resetForm = () => {
    setFormData({
      ho_va_ten: '',
      employeeId: '',
      email: '',
      sđt: '',
      chi_nhanh: 'HCM',
      bo_phan: '',
      vi_tri: '',
      trang_thai: 'Thử việc',
      ca_lam_viec: 'Ca full',
      ngay_vao_lam: '',
      ngay_lam_chinh_thuc: '',
      cccd: '',
      ngay_cap: '',
      noi_cap: '',
      dia_chi_thuong_tru: '',
      que_quan: '',
      ngay_sinh: '',
      gioi_tinh: '',
      tinh_trang_hon_nhan: '',
      avatarDataUrl: '',
      images: [],
      files: []
    })
    setAvatarPreview('')
    setImagesPreview([])
    setFilesPreview([])
    setAvatarUrlInput('')
    setGalleryUrlInput('')
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



  // Helper to process image URLs (supports Google Drive)
  const processImageUrl = (url) => {
    if (!url) return ''

    // Check for Google Drive share links
    // Formats: 
    // https://drive.google.com/file/d/FILE_ID/view
    // https://drive.google.com/open?id=FILE_ID
    // https://drive.google.com/uc?id=FILE_ID
    const driveRegex = /\/d\/([^/?]+)|id=([^&]+)/
    const match = url.match(driveRegex)

    if (match) {
      const id = match[1] || match[2]
      if (id) {
        // Use lh3.googleusercontent.com which is more reliable for embedding images
        return `https://lh3.googleusercontent.com/d/${id}`
      }
    }

    return url
  }

  // Handle Avatar URL Input
  const handleAvatarUrlChange = (e) => {
    const rawUrl = e.target.value
    setAvatarUrlInput(rawUrl)

    const displayUrl = processImageUrl(rawUrl)
    setAvatarPreview(displayUrl)
    setFormData({ ...formData, avatarDataUrl: displayUrl })
  }

  // Handle Gallery URL Add
  const handleAddGalleryUrl = () => {
    if (!galleryUrlInput) return

    const displayUrl = processImageUrl(galleryUrlInput)
    const newImages = [...imagesPreview, displayUrl]
    setImagesPreview(newImages)
    setFormData({
      ...formData,
      images: [...formData.images, displayUrl]
    })
    setGalleryUrlInput('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly) return

    try {
      const oldStatus = employee ? (employee.trang_thai || employee.status || '') : ''
      const newStatus = formData.trang_thai

      if (employee && employee.id) {
        const dbPayload = mapAppToUser(formData)
        const { error } = await supabase
          .from('users')
          .update(dbPayload)
          .eq('id', employee.id)

        if (error) throw error

        // Log thay đổi trạng thái nếu có đổi
        if (oldStatus !== newStatus) {
          const historyPayload = {
            employee_id: employee.id, // Supabase user ID
            employee_code: employee.employeeId || '', // Store employee code
            employee_name: formData.ho_va_ten || employee.ho_va_ten || '',
            new_status: newStatus,
            old_status: oldStatus,
            effective_date: new Date().toISOString().split('T')[0],
            actor: 'HR', // Could be dynamic if we track logged-in user
            note: 'Cập nhật trạng thái nhân sự'
          }

          const { error: historyError } = await supabase
            .from('employee_status_history')
            .insert([historyPayload])

          if (historyError) {
            console.error('Error logging status history:', historyError)
            // Non-blocking error, just log it
          }
        }
      } else {
        // Remove id from formData if it exists and is empty/null to allow auto-increment
        if ('id' in formData) delete formData.id

        const dbPayload = mapAppToUser(formData)
        dbPayload.password = '123456'

        const { error } = await supabase
          .from('users')
          .insert([dbPayload])

        if (error) throw error
      }
      onSave()
      onClose()
      resetForm()
    } catch (error) {
      alert('Lỗi khi lưu: ' + error.message)
    }
  }

  if (!isOpen) return null

  const getTitle = () => {
    if (readOnly) return 'Chi tiết hồ sơ nhân viên'
    return employee ? 'Sửa nhân viên' : 'Thêm nhân viên mới'
  }

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className={readOnly ? "fas fa-eye" : "fas fa-user"}></i>
            {getTitle()}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Mã nhân viên *</label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  placeholder="Ví dụ: NV001"
                  required
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Họ và tên *</label>
                <input
                  type="text"
                  name="ho_va_ten"
                  value={formData.ho_va_ten}
                  onChange={handleChange}
                  required
                  disabled={readOnly}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
                />
              </div>
              <div className="form-group">
                <label>Chi nhánh</label>
                <select
                  name="chi_nhanh"
                  value={formData.chi_nhanh}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
                />
              </div>
              <div className="form-group">
                <label>Vị trí</label>
                <input
                  type="text"
                  name="vi_tri"
                  value={formData.vi_tri}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
                >
                  <option value="Thử việc">Thử việc</option>
                  <option value="Chính thức">Chính thức</option>
                  <option value="Tạm nghỉ">Tạm nghỉ</option>
                  <option value="Nghỉ việc">Nghỉ việc</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ca làm việc</label>
                <select
                  name="ca_lam_viec"
                  value={formData.ca_lam_viec}
                  onChange={handleChange}
                  disabled={readOnly}
                >
                  <option value="Ca full">Ca full</option>
                  <option value="Ca sáng">Ca sáng (8h - 11h30)</option>
                  <option value="Ca chiều">Ca chiều (13h30 - 17h30)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ngày vào làm</label>
                <input
                  type="date"
                  name="ngay_vao_lam"
                  value={formData.ngay_vao_lam}
                  onChange={handleChange}
                  disabled={readOnly}
                />
              </div>
              <div className="form-group">
                <label>Ngày làm chính thức</label>
                <input
                  type="date"
                  name="ngay_lam_chinh_thuc"
                  value={formData.ngay_lam_chinh_thuc}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
                />
              </div>
              <div className="form-group">
                <label>Ngày cấp</label>
                <input
                  type="date"
                  name="ngay_cap"
                  value={formData.ngay_cap}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
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
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Địa chỉ thường trú</label>
                <input
                  type="text"
                  name="dia_chi_thuong_tru"
                  value={formData.dia_chi_thuong_tru}
                  onChange={handleChange}
                  placeholder="Địa chỉ thường trú"
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ngày sinh</label>
                <input
                  type="date"
                  name="ngay_sinh"
                  value={formData.ngay_sinh}
                  onChange={handleChange}
                  disabled={readOnly}
                />
              </div>
              <div className="form-group">
                <label>Giới tính</label>
                <select
                  name="gioi_tinh"
                  value={formData.gioi_tinh}
                  onChange={handleChange}
                  disabled={readOnly}
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
                  disabled={readOnly}
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
              {!readOnly && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9em', color: '#666' }}>Hoặc nhập link ảnh:</span>
                    <input
                      type="text"
                      placeholder="https://example.com/avatar.jpg"
                      value={avatarUrlInput}
                      onChange={handleAvatarUrlChange}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              )}
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
                      {!readOnly && (
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
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!readOnly && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
                  />
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Nhập link ảnh..."
                      value={galleryUrlInput}
                      onChange={(e) => setGalleryUrlInput(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={handleAddGalleryUrl}
                      style={{ padding: '8px 15px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              )}
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
                      {!readOnly && (
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
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!readOnly && (
                <input
                  type="file"
                  multiple
                  onChange={handleFilesChange}
                />
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={onClose}>
                {readOnly ? 'Đóng' : 'Hủy'}
              </button>
              {!readOnly && (
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  Lưu
                </button>
              )}
            </div>
          </form>
        </div>
      </div >
    </div >
  )
}

export default EmployeeModal

