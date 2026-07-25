import { useMemo, useRef } from 'react'
import EmployeeModal from './EmployeeModal'
import StatusHistoryView from './StatusHistoryView'
import { formatDateDisplay } from '../utils/helpers'

const getName = (employee) => employee.ho_va_ten || employee.name || employee.Tên || 'Chưa cập nhật'
const getStatus = (employee) => employee.trang_thai || employee.status || 'Chưa cập nhật'

function EmployeeDirectory({
    employees, filteredEmployees, activeTab, setActiveTab, searchTerm, setSearchTerm,
    filterDept, setFilterDept, filterStatus, setFilterStatus, filterContract, setFilterContract,
    selectedEmployee, setSelectedEmployee, isModalOpen, setIsModalOpen, isReadOnly, setIsReadOnly,
    onReload, onExport, onImport
}) {
    const importInputRef = useRef(null)
    const activeEmployees = useMemo(
        () => employees.filter(employee => getStatus(employee) !== 'Nghỉ việc'),
        [employees]
    )

    const daysUntil = (value) => {
        if (!value) return null
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? null : Math.ceil((date.getTime() - Date.now()) / 86400000)
    }

    const expiring = activeEmployees.filter(employee => {
        const days = daysUntil(employee.ngay_het_han || employee.contractEndDate || employee.ngay_het_han_hop_dong)
        return days !== null && days >= 0 && days <= 60
    })
    const month = new Date().getMonth()
    const departments = [...new Set(activeEmployees.map(employee => employee.bo_phan).filter(Boolean))].sort()
    const contracts = [...new Set(activeEmployees.map(employee => employee.loai_hop_dong || employee.contractType).filter(Boolean))].sort()
    const stats = [
        ['Tổng nhân sự', activeEmployees.length, 'fa-users', 'blue'],
        ['Nhân sự thử việc', activeEmployees.filter(e => getStatus(e) === 'Thử việc').length, 'fa-user-clock', 'orange'],
        ['Nhân sự chính thức', activeEmployees.filter(e => getStatus(e) === 'Chính thức').length, 'fa-user-check', 'green'],
        ['Hợp đồng sắp hết hạn', expiring.length, 'fa-file-circle-exclamation', 'red'],
        ['Hồ sơ thiếu giấy tờ', activeEmployees.filter(e => !e.cccd || !e.so_bhxh || !e.ngay_sinh).length, 'fa-folder-open', 'purple'],
        ['Đi muộn nhiều', activeEmployees.filter(e => Number(e.so_lan_di_muon || 0) > 3).length, 'fa-clock', 'red'],
        ['Nghỉ phép nhiều', activeEmployees.filter(e => Number(e.phep_da_su_dung || 0) > 8).length, 'fa-calendar-minus', 'orange'],
        ['Sinh nhật tháng này', activeEmployees.filter(e => { const d = new Date(e.ngay_sinh); return !Number.isNaN(d.getTime()) && d.getMonth() === month }).length, 'fa-cake-candles', 'pink'],
        ['Sắp đến thâm niên', activeEmployees.filter(e => { const d = new Date(e.ngay_vao_lam); return !Number.isNaN(d.getTime()) && d.getMonth() === month }).length, 'fa-award', 'teal']
    ]

    const openEmployee = (employee, readOnly = true) => {
        setSelectedEmployee(employee)
        setIsReadOnly(readOnly)
        setIsModalOpen(true)
    }

    return (
        <div className="employees-page">
            <header className="employees-hero">
                <div>
                    <h1><i className="fas fa-users"></i> Quản lý nhân sự</h1>
                    <p>Quản lý tập trung hồ sơ, hợp đồng và tình trạng nhân viên</p>
                </div>
                <div className="employees-hero__actions">
                    <button className="btn" onClick={onExport}><i className="fas fa-file-excel"></i> Xuất Excel</button>
                    <button className="btn" onClick={() => importInputRef.current?.click()}><i className="fas fa-file-import"></i> Nhập Excel</button>
                    <input ref={importInputRef} className="employees-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={onImport} />
                    <button className="btn btn-primary" onClick={() => openEmployee(null, false)}><i className="fas fa-plus"></i> Thêm nhân viên</button>
                </div>
            </header>

            <section className="hr-overview">
                {stats.map(([label, value, icon, tone]) => (
                    <button key={label} className={`hr-stat hr-stat--${tone}`} onClick={() => label === 'Hợp đồng sắp hết hạn' && setActiveTab('expiring')}>
                        <span className="hr-stat__icon"><i className={`fas ${icon}`}></i></span>
                        <span><strong>{value}</strong><small>{label}</small></span>
                    </button>
                ))}
            </section>

            <nav className="employees-tabs">
                <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}><i className="fas fa-list"></i> Danh sách nhân viên</button>
                <button className={activeTab === 'expiring' ? 'active danger' : ''} onClick={() => setActiveTab('expiring')}><i className="fas fa-triangle-exclamation"></i> Hợp đồng sắp hết hạn <span>{expiring.length}</span></button>
                <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}><i className="fas fa-clock-rotate-left"></i> Lịch sử biến động</button>
            </nav>

            {activeTab === 'history' ? <StatusHistoryView employees={employees} onDataChange={onReload} /> : <>
                <section className="employees-filter-card">
                    <label className="employees-search"><i className="fas fa-search"></i><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm theo mã, họ tên, email, số điện thoại..." /></label>
                    <select value={filterDept} onChange={e => setFilterDept(e.target.value)}><option value="">Tất cả phòng ban</option>{departments.map(value => <option key={value}>{value}</option>)}</select>
                    <select value={filterContract} onChange={e => setFilterContract(e.target.value)}><option value="">Tất cả hợp đồng</option>{contracts.map(value => <option key={value}>{value}</option>)}</select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="Thử việc">Thử việc</option>
                        <option value="Chính thức">Chính thức</option>
                        <option value="Tạm nghỉ">Tạm nghỉ</option>
                        <option value="Nghỉ việc">Đã nghỉ</option>
                    </select>
                    <button className="btn btn-icon" title="Làm mới" onClick={onReload}><i className="fas fa-rotate"></i></button>
                </section>

                <section className="employees-table-card">
                    <div className="employees-table-card__caption"><span>Hiển thị <strong>{filteredEmployees.length}</strong> nhân viên</span><small>Nhấn vào một nhân viên để xem toàn bộ hồ sơ</small></div>
                    <div className="employees-table-wrap">
                        <table className="employees-table">
                            <thead><tr><th>Mã nhân viên</th><th>Nhân viên</th><th>Phòng ban</th><th>Chức danh</th><th>Ngày vào làm</th><th>Loại hợp đồng</th><th>Trạng thái</th><th></th></tr></thead>
                            <tbody>{filteredEmployees.map((employee, index) => {
                                const name = getName(employee)
                                const status = getStatus(employee)
                                const avatar = employee.avatarDataUrl || employee.avatarUrl || employee.avatar
                                const days = daysUntil(employee.ngay_het_han || employee.contractEndDate || employee.ngay_het_han_hop_dong)
                                return <tr key={employee.id || index} onClick={() => openEmployee(employee)}>
                                    <td><strong className="employee-code">{employee.employeeId || `NV${String(index + 1).padStart(4, '0')}`}</strong></td>
                                    <td><div className="employee-identity"><span className="employee-avatar">{avatar ? <img src={avatar} alt="" /> : name.charAt(0)}</span><span><strong>{name}</strong><small>{employee.email || employee.sdt || employee.sđt || 'Chưa có thông tin liên hệ'}</small></span></div></td>
                                    <td>{employee.bo_phan || 'Chưa phân bổ'}</td><td>{employee.vi_tri || 'Chưa cập nhật'}</td>
                                    <td>{formatDateDisplay(employee.ngay_vao_lam) || '—'}</td>
                                    <td><span className="contract-cell">{employee.loai_hop_dong || employee.contractType || 'Chưa cập nhật'}{days !== null && days >= 0 && days <= 60 && <small>Còn {days} ngày</small>}</span></td>
                                    <td><span className={`employee-status ${status === 'Chính thức' ? 'success' : status === 'Thử việc' ? 'warning' : status === 'Nghỉ việc' ? 'danger' : ''}`}><i></i>{status === 'Nghỉ việc' ? 'Đã nghỉ' : status}</span></td>
                                    <td><button className="employee-row-menu" onClick={event => { event.stopPropagation(); openEmployee(employee, false) }}><i className="fas fa-ellipsis"></i></button></td>
                                </tr>
                            })}</tbody>
                        </table>
                        {!filteredEmployees.length && <div className="employee-card-empty">Không tìm thấy nhân viên phù hợp</div>}
                    </div>
                </section>
            </>}

            <EmployeeModal employee={selectedEmployee} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedEmployee(null); setIsReadOnly(false) }} onSave={onReload} readOnly={isReadOnly} departmentOptions={departments} positionOptions={[...new Set(activeEmployees.map(e => e.vi_tri).filter(Boolean))]} />
        </div>
    )
}

export default EmployeeDirectory
