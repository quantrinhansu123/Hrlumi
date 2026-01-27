import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import EmployeeModal from '../components/EmployeeModal'
import StatusHistoryView from '../components/StatusHistoryView'
import { supabase } from '../services/supabase'
import { formatDateDisplay, mapAppToUser, mapUserToApp } from '../utils/helpers'

function Employees() {
    const [employees, setEmployees] = useState([])
    const [filteredEmployees, setFilteredEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterBranch, setFilterBranch] = useState('')
    const [filterDept, setFilterDept] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterBirthMonth, setFilterBirthMonth] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [isReadOnly, setIsReadOnly] = useState(false)
    const fileInputRef = useRef(null)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)

    // Tab State
    const [activeTab, setActiveTab] = useState('list') // 'list' or 'history'

    useEffect(() => {
        loadEmployees()
    }, [])

    useEffect(() => {
        filterEmployees()
    }, [employees, searchTerm, filterBranch, filterDept, filterStatus, filterBirthMonth])

    const loadEmployees = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('users')
                .select('*')

            if (error) throw error

            const mappedData = (data || []).map(u => mapUserToApp(u))
            setEmployees(mappedData)
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

            // Filter Birth Month
            let matchMonth = true
            if (filterBirthMonth) {
                const dob = item.ngay_sinh || item.dob || ''
                if (!dob) {
                    matchMonth = false
                } else {
                    let month = -1
                    // Handle YYYY-MM-DD
                    if (dob.includes('-')) {
                        const parts = dob.split('-')
                        if (parts.length === 3) {
                            // usually YYYY-MM-DD, month is parts[1]
                            month = parseInt(parts[1], 10)
                        }
                    }
                    // Handle DD/MM/YYYY
                    else if (dob.includes('/')) {
                        const parts = dob.split('/')
                        if (parts.length === 3) {
                            // usually DD/MM/YYYY, month is parts[1]
                            month = parseInt(parts[1], 10)
                        }
                    }

                    matchMonth = month === parseInt(filterBirthMonth, 10)
                }
            }

            return matchSearch && matchBranch && matchDept && matchStatus && matchMonth
        })

        setFilteredEmployees(filtered)
    }

    const handleDelete = async (id, name) => {
        if (!confirm(`Bạn có chắc muốn xóa nhân viên "${name}"?\n\nHành động này không thể hoàn tác!`)) {
            return
        }

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id)

            if (error) throw error

            setEmployees(prev => prev.filter(item => item.id !== id))
            alert(`Đã xóa nhân viên "${name}"`)
        } catch (error) {
            alert(`Lỗi: ${error.message}`)
        }
    }

    const downloadTemplate = () => {
        const headers = [
            'Mã nhân viên',
            'Họ và tên',
            'Email',
            'SĐT',
            'Chi nhánh',
            'Bộ phận',
            'Vị trí',
            'Trạng thái',
            'Ngày sinh',
            'Ngày vào làm',
            'Ngày lên chính thức',
            'Ca làm việc',
            'CCCD',
            'Ngày cấp',
            'Nơi cấp',
            'Địa chỉ thường trú',
            'Quê quán',
            'Giới tính',
            'Tình trạng hôn nhân',
            'Link ảnh'
        ]

        const sampleData = [
            [
                'NV001',
                'Nguyễn Văn A',
                'nguyenvana@example.com',
                '0901234567',
                'HCM',
                'Kinh doanh',
                'Nhân viên',
                'Chính thức',
                '1995-01-01',
                '2024-01-15',
                '2024-03-15',
                'Ca full',
                '001234567890',
                '2020-01-01',
                'CA TP.HCM',
                'TP.HCM',
                '123 Đường ABC, Q.1, TP.HCM',
                'Nam',
                'Độc thân',
                'https://drive.google.com/file/d/YOUR_FILE_ID/view'
            ],
            [
                'NV002',
                'Trần Thị B',
                'tranthib@example.com',
                '0912345678',
                'Hà Nội',
                'Marketing',
                'Trưởng phòng',
                'Chính thức',
                '1990-05-15',
                '2023-06-01',
                '2023-08-01',
                'Ca sáng',
                '001234567891',
                '2019-05-15',
                'CA Hà Nội',
                'Hà Nội',
                '456 Phố XYZ, Hà Nội',
                'Nữ',
                'Đã kết hôn',
                'https://i.imgur.com/example.jpg'
            ]
        ]

        const escapeCell = (val) => {
            return String(val || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
        }

        const headerHtml = headers.map(h => `<th>${escapeCell(h)}</th>`).join('')
        const rowsHtml = sampleData.map(row => {
            const tds = row.map(cell => `<td>${escapeCell(cell)}</td>`).join('')
            return `<tr>${tds}</tr>`
        }).join('')

        const tableHtml = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`

        const htmlContent = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>${tableHtml}</body>
      </html>
    `

        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.href = url
        link.download = 'Mau_import_nhan_su.xls'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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

    // Convert Google Drive link to direct image URL
    const convertDriveLink = (url) => {
        if (!url) return ''
        const urlStr = String(url).trim()

        // Check if it's a Google Drive link
        if (urlStr.includes('drive.google.com')) {
            // Extract file ID from various Drive URL formats
            let fileId = ''

            // Format: https://drive.google.com/file/d/FILE_ID/view
            const match1 = urlStr.match(/\/file\/d\/([^\/]+)/)
            if (match1) {
                fileId = match1[1]
            }

            // Format: https://drive.google.com/open?id=FILE_ID
            const match2 = urlStr.match(/[?\&]id=([^\&]+)/)
            if (match2) {
                fileId = match2[1]
            }

            // Format: https://drive.google.com/uc?id=FILE_ID
            const match3 = urlStr.match(/\/uc\?.*id=([^\&]+)/)
            if (match3) {
                fileId = match3[1]
            }

            if (fileId) {
                // Use thumbnail endpoint - works better with CORS
                const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`
                console.log('🔄 Converted Drive link:', urlStr, '→', directUrl)
                console.log('   ℹ️ Alternative format: https://drive.google.com/uc?export=view&id=' + fileId)
                return directUrl
            } else {
                console.warn('⚠️ Could not extract file ID from Drive link:', urlStr)
            }
        }

        // If it's already a direct image URL (imgur, etc), return as is
        if (urlStr) {
            console.log('✅ Using direct URL:', urlStr)
        }
        return urlStr
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
                setLoading(false)
                return
            }

            // Normalize header: remove accents, spaces, special chars
            const normalizeHeader = (str) => {
                return String(str || '')
                    .toLowerCase()
                    .trim()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove accents
                    .replace(/đ/g, 'd')
                    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
                    .replace(/_+/g, '_') // Replace multiple underscores with single
                    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
            }

            const headers = rows[0].map(h => normalizeHeader(h))
            const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell || '').trim() !== ''))

            console.log('📋 Headers detected:', headers)
            console.log('📊 Total data rows:', dataRows.length)

            let imported = 0
            let skipped = 0

            for (const row of dataRows) {
                const rowObj = {}
                headers.forEach((h, idx) => {
                    rowObj[h] = row[idx] || ''
                })

                const payload = {
                    // id: rowObj['ma_nhan_vien'] || rowObj['ma_nv'] || rowObj['employee_id'] || rowObj['code'] || '', // Supabase typically auto-generates ID, or use it if UUID
                    ho_va_ten: rowObj['ho_va_ten'] || rowObj['ho_ten'] || rowObj['ten'] || rowObj['ho_va_ten'] || rowObj['name'] || '',
                    email: rowObj['email'] || '',
                    sđt: rowObj['sdt'] || rowObj['so_dien_thoai'] || rowObj['dien_thoai'] || rowObj['phone'] || '',
                    chi_nhanh: rowObj['chi_nhanh'] || rowObj['branch'] || '',
                    bo_phan: rowObj['bo_phan'] || rowObj['phong_ban'] || rowObj['department'] || '',
                    vi_tri: rowObj['vi_tri'] || rowObj['chuc_vu'] || rowObj['position'] || '',
                    trang_thai: rowObj['trang_thai'] || rowObj['status'] || '',
                    ngay_sinh: rowObj['ngay_sinh'] || rowObj['dob'] || rowObj['birth_date'] || '',
                    ngay_vao_lam: rowObj['ngay_vao_lam'] || rowObj['ngay_bat_dau'] || '',
                    ngay_lam_chinh_thuc: rowObj['ngay_len_chinh_thuc'] || rowObj['ngay_chinh_thuc'] || rowObj['ngay_lam_chinh_thuc'] || '',
                    ca_lam_viec: rowObj['ca_lam_viec'] || rowObj['ca'] || rowObj['shift'] || '',
                    cccd: rowObj['cccd'] || rowObj['cmnd'] || '',
                    ngay_cap: rowObj['ngay_cap'] || '',
                    noi_cap: rowObj['noi_cap'] || '',
                    dia_chi_thuong_tru: rowObj['dia_chi_thuong_tru'] || rowObj['thuong_tru'] || rowObj['dia_chi'] || rowObj['address'] || '',
                    que_quan: rowObj['que_quan'] || '',
                    gioi_tinh: rowObj['gioi_tinh'] || rowObj['gender'] || '',
                    tinh_trang_hon_nhan: rowObj['tinh_trang_hon_nhan'] || rowObj['hon_nhan'] || '',
                    avatarUrl: convertDriveLink(rowObj['link_anh'] || rowObj['avatar'] || rowObj['anh'] || rowObj['hinh_anh'] || rowObj['image'] || '')
                }


                if (!payload.ho_va_ten) {
                    console.log('⚠️ Skipped row (no name):', rowObj)
                    skipped++
                    continue
                }

                console.log('✅ Importing:', payload.ho_va_ten)

                const dbPayload = mapAppToUser(payload)
                dbPayload.password = dbPayload.password || '123456'

                const { error } = await supabase.from('users').insert([dbPayload])

                if (error) {
                    console.error('❌ Insert error for:', payload.ho_va_ten, error)
                    skipped++ // Count as skipped/failed
                } else {
                    imported++
                }
            }

            await loadEmployees()
            console.log(`📊 Import summary: ${imported} imported, ${skipped} skipped`)
            alert(`Đã import ${imported} dòng.${skipped > 0 ? ` Bỏ qua/Lỗi ${skipped} dòng.` : ''}`)
        } catch (error) {
            console.error('❌ Import error:', error)
            alert('Lỗi import: ' + error.message)
        } finally {
            setLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleSyncFirebase = async () => {
        if (!confirm('Bạn có chắc muốn đồng bộ dữ liệu từ Firebase?\n\n- Nhân viên có sẵn (trùng Email hoặc Mã NV) sẽ được CẬP NHẬT.\n- Nhân viên mới sẽ được THÊM MỚI.\n')) {
            return
        }

        setLoading(true)
        try {
            console.log("🔄 Fetching from Firebase...")
            const response = await fetch('https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/employees.json')
            const data = await response.json()

            if (!data) throw new Error('Không lấy được dữ liệu từ Firebase')

            const users = Object.values(data)
            console.log(`✅ Found ${users.length} users in Firebase. identifying duplicates...`)

            let updated = 0
            let inserted = 0
            let errors = 0

            for (const fbUser of users) {
                try {
                    // Firebase object keys match App State keys, so we can map directly
                    const dbPayload = mapAppToUser(fbUser)

                    if (!dbPayload.name) continue

                    // Identity Check: Email or Employee Code
                    let existingId = null

                    if (dbPayload.email) {
                        const { data: found } = await supabase
                            .from('users')
                            .select('id')
                            .eq('email', dbPayload.email)
                            .maybeSingle()
                        if (found) existingId = found.id
                    }

                    if (!existingId && dbPayload.employee_id) {
                        const { data: found } = await supabase
                            .from('users')
                            .select('id')
                            .eq('employee_id', dbPayload.employee_id)
                            .maybeSingle()
                        if (found) existingId = found.id
                    }

                    if (existingId) {
                        // Update
                        const { error } = await supabase
                            .from('users')
                            .update(dbPayload)
                            .eq('id', existingId)

                        if (error) throw error
                        updated++
                    } else {
                        // Insert
                        dbPayload.password = '123456' // Default password
                        const { error } = await supabase
                            .from('users')
                            .insert([dbPayload])

                        if (error) throw error
                        inserted++
                    }

                } catch (err) {
                    console.error("❌ Sync error for user:", fbUser.ho_va_ten, err)
                    errors++
                }
            }

            await loadEmployees()
            alert(`Đồng bộ hoàn tất!\n\n- Thay đổi/Cập nhật: ${updated}\n- Thêm mới: ${inserted}\n- Lỗi: ${errors}`)

        } catch (err) {
            console.error("Firebase sync error:", err)
            alert('Lỗi đồng bộ: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // Get unique departments
    const departments = [...new Set(employees.map(e => e.bo_phan).filter(Boolean))].sort()

    if (loading) {
        return <div className="loadingState">Đang tải dữ liệu...</div>
    }

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '10px' }}>
                <h1 className="page-title">
                    <i className="fas fa-users"></i>
                    Hồ sơ nhân sự
                </h1>
                {activeTab === 'list' && (
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
                            className="btn btn-warning"
                            onClick={handleSyncFirebase}
                            style={{ marginRight: '10px', color: '#fff', background: '#ff9800', borderColor: '#ff9800' }}
                            title="Đồng bộ từ Firebase (Cập nhật nếu trùng)"
                        >
                            <i className="fas fa-sync-alt"></i>
                            Đồng bộ Firebase
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={async () => {
                                if (confirm('CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu nhân viên và lịch sử trạng thái hiện tại.\n\nBạn có chắc muốn làm sạch hệ thống để nhập liệu thật không?')) {
                                    try {
                                        setLoading(true)
                                        // Delete all users
                                        // Warning: Supabase delete without where clause often requires specific settings or policies
                                        const { error } = await supabase.from('users').delete().neq('id', 0) // Cheap trick if id is numeric, or use a always-true condition

                                        if (error) throw error

                                        // await fbDelete('hr/employee_status_history') // Consider where history lives now
                                        setEmployees([])
                                        alert('Đã xóa sạch dữ liệu hệ thống!')
                                        loadEmployees()
                                    } catch (e) {
                                        alert('Lỗi: ' + e.message)
                                        setLoading(false)
                                    }
                                }
                            }}
                            style={{ marginRight: '10px', background: '#d32f2f', borderColor: '#d32f2f', color: '#fff' }}
                            title="Xóa toàn bộ dữ liệu mẫu"
                        >
                            <i className="fas fa-trash-alt"></i>
                            Làm sạch dữ liệu
                        </button>
                        <button
                            className="btn btn-info"
                            onClick={downloadTemplate}
                            style={{
                                marginRight: '10px',
                                color: '#fff',
                                background: '#17a2b8',
                                borderColor: '#17a2b8'
                            }}
                        >
                            <i className="fas fa-download"></i>
                            Tải file mẫu
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
                            Xuất Excel
                        </button>
                        <button className="btn btn-primary" onClick={loadEmployees}>
                            <i className="fas fa-sync"></i>
                            Làm mới
                        </button>
                    </div>
                )}
            </div>

            <div className="main-tabs" style={{
                borderBottom: '1px solid #ddd',
                marginBottom: '20px',
                display: 'flex',
                gap: '5px'
            }}>
                <button
                    onClick={() => setActiveTab('list')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        background: activeTab === 'list' ? '#fff' : '#f8f9fa',
                        borderBottom: activeTab === 'list' ? '2px solid var(--primary)' : '2px solid transparent',
                        fontWeight: activeTab === 'list' ? '600' : '500',
                        color: activeTab === 'list' ? 'var(--primary)' : '#666',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
                    Danh sách nhân viên
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        background: activeTab === 'history' ? '#fff' : '#f8f9fa',
                        borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                        fontWeight: activeTab === 'history' ? '600' : '500',
                        color: activeTab === 'history' ? 'var(--primary)' : '#666',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    <i className="fas fa-history" style={{ marginRight: '8px' }}></i>
                    Biến động trạng thái
                </button>
            </div>

            {activeTab === 'list' ? (
                <>
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
                        <select value={filterBirthMonth} onChange={(e) => setFilterBirthMonth(e.target.value)}>
                            <option value="">Tất cả tháng sinh</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month}>Tháng {month}</option>
                            ))}
                        </select>
                    </div>

                    <div className="card" style={{ overflowX: 'scroll', overflowY: 'auto', maxHeight: 'calc(100vh - 350px)', position: 'relative', border: '1px solid #e0e0e0', boxShadow: 'none' }}>
                        <table style={{ minWidth: '101%' }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: '80px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>STT</th>
                                    <th style={{ minWidth: '100px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>Ảnh</th>
                                    <th style={{ minWidth: '300px', position: 'sticky', left: 0, top: 0, background: '#f8f9fa', zIndex: 12, whiteSpace: 'nowrap', padding: '4px 8px', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>Họ và tên</th>
                                    <th style={{ minWidth: '300px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>Email</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>SĐT</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>Ngày sinh</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>Ngày vào làm</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>Ngày chính thức</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>CCCD</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>Ngày cấp</th>
                                    <th style={{ minWidth: '250px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>Nơi cấp</th>
                                    <th style={{ minWidth: '250px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>Quê quán</th>
                                    <th style={{ minWidth: '150px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>Giới tính</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10, display: 'none' }}>TT Hôn nhân</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>Chi nhánh</th>
                                    <th style={{ minWidth: '250px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>Bộ phận</th>
                                    <th style={{ minWidth: '250px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>Vị trí</th>
                                    <th style={{ minWidth: '200px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>Ca làm việc</th>
                                    <th style={{ width: '150px', whiteSpace: 'nowrap', padding: '4px 8px', position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map((emp, idx) => {
                                        const name = emp.ho_va_ten || emp.name || emp.Tên || 'N/A'
                                        const avatar = emp.avatarDataUrl || emp.avatarUrl || emp.avatar || ''
                                        return (
                                            <tr key={emp.id || idx}>
                                                <td style={{ textAlign: 'center', padding: '4px 8px' }}>{idx + 1}</td>
                                                <td style={{ textAlign: 'center', padding: '4px 8px' }}>
                                                    {avatar ? (
                                                        <img
                                                            src={avatar}
                                                            alt={name}
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '50%',
                                                                objectFit: 'cover'
                                                            }}
                                                            onError={(e) => e.target.style.display = 'none'}
                                                        />
                                                    ) : (
                                                        <span style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: 'var(--primary)',
                                                            display: 'inline-block'
                                                        }}></span>
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: '500', position: 'sticky', left: 0, background: 'white', zIndex: 1, padding: '4px 8px', boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>{name}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{emp.email || '-'}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{emp.sđt || emp.sdt || '-'}</td>
                                                <td style={{ padding: '4px 8px' }}>{formatDateDisplay(emp.ngay_sinh || emp.dob)}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{formatDateDisplay(emp.ngay_vao_lam)}</td>
                                                <td style={{ padding: '4px 8px' }}>{formatDateDisplay(emp.ngay_lam_chinh_thuc)}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{emp.cccd || '-'}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{formatDateDisplay(emp.ngay_cap)}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{emp.noi_cap || '-'}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{emp.que_quan || '-'}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{emp.gioi_tinh || '-'}</td>
                                                <td style={{ padding: '4px 8px', display: 'none' }}>{emp.tinh_trang_hon_nhan || '-'}</td>
                                                <td style={{ padding: '4px 8px' }}>{emp.chi_nhanh || '-'}</td>
                                                <td style={{ padding: '4px 8px' }}>{emp.bo_phan || '-'}</td>
                                                <td style={{ padding: '4px 8px' }}>{emp.vi_tri || '-'}</td>
                                                <td style={{ padding: '4px 8px' }}>{emp.ca_lam_viec || '-'}</td>
                                                <td style={{ padding: '4px 8px' }}>
                                                    <div className="actions" style={{ justifyContent: 'center' }}>
                                                        <button
                                                            className="view"
                                                            title="Xem"
                                                            onClick={() => {
                                                                setSelectedEmployee(emp)
                                                                setIsReadOnly(true)
                                                                setIsModalOpen(true)
                                                            }}
                                                        >
                                                            <i className="fas fa-eye"></i>
                                                        </button>
                                                        <button
                                                            className="btn-icon"
                                                            title="Chấm điểm KPI"
                                                            style={{ color: '#ff9800', border: '1px solid #ff9800', background: '#fff' }}
                                                            onClick={() => window.open(`/grading/${emp.id}`, '_blank')} // Open in new tab or navigate
                                                        >
                                                            <i className="fas fa-star-half-alt"></i>
                                                        </button>
                                                        <button
                                                            className="edit"
                                                            title="Sửa"
                                                            onClick={() => {
                                                                setSelectedEmployee(emp)
                                                                setIsReadOnly(false)
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
                                        <td colSpan="19" className="empty-state">
                                            {employees.length === 0 ? 'Chưa có dữ liệu nhân sự' : 'Không tìm thấy kết quả'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <StatusHistoryView employees={employees} onDataChange={() => { }} />
            )}

            <EmployeeModal
                employee={selectedEmployee}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedEmployee(null)
                    setIsReadOnly(false)
                }}
                onSave={loadEmployees}
                readOnly={isReadOnly}
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
                                    <li>Ngày chính thức</li>
                                    <li>CCCD</li>
                                    <li>Ngày cấp</li>
                                    <li>Nơi cấp</li>
                                    <li>Quê quán</li>
                                    <li>Giới tính</li>
                                    <li>Tình trạng hôn nhân</li>
                                    <li>Link ảnh (tùy chọn)</li>
                                </ul>
                                <small>Hàng đầu tiên nên là header với tên cột như trên. Cột "Link ảnh" có thể để trống nếu không có.</small>
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
