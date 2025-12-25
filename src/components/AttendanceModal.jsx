import { useEffect, useState } from 'react'
import { fbPush, fbUpdate } from '../services/firebase'
import { normalizeString } from '../utils/helpers'

function AttendanceModal({ attendance, employees, isOpen, onClose, onSave, readOnly = false }) {
    const [formData, setFormData] = useState({
        employeeId: '',
        date: '',
        checkIn: '',
        checkOut: '',
        hours: 0,
        status: 'Đủ'
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [showDropdown, setShowDropdown] = useState(false)

    useEffect(() => {
        if (attendance) {
            // Parse initial data
            const date = attendance.date ? new Date(attendance.date).toISOString().split('T')[0] : ''
            const checkIn = attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
            const checkOut = attendance.checkOut ? new Date(attendance.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''

            setFormData({
                employeeId: attendance.employeeId || '',
                date: date,
                checkIn: checkIn,
                checkOut: checkOut,
                hours: attendance.hours || attendance.soGio || 0,
                status: attendance.status || 'Đủ'
            })

            if (attendance.employeeId) {
                const emp = employees.find(e => e.id === attendance.employeeId)
                if (emp) {
                    setSearchTerm(emp.ho_va_ten || emp.name || '')
                }
            }
        } else {
            resetForm()
        }
    }, [attendance, isOpen])

    const resetForm = () => {
        const today = new Date().toISOString().split('T')[0]
        setFormData({
            employeeId: '',
            date: today,
            checkIn: '08:00',
            checkOut: '17:30',
            hours: 8,
            status: 'Đủ'
        })
        setSearchTerm('')
        setShowDropdown(false)
    }

    const calculateHours = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 0

        const [h1, m1] = checkIn.split(':').map(Number)
        const [h2, m2] = checkOut.split(':').map(Number)

        const start = h1 + m1 / 60
        const end = h2 + m2 / 60

        let diff = end - start

        // Suggest lunch break deduction if spans over noon (simple rule)
        if (start <= 12 && end >= 13.5) {
            diff -= 1.5 // 1.5h lunch break
        }

        return Math.max(0, Math.round(diff * 10) / 10)
    }

    const handleChange = (e) => {
        const { name, value } = e.target

        const updatedForm = { ...formData, [name]: value }

        if (name === 'checkIn' || name === 'checkOut') {
            const hours = calculateHours(updatedForm.checkIn, updatedForm.checkOut)
            updatedForm.hours = hours

            // Auto status
            if (hours >= 8) updatedForm.status = 'Đủ'
            else if (hours > 0) updatedForm.status = 'Thiếu'
            else updatedForm.status = 'Vắng'
        }

        setFormData(updatedForm)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (readOnly) return

        try {
            // Reconstruct timestamp dates
            const baseDate = new Date(formData.date)

            let checkInDate = null
            if (formData.checkIn) {
                const [h, m] = formData.checkIn.split(':')
                checkInDate = new Date(baseDate)
                checkInDate.setHours(h, m, 0)
            }

            let checkOutDate = null
            if (formData.checkOut) {
                const [h, m] = formData.checkOut.split(':')
                checkOutDate = new Date(baseDate)
                checkOutDate.setHours(h, m, 0)
            }

            const dataToSave = {
                employeeId: formData.employeeId,
                date: formData.date, // Store string date for easy query
                timestamp: baseDate.getTime(),
                checkIn: checkInDate ? checkInDate.toISOString() : null,
                checkOut: checkOutDate ? checkOutDate.toISOString() : null,
                hours: parseFloat(formData.hours),
                status: formData.status
            }

            if (attendance && attendance.id) {
                await fbUpdate(`hr/attendanceLogs/${attendance.id}`, dataToSave)
            } else {
                await fbPush('hr/attendanceLogs', dataToSave)
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
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3>
                        <i className={`fas ${readOnly ? 'fa-eye' : 'fa-clock'}`}></i>
                        {readOnly ? 'Chi tiết chấm công' : (attendance ? 'Sửa chấm công' : 'Thêm chấm công')}
                    </h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
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
                                        if (formData.employeeId) {
                                            setFormData(prev => ({ ...prev, employeeId: '' }))
                                        }
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    disabled={readOnly}
                                    style={{ width: '100%' }}
                                    required
                                />
                                {showDropdown && !readOnly && (
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
                                                        setFormData({ ...formData, employeeId: emp.id })
                                                        setSearchTerm(emp.ho_va_ten || emp.name || 'N/A')
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
                                            <li style={{ padding: '10px', color: '#999', textAlign: 'center' }}>Không tìm thấy nhân viên</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                            {showDropdown && (
                                <div
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                                    onClick={() => setShowDropdown(false)}
                                />
                            )}
                        </div>

                        <div className="form-group">
                            <label>Ngày *</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                                disabled={readOnly}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Check-in (Giờ vào)</label>
                                <input
                                    type="time"
                                    name="checkIn"
                                    value={formData.checkIn}
                                    onChange={handleChange}
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="form-group">
                                <label>Check-out (Giờ ra)</label>
                                <input
                                    type="time"
                                    name="checkOut"
                                    value={formData.checkOut}
                                    onChange={handleChange}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Số giờ làm</label>
                                <input
                                    type="number"
                                    name="hours"
                                    value={formData.hours}
                                    onChange={handleChange}
                                    step="0.1"
                                    min="0"
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="form-group">
                                <label>Trạng thái</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    disabled={readOnly}
                                >
                                    <option value="Đủ">Đủ công</option>
                                    <option value="Thiếu">Thiếu công</option>
                                    <option value="Muộn">Đi muộn</option>
                                    <option value="Sớm">Về sớm</option>
                                    <option value="Vắng">Vắng mặt</option>
                                    <option value="Nghỉ phép">Nghỉ phép</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn" onClick={onClose}>
                                {readOnly ? 'Đóng' : 'Hủy'}
                            </button>
                            {!readOnly && (
                                <button type="submit" className="btn btn-primary">
                                    <i className="fas fa-save"></i> Lưu
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default AttendanceModal
