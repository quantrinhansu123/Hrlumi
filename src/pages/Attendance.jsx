import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import AttendanceImportModal from '../components/AttendanceImportModal'
import AttendanceModal from '../components/AttendanceModal'
import DependentModal from '../components/DependentModal'
import InsuranceModal from '../components/InsuranceModal'
import PayrollDetailModal from '../components/PayrollDetailModal'
import PayslipModal from '../components/PayslipModal'
import SeedAttendanceDataButton from '../components/SeedAttendanceDataButton'
import SeedPayrollDataButton from '../components/SeedPayrollDataButton'
import TaxModal from '../components/TaxModal'
import { fbDelete, fbGet } from '../services/firebase'
import { TAX_CONFIG } from '../utils/constants'
import { calculateProgressiveTax, escapeHtml, formatMoney, normalizeString } from '../utils/helpers'

function Attendance() {
  const [activeTab, setActiveTab] = useState('attendance')
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [payrolls, setPayrolls] = useState([])
  const [insuranceInfo, setInsuranceInfo] = useState([])
  const [taxInfo, setTaxInfo] = useState([])
  const [dependents, setDependents] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isPayrollDetailModalOpen, setIsPayrollDetailModalOpen] = useState(false)
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false)
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false)
  const [isDependentModalOpen, setIsDependentModalOpen] = useState(false)
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false)

  // Selected items
  const [selectedPayroll, setSelectedPayroll] = useState(null)
  const [selectedInsurance, setSelectedInsurance] = useState(null)
  const [selectedTax, setSelectedTax] = useState(null)
  const [selectedDependent, setSelectedDependent] = useState(null)
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [selectedAttendance, setSelectedAttendance] = useState(null)

  // Read-only states
  const [isAttendanceReadOnly, setIsAttendanceReadOnly] = useState(false)
  const [isPayrollReadOnly, setIsPayrollReadOnly] = useState(false)
  const [isInsuranceReadOnly, setIsInsuranceReadOnly] = useState(false)
  const [isDependentReadOnly, setIsDependentReadOnly] = useState(false)
  const [isTaxReadOnly, setIsTaxReadOnly] = useState(false)

  // Filters
  const [filterPayrollPeriod, setFilterPayrollPeriod] = useState('')
  const [filterPayrollDept, setFilterPayrollDept] = useState('')
  const [filterPayrollStatus, setFilterPayrollStatus] = useState('')
  const [filterAttendanceMonth, setFilterAttendanceMonth] = useState('')
  const [filterAttendanceEmployee, setFilterAttendanceEmployee] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load employees
      const empData = await fbGet('employees')
      let empList = []
      if (empData) {
        if (Array.isArray(empData)) {
          empList = empData.filter(item => item !== null && item !== undefined)
        } else if (typeof empData === "object") {
          empList = Object.entries(empData)
            .filter(([k, v]) => v !== null && v !== undefined)
            .map(([k, v]) => ({ ...v, id: k }))
        }
      }
      setEmployees(empList)

      // Load attendance and payroll data
      const hrData = await fbGet('hr')
      const logs = hrData?.attendanceLogs ? Object.entries(hrData.attendanceLogs).map(([k, v]) => ({ ...v, id: k })) : []
      setAttendanceLogs(logs)

      const payrollList = hrData?.payrolls ? Object.entries(hrData.payrolls).map(([k, v]) => ({ ...v, id: k })) : []
      setPayrolls(payrollList)

      const insuranceList = hrData?.insuranceInfo ? Object.entries(hrData.insuranceInfo).map(([k, v]) => ({ ...v, id: k })) : []
      setInsuranceInfo(insuranceList)

      const taxList = hrData?.taxInfo ? Object.entries(hrData.taxInfo).map(([k, v]) => ({ ...v, id: k })) : []
      setTaxInfo(taxList)

      const dependentsList = hrData?.dependents ? Object.entries(hrData.dependents).map(([k, v]) => ({ ...v, id: k })) : []
      setDependents(dependentsList)

      setLoading(false)
    } catch (error) {
      console.error('Error loading attendance data:', error)
      setLoading(false)
    }
  }

  const handleDeleteAttendance = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa bản ghi chấm công này?')) return
    try {
      await fbDelete(`hr/attendanceLogs/${id}`)
      loadData()
      alert('Đã xóa bản ghi chấm công')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  const handleDeleteAllAttendance = async () => {
    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu chấm công không? Hành động này không thể hoàn tác!')) return
    try {
      setLoading(true)
      await fbDelete('hr/attendanceLogs')
      loadData()
      alert('Đã xóa toàn bộ dữ liệu chấm công thành công!')
    } catch (error) {
      alert('Lỗi khi xóa dữ liệu: ' + error.message)
      setLoading(false)
    }
  }

  const handleDeleteInsurance = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa thông tin BHXH này?')) return
    try {
      await fbDelete(`hr/insuranceInfo/${id}`)
      loadData()
      alert('Đã xóa thông tin BHXH')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  const handleDeleteTax = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa thông tin thuế này?')) return
    try {
      await fbDelete(`hr/taxInfo/${id}`)
      loadData()
      alert('Đã xóa thông tin thuế')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  const handleDeleteDependent = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa người phụ thuộc này?')) return
    try {
      await fbDelete(`hr/dependents/${id}`)
      loadData()
      alert('Đã xóa người phụ thuộc')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  // Get employee name
  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId)
    return emp ? (emp.ho_va_ten || emp.name || 'N/A') : employeeId || 'N/A'
  }

  const handleDeletePayroll = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa bảng lương này?')) return
    try {
      await fbDelete(`hr/payrolls/${id}`)
      loadData()
      alert('Đã xóa bảng lương')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  // Filter payrolls
  const filteredPayrolls = payrolls.filter(payroll => {
    if (filterPayrollPeriod && payroll.period !== filterPayrollPeriod) return false
    if (filterPayrollDept && payroll.department !== filterPayrollDept) return false
    if (filterPayrollStatus && payroll.status !== filterPayrollStatus) return false
    return true
  })

  // Calculate total deductions
  const calculateTotalDeductions = (payroll) => {
    return (payroll.bhxh || 0) + (payroll.thueTNCN || 0) + (payroll.tamUng || 0) + (payroll.khac || 0)
  }

  // Calculate net salary
  const calculateNetSalary = (payroll) => {
    const totalIncome = (payroll.luong3P || 0) + (payroll.luongNgayCong || 0) + (payroll.thuongNong || 0)
    const totalDeductions = calculateTotalDeductions(payroll)
    return totalIncome - totalDeductions
  }

  // --- START EXCEL FUNCTIONS ---

  // 1. PAYROLL EXCEL
  const exportPayrollToExcel = () => {
    if (filteredPayrolls.length === 0) {
      alert('Không có dữ liệu bảng lương để xuất!')
      return
    }
    const data = filteredPayrolls.map((p, idx) => {
      const emp = employees.find(e => e.id === p.employeeId)
      const totalIncome = (p.luong3P || 0) + (p.luongNgayCong || 0) + (p.thuongNong || 0)
      const totalDeductions = calculateTotalDeductions(p)
      const netSalary = calculateNetSalary(p)

      return {
        'STT': idx + 1,
        'Mã NV': p.employeeId,
        'Họ tên': emp ? (emp.ho_va_ten || emp.name) : '',
        'Bộ phận': p.department,
        'Kỳ lương': p.period || '',
        'Công thực tế': p.congThucTe || 0,
        'Lương P1': p.luongP1 || 0,
        'Kết quả P3': p.ketQuaP3 || '',
        'Lương 3P': p.luong3P || 0,
        'Lương ngày công': p.luongNgayCong || 0,
        'Thưởng nóng': p.thuongNong || 0,
        'Tổng thu nhập': totalIncome,
        'BHXH': p.bhxh || 0,
        'Thuế TNCN': p.thueTNCN || 0,
        'Tạm ứng': p.tamUng || 0,
        'Khấu trừ khác': p.khac || 0,
        'Thực lĩnh': netSalary,
        'Trạng thái': p.status || ''
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BangLuong')
    XLSX.writeFile(wb, `Bang_Luong_${filterPayrollPeriod || 'Tong_hop'}.xlsx`)
  }

  // Import for Payroll is tricky as it's usually calculated.
  // But we can allow importing "Thưởng nóng" or "Manual Adjustments".
  // For now, let's keep it simple: No Import for Payroll requested explicitly, 
  // but usually users want to Export Reports.
  // If user wants import, we can add later. "Tiếp sang phần chấm công nhớ logic hợp lý nhé" implies Attendance is focus.
  // But let's add Export for Insurance/Tax/Dependents as they are data tables.


  // 2. INSURANCE EXCEL
  const exportInsuranceToExcel = () => {
    if (insuranceInfo.length === 0) {
      alert('Không có dữ liệu BHXH để xuất!')
      return
    }
    const data = insuranceInfo.map((i, idx) => {
      const emp = employees.find(e => e.id === i.employeeId)
      return {
        'STT': idx + 1,
        'Mã NV': i.employeeId,
        'Họ tên': emp ? (emp.ho_va_ten || emp.name) : '',
        'Số sổ BHXH': i.soSoBHXH || '',
        'Ngày tham gia': i.ngayThamGia || '',
        'Mức lương đóng': i.mucLuongDong || 0,
        'Tỷ lệ NLĐ (%)': i.tyLeNLD || 10.5,
        'Tỷ lệ DN (%)': i.tyLeDN || 21.5,
        'Trạng thái': i.status || ''
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BHXH')
    XLSX.writeFile(wb, 'Danh_sach_BHXH.xlsx')
  }

  const downloadInsuranceTemplate = () => {
    const headers = ['Mã NV', 'Số sổ BHXH', 'Ngày tham gia (YYYY-MM-DD)', 'Mức lương đóng', 'Tỷ lệ NLĐ (%)', 'Trạng thái']
    const sample = ['NV001', '123456789', '2024-01-01', 5000000, 10.5, 'Đang tham gia']
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MauBHXH')
    XLSX.writeFile(wb, 'Mau_import_BHXH.xlsx')
  }

  // Reuse AttendanceImport logic? No, specific fields.
  // We need a generic handle import function or specific ones. 
  // Let's make a generic helper or separate functions. Separate is safer for validation.
  const handleInsuranceImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws)

      let count = 0
      for (const row of json) {
        const empCode = row['Mã NV']
        if (!empCode) continue

        // Find existing or new? Assuming update/create based on EmpID
        const payload = {
          employeeId: empCode,
          soSoBHXH: row['Số sổ BHXH'],
          ngayThamGia: row['Ngày tham gia (YYYY-MM-DD)'],
          mucLuongDong: row['Mức lương đóng'],
          tyLeNLD: row['Tỷ lệ NLĐ (%)'],
          tyLeDN: 21.5, // Default
          status: row['Trạng thái'] || 'Đang tham gia'
        }
        await fbPush('hr/insuranceInfo', payload)
        count++
      }
      alert(`Đã import ${count} bản ghi BHXH`)
      loadData()
    } catch (err) {
      alert('Lỗi import: ' + err.message)
    }
  }


  // 3. TAX EXCEL
  const exportTaxToExcel = () => {
    if (taxInfo.length === 0) {
      alert('Không có dữ liệu thuế để xuất!')
      return
    }
    const data = taxInfo.map((t, idx) => {
      const emp = employees.find(e => e.id === t.employeeId)
      return {
        'STT': idx + 1,
        'Mã NV': t.employeeId,
        'Họ tên': emp ? (emp.ho_va_ten || emp.name) : '',
        'Mã số thuế': t.maSoThue || '',
        'Số người phụ thuộc': t.soNguoiPhuThuoc || 0,
        'Giảm trừ gia cảnh (VNĐ)': 11000000,
        'Giảm trừ phụ thuộc (VNĐ)': (t.soNguoiPhuThuoc || 0) * 4400000
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ThueTNCN')
    XLSX.writeFile(wb, 'Danh_sach_Thue_TNCN.xlsx')
  }

  const downloadTaxTemplate = () => {
    const headers = ['Mã NV', 'Mã số thuế', 'Số người phụ thuộc']
    const sample = ['NV001', '8000123456', 0]
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MauThue')
    XLSX.writeFile(wb, 'Mau_import_Thue_TNCN.xlsx')
  }

  const handleTaxImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws)

      let count = 0
      for (const row of json) {
        const empCode = row['Mã NV']
        if (!empCode) continue

        const payload = {
          employeeId: empCode,
          maSoThue: row['Mã số thuế'],
          soNguoiPhuThuoc: row['Số người phụ thuộc'] || 0
        }
        await fbPush('hr/taxInfo', payload)
        count++
      }
      alert(`Đã import ${count} bản ghi Thuế`)
      loadData()
    } catch (err) {
      alert('Lỗi import: ' + err.message)
    }
  }

  // 4. DEPENDENTS EXCEL
  const exportDependentsToExcel = () => {
    if (dependents.length === 0) {
      alert('Không có dữ liệu người phụ thuộc để xuất!')
      return
    }
    const data = dependents.map((d, idx) => {
      const emp = employees.find(e => e.id === d.employeeId)
      return {
        'STT': idx + 1,
        'Mã NV': d.employeeId,
        'Họ tên NV': emp ? (emp.ho_va_ten || emp.name) : '',
        'Tên người phụ thuộc': d.dependentName || '',
        'Mối quan hệ': d.relationship || '',
        'Ngày sinh': d.birthDate || '',
        'Mã số thuế NPT': d.taxCode || '',
        'Trạng thái': d.status || ''
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'NguoiPhuThuoc')
    XLSX.writeFile(wb, 'Danh_sach_Nguoi_Phu_Thuoc.xlsx')
  }

  const downloadDependentsTemplate = () => {
    const headers = ['Mã NV', 'Tên người phụ thuộc', 'Mối quan hệ', 'Ngày sinh (YYYY-MM-DD)', 'Mã số thuế NPT']
    const sample = ['NV001', 'Nguyễn Văn B', 'Con', '2015-05-20', '']
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MauNguoiPhuThuoc')
    XLSX.writeFile(wb, 'Mau_import_NPT.xlsx')
  }

  const handleDependentsImportFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws)

      let count = 0
      for (const row of json) {
        const empCode = row['Mã NV']
        if (!empCode) continue

        const payload = {
          employeeId: empCode,
          dependentName: row['Tên người phụ thuộc'],
          relationship: row['Mối quan hệ'],
          birthDate: row['Ngày sinh (YYYY-MM-DD)'],
          taxCode: row['Mã số thuế NPT'],
          status: 'Đã xác nhận'
        }
        await fbPush('hr/dependents', payload)
        count++
      }
      alert(`Đã import ${count} người phụ thuộc`)
      loadData()
    } catch (err) {
      alert('Lỗi import: ' + err.message)
    }
  }

  // Export Attendance Data to Excel
  const handleExportAttendance = () => {
    // Determine data to export (filtered or all)
    let dataToExport = attendanceLogs
    if (filterAttendanceMonth) {
      dataToExport = attendanceLogs.filter(log => {
        const date = new Date(log.date || log.timestamp)
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return monthStr === filterAttendanceMonth
      })
    }

    if (dataToExport.length === 0 && attendanceLogs.length === 0) {
      // If absolutely no data, export just empty template with headers
      const headers = [
        'Mã NV',
        'Họ và tên',
        'Ngày (YYYY-MM-DD)',
        'Check-in (HH:MM)',
        'Check-out (HH:MM)',
        'Số giờ làm',
        'Trạng thái'
      ]
      const ws = XLSX.utils.aoa_to_sheet([headers])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Chấm công')
      XLSX.writeFile(wb, 'Mau_Cham_Cong.xlsx')
      return
    }

    // Map data to export format
    const exportData = dataToExport.map((log, idx) => {
      const employee = employees.find(e => e.id === log.employeeId)

      const checkIn = log.checkIn ? new Date(log.checkIn).toLocaleTimeString('vi-VN') : ''
      const checkOut = log.checkOut ? new Date(log.checkOut).toLocaleTimeString('vi-VN') : ''

      let hours = 0
      if (log.hours !== undefined && log.hours !== null) {
        hours = typeof log.hours === 'string' ? parseFloat(log.hours) : Number(log.hours)
      } else if (log.soGio !== undefined && log.soGio !== null) {
        hours = typeof log.soGio === 'string' ? parseFloat(log.soGio) : Number(log.soGio)
      }

      return {
        'STT': idx + 1,
        'Mã NV': log.employeeId || '',
        'Họ và tên': employee ? (employee.ho_va_ten || employee.name || '') : '',
        'Ngày': log.date ? new Date(log.date).toLocaleDateString('vi-VN') : '',
        'Check-in': checkIn,
        'Check-out': checkOut,
        'Số giờ làm': typeof hours === 'number' && !isNaN(hours) ? hours.toFixed(1) : 0,
        'Trạng thái': log.status || ''
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dữ liệu Chấm công')
    const fileName = filterAttendanceMonth
      ? `Cham_cong_${filterAttendanceMonth}.xlsx`
      : `Du_lieu_Cham_cong_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // --- NEW FEATURES: Calculate Workdays & Batch Export Payslips ---

  const handleCalculateWorkdays = async () => {
    // 1. Ask for Month
    const period = prompt('Nhập kỳ lương (YYYY-MM):', new Date().toISOString().slice(0, 7))
    if (!period) return

    if (!confirm(`Bạn có chắc muốn TÍNH CÔNG cho tháng ${period}? \nDữ liệu sẽ được cập nhật vào bảng lương.`)) return

    setLoading(true)
    try {
      // 2. Get all attendance logs for this month
      const logsInMonth = attendanceLogs.filter(log => {
        const d = new Date(log.date || log.timestamp)
        return log.date && log.date.startsWith(period)
      })

      // 3. Group by Employee
      const empWorkdays = {} // { empId: count }

      logsInMonth.forEach(log => {
        let hours = 0
        if (log.hours !== undefined && log.hours !== null) {
          hours = typeof log.hours === 'string' ? parseFloat(log.hours) : Number(log.hours)
        } else if (log.soGio !== undefined && log.soGio !== null) {
          hours = typeof log.soGio === 'string' ? parseFloat(log.soGio) : Number(log.soGio)
        }

        // Logic: >= 8h => 1 công. < 8h => 0 công (hoặc 0.5?)
        // Request says: "đủ từ 8h trở lên => tính là 1 công. dưới 8h không tính"
        if (hours >= 8) {
          empWorkdays[log.employeeId] = (empWorkdays[log.employeeId] || 0) + 1
        }
      })

      // 4. Update or Create Payrolls
      let updateCount = 0

      // Iterate all employees to ensure everyone gets a record for the period? 
      // Or only those with attendance? Usually all active employees.
      for (const emp of employees) {
        const empId = emp.id
        const workdays = empWorkdays[empId] || 0

        // Find existing payroll
        const existingPayroll = payrolls.find(p => p.employeeId === empId && p.period === period)

        const payload = {
          period: period,
          congThucTe: workdays,
          // Recalculate salary based on new workdays?
          // If we update workdays, we should probably update "luongNgayCong" too if "luong3P" exists.
          // Formula: luongNgayCong = (luong3P / 26) * workdays
          // But we don't have all data here easily unless we read deep.
          // For now, let's just update `congThucTe` and `luongNgayCong`.
          // We need to fetch `luong3P` from somewhere. 
          // If existing, use existing `luong3P`. If new, default?

          updatedAt: new Date().toISOString()
        }

        if (existingPayroll) {
          // Update
          const l3p = existingPayroll.luong3P || 0
          payload.luongNgayCong = (l3p / 26) * workdays

          await fbUpdate(`hr/payrolls/${existingPayroll.id}`, payload)
        } else {
          // Create new (basic)
          // We might need to fetch Salary Grade... 
          // For simplicity, we create a basic record, user can edit details later.
          // Or we skip creating if we don't know Salary.
          // However, "Tính công" implies updating the "Công" field.
          if (workdays > 0) {
            const baseSalary = 10000000 // Placeholder or 0? 
            // Better: Init with 0 and let user fill salary info via "Seed" or Manual.
            // But if we have workdays, we should probably save it.
            payload.employeeId = empId
            payload.department = emp.bo_phan || emp.department || ''
            payload.luongP1 = 0
            payload.luong3P = 0
            payload.luongNgayCong = 0
            payload.status = 'Đang tính'
            await fbPush('hr/payrolls', payload)
          }
        }
        updateCount++
      }

      await loadData() // Reload
      alert(`Đã cập nhật công thực tế cho ${updateCount} nhân viên trong tháng ${period}.`)

    } catch (err) {
      alert('Lỗi tính công: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBatchExportPayslips = () => {
    if (filteredPayrolls.length === 0) {
      alert('Không có bảng lương nào để xuất!')
      return
    }

    // Create Workbook
    const wb = XLSX.utils.book_new()

    filteredPayrolls.forEach(payroll => {
      const emp = employees.find(e => e.id === payroll.employeeId)
      const empName = emp ? (emp.ho_va_ten || emp.name) : payroll.employeeId
      const safeName = normalizeString(empName).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)

      const totalIncome = (payroll.luong3P || 0) + (payroll.luongNgayCong || 0) + (payroll.thuongNong || 0)
      const totalDeductions = calculateTotalDeductions(payroll)
      const netSalary = calculateNetSalary(payroll)

      // Template Data
      // Template Data based on User's Image
      const sheetData = [
        ['PHIẾU LƯƠNG NHÂN VIÊN'],
        [''],
        ['1. Thông tin chung'],
        ['Trường thông tin', 'Giá trị'],
        ['Họ tên', empName],
        ['Mã nhân sự', payroll.employeeId],
        ['Bộ phận', payroll.department || ''],
        ['Vị trí', emp ? emp.vi_tri : ''],
        ['Kỳ lương', payroll.period],
        [''],
        ['2. Thu nhập'],
        ['Khoản mục', 'Số tiền (VNĐ)'],
        ['Lương bậc P1', payroll.luongP1 || 0],
        ['Kết quả P3 (KPI)', payroll.ketQuaP3 || ''],
        ['Lương 3P', payroll.luong3P || 0],
        ['Thưởng nóng', payroll.thuongNong || 0],
        ['Tổng thu nhập', totalIncome],
        [''],
        ['3. Khấu trừ'],
        ['Khoản khấu trừ', 'Số tiền (VNĐ)'],
        ['BHXH', payroll.bhxh || 0],
        ['Thuế TNCN', payroll.thueTNCN || 0],
        ['Khấu trừ khác', (payroll.tamUng || 0) + (payroll.khac || 0)],
        ['Tổng khấu trừ', totalDeductions],
        [''],
        ['4. Thực lĩnh', netSalary]
      ]

      const ws = XLSX.utils.aoa_to_sheet(sheetData)

      // Styling and Widths
      ws['!cols'] = [
        { wch: 30 }, // Column A: Labels (Wide)
        { wch: 20 }  // Column B: Values (Medium)
      ]

      XLSX.utils.book_append_sheet(wb, ws, safeName)
    })

    XLSX.writeFile(wb, `Phieu_Luong_Hang_Loat_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const downloadAttendanceTemplate = () => {
    const headers = [
      'Mã NV',
      'Họ và tên',
      'Ngày (YYYY-MM-DD)',
      'Giờ vào (HH:MM)',
      'Giờ ra (HH:MM)'
    ]
    const sample = [
      'NV001', 'Nguyễn Văn A', '2024-11-01', '08:00', '17:30',
      'NV001', 'Nguyễn Văn A', '2024-11-02', '07:55', '17:35'
    ]
    // Use AOA to Sheet for simple list
    // Or better: Create a Matrix template as well?
    // Let's provide the List Format as default simple template
    const ws = XLSX.utils.aoa_to_sheet([headers, sample.slice(0, 5)]) // Just sample row
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MauChamCong')
    XLSX.writeFile(wb, 'Mau_nhap_cham_cong.xlsx')
  }

  if (loading) {
    return <div className="loadingState">Đang tải dữ liệu...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-clock"></i>
          Chấm công & Lương
        </h1>
        {activeTab === 'attendance' && (
          <>
            <button
              className="btn btn-success"
              onClick={handleExportAttendance}
              title="Xuất dữ liệu Excel"
            >
              <i className="fas fa-file-excel"></i>
              Xuất Excel
            </button>
            <button
              className="btn btn-info"
              onClick={downloadAttendanceTemplate}
              title="Tải file mẫu nhập liệu"
            >
              <i className="fas fa-download"></i>
              Tải mẫu
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setIsImportModalOpen(true)}
            >
              <i className="fas fa-file-import"></i>
              Import chấm công
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedAttendance(null)
                setIsAttendanceModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Thêm chấm công
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDeleteAllAttendance}
              title="Xóa tất cả dữ liệu chấm công"
            >
              <i className="fas fa-trash-alt"></i>
              Xóa tất cả
            </button>
            <SeedAttendanceDataButton employees={employees} onComplete={loadData} />
          </>
        )}
        {activeTab === 'payroll' && (
          <>
            <button
              className="btn btn-success"
              onClick={exportPayrollToExcel}
            >
              <i className="fas fa-file-excel"></i> Xuất Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCalculateWorkdays}
              title="Tính số công thực tế từ dữ liệu chấm công"
            >
              <i className="fas fa-calculator"></i> Tính công
            </button>
            <button
              className="btn btn-success"
              onClick={handleBatchExportPayslips}
              title="Xuất phiếu lương hàng loạt ra Excel"
            >
              <i className="fas fa-file-invoice"></i> Xuất Phiếu Lương
            </button>
            <button
              className="btn btn-info"
              onClick={() => {
                setFilterPayrollPeriod('')
                setFilterPayrollDept('')
              }}
            >
              <i className="fas fa-filter"></i>
              Xóa bộ lọc
            </button>
            <SeedPayrollDataButton employees={employees} onComplete={loadData} />
          </>
        )}
        {activeTab === 'insurance' && (
          <>
            <button
              className="btn btn-success"
              onClick={exportInsuranceToExcel}
            >
              <i className="fas fa-file-excel"></i> Xuất Excel
            </button>
            <button
              className="btn btn-info"
              onClick={downloadInsuranceTemplate}
            >
              <i className="fas fa-download"></i> Tải mẫu
            </button>
            <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-file-import"></i> Import
              <input type="file" hidden accept=".xlsx,.xls" onChange={handleInsuranceImportFile} />
            </label>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedInsurance(null)
                setIsInsuranceModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Thêm BHXH
            </button>
          </>
        )}
        {activeTab === 'tax' && (
          <>
            <button
              className="btn btn-success"
              onClick={exportTaxToExcel}
            >
              <i className="fas fa-file-excel"></i> Xuất Excel
            </button>
            <button
              className="btn btn-info"
              onClick={downloadTaxTemplate}
            >
              <i className="fas fa-download"></i> Tải mẫu
            </button>
            <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-file-import"></i> Import
              <input type="file" hidden accept=".xlsx,.xls" onChange={handleTaxImportFile} />
            </label>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedTax(null)
                setIsTaxModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Thêm Thuế TNCN
            </button>
          </>
        )}
        {activeTab === 'dependents' && (
          <>
            <button
              className="btn btn-success"
              onClick={exportDependentsToExcel}
            >
              <i className="fas fa-file-excel"></i> Xuất Excel
            </button>
            <button
              className="btn btn-info"
              onClick={downloadDependentsTemplate}
            >
              <i className="fas fa-download"></i> Tải mẫu
            </button>
            <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-file-import"></i> Import
              <input type="file" hidden accept=".xlsx,.xls" onChange={handleDependentsImportFile} />
            </label>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedDependent(null)
                setIsDependentModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Thêm người phụ thuộc
            </button>
          </>
        )}
      </div>

      <div className="tabs">
        <div
          className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          ⏰ Chấm công
        </div>
        <div
          className={`tab ${activeTab === 'payroll' ? 'active' : ''}`}
          onClick={() => setActiveTab('payroll')}
        >
          💰 Tính lương
        </div>
        <div
          className={`tab ${activeTab === 'insurance' ? 'active' : ''}`}
          onClick={() => setActiveTab('insurance')}
        >
          🏥 BHXH
        </div>
        <div
          className={`tab ${activeTab === 'tax' ? 'active' : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          📊 Thuế TNCN
        </div>
        <div
          className={`tab ${activeTab === 'dependents' ? 'active' : ''}`}
          onClick={() => setActiveTab('dependents')}
        >
          👨‍👩‍👧 Người phụ thuộc
        </div>
      </div>

      {/* Tab 1: Chấm công */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Bảng chấm công</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mã NV..."
                value={filterAttendanceEmployee}
                onChange={(e) => setFilterAttendanceEmployee(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '250px' }}
              />
              <select
                value={filterAttendanceMonth}
                onChange={(e) => setFilterAttendanceMonth(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px' }}
              >
                <option value="">Tất cả tháng</option>
                {[...new Set(attendanceLogs.map(log => {
                  const date = new Date(log.date || log.timestamp)
                  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                }))].sort().map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã NV</th>
                  <th>Họ và tên</th>
                  <th>Ngày</th>
                  <th>Check-in đầu</th>
                  <th>Đi muộn (phút)</th>
                  <th>Check-out cuối</th>
                  <th>Về sớm (phút)</th>
                  <th>Số giờ làm</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLogs.length > 0 ? (
                  attendanceLogs
                    .filter(log => {
                      // Filter by month
                      if (filterAttendanceMonth) {
                        const date = new Date(log.date || log.timestamp)
                        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        if (monthStr !== filterAttendanceMonth) return false
                      }

                      // Filter by employee name or ID
                      if (filterAttendanceEmployee) {
                        const emp = employees.find(e => e.id === log.employeeId)
                        const empName = emp?.ho_va_ten || emp?.name || ''
                        const empId = log.employeeId || ''
                        const searchTerm = normalizeString(filterAttendanceEmployee)

                        return normalizeString(empName).includes(searchTerm) ||
                          normalizeString(empId).includes(searchTerm)
                      }

                      return true
                    })
                    .sort((a, b) => {
                      // Sort by employee name first
                      const empA = employees.find(e => e.id === a.employeeId)
                      const empB = employees.find(e => e.id === b.employeeId)
                      const nameA = empA?.ho_va_ten || empA?.name || a.employeeId || ''
                      const nameB = empB?.ho_va_ten || empB?.name || b.employeeId || ''

                      if (nameA !== nameB) {
                        return nameA.localeCompare(nameB, 'vi')
                      }

                      // Then sort by date
                      const dateA = new Date(a.date || a.timestamp).getTime()
                      const dateB = new Date(b.date || b.timestamp).getTime()
                      return dateA - dateB
                    })
                    .map((log, idx) => {
                      const employee = employees.find(e => e.id === log.employeeId)
                      const checkIn = log.checkIn ? new Date(log.checkIn).toLocaleTimeString('vi-VN') : '-'
                      const checkOut = log.checkOut ? new Date(log.checkOut).toLocaleTimeString('vi-VN') : '-'
                      let hours = 0
                      if (log.hours !== undefined && log.hours !== null) {
                        hours = typeof log.hours === 'string' ? parseFloat(log.hours) : Number(log.hours)
                      } else if (log.soGio !== undefined && log.soGio !== null) {
                        hours = typeof log.soGio === 'string' ? parseFloat(log.soGio) : Number(log.soGio)
                      }
                      if (isNaN(hours)) hours = 0
                      return (
                        <tr key={log.id}>
                          <td>{idx + 1}</td>
                          <td>{log.employeeId || '-'}</td>
                          <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                          <td>{log.date ? new Date(log.date).toLocaleDateString('vi-VN') : '-'}</td>
                          <td>{checkIn}</td>
                          <td style={{ color: log.lateMinutes > 0 ? '#dc3545' : '#6c757d' }}>
                            {log.lateMinutes > 0 ? `${log.lateMinutes}p` : '-'}
                          </td>
                          <td>{checkOut}</td>
                          <td style={{ color: log.earlyMinutes > 0 ? '#ffc107' : '#6c757d' }}>
                            {log.earlyMinutes > 0 ? `${log.earlyMinutes}p` : '-'}
                          </td>
                          <td>{typeof hours === 'number' && !isNaN(hours) ? hours.toFixed(1) + 'h' : '0.0h'}</td>
                          <td>
                            <span className={`badge ${log.status === 'Đủ' ? 'badge-success' :
                              log.status === 'Thiếu' ? 'badge-warning' :
                                'badge-danger'
                              }`}>
                              {escapeHtml(log.status || '-')}
                            </span>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="view"
                                onClick={() => {
                                  setSelectedAttendance(log)
                                  setIsAttendanceReadOnly(true)
                                  setIsAttendanceModalOpen(true)
                                }}
                                title="Xem chi tiết"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="edit"
                                onClick={() => {
                                  setSelectedAttendance(log)
                                  setIsAttendanceReadOnly(false)
                                  setIsAttendanceModalOpen(true)
                                }}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="delete"
                                onClick={() => handleDeleteAttendance(log.id)}
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
                    <td colSpan="9" className="empty-state">Chưa có dữ liệu chấm công</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Tính lương */}
      {activeTab === 'payroll' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Bảng 1: Bảng lương tổng hợp</h3>
            <div className="search-box" style={{ display: 'flex', gap: '10px' }}>
              <select
                value={filterPayrollStatus}
                onChange={(e) => setFilterPayrollStatus(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px' }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Đang tính">Đang tính</option>
                <option value="Đã chốt">Đã chốt</option>
              </select>
              <select
                value={filterPayrollPeriod}
                onChange={(e) => setFilterPayrollPeriod(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px' }}
              >
                <option value="">Tất cả kỳ</option>
                {[...new Set(payrolls.map(p => p.period).filter(Boolean))].sort().map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
              <select
                value={filterPayrollDept}
                onChange={(e) => setFilterPayrollDept(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px' }}
              >
                <option value="">Tất cả bộ phận</option>
                {[...new Set(payrolls.map(p => p.department).filter(Boolean))].sort().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Bộ phận</th>
                  <th>Vị trí</th>
                  <th>Công thực tế</th>
                  <th>Lương P1 (VNĐ)</th>
                  <th>Kết quả P3</th>
                  <th>Lương 3P (VNĐ)</th>
                  <th>Lương ngày công</th>
                  <th>Thưởng nóng (VNĐ)</th>
                  <th>Tổng thu nhập</th>
                  <th>BHXH + Thuế TNCN</th>
                  <th>Khấu trừ khác</th>
                  <th>Thực lĩnh</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.length > 0 ? (
                  filteredPayrolls.map((payroll, idx) => {
                    const employee = employees.find(e => e.id === payroll.employeeId)
                    const totalIncome = (payroll.luong3P || 0) + (payroll.luongNgayCong || 0) + (payroll.thuongNong || 0)
                    const totalDeductions = calculateTotalDeductions(payroll)
                    const netSalary = calculateNetSalary(payroll)
                    const bhxhAndTax = (payroll.bhxh || 0) + (payroll.thueTNCN || 0)
                    const otherDeductions = (payroll.khac || 0) + (payroll.tamUng || 0)

                    return (
                      <tr key={payroll.id}>
                        <td>{idx + 1}</td>
                        <td>{payroll.employeeId || '-'}</td>
                        <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                        <td>{escapeHtml(payroll.department || '-')}</td>
                        <td>{employee ? (employee.vi_tri || '-') : '-'}</td>
                        <td>{payroll.congThucTe || payroll.cong || 0}</td>
                        <td>{formatMoney(payroll.luongP1 || 0)}</td>
                        <td>{payroll.ketQuaP3 || payroll.p3 || '0%'}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                          {formatMoney(payroll.luong3P || 0)}
                        </td>
                        <td>{formatMoney(payroll.luongNgayCong || 0)}</td>
                        <td>{formatMoney(payroll.thuongNong || 0)}</td>
                        <td style={{ fontWeight: 'bold' }}>{formatMoney(totalIncome)}</td>
                        <td>{formatMoney(bhxhAndTax)}</td>
                        <td>{formatMoney(otherDeductions)}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                          {formatMoney(netSalary)}
                        </td>
                        <td>
                          <span className={`badge ${payroll.status === 'Đã chốt' ? 'badge-success' :
                            payroll.status === 'Đang tính' ? 'badge-warning' :
                              'badge-secondary'
                            }`}>
                            {escapeHtml(payroll.status || 'Đang tính')}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="view"
                              onClick={() => {
                                setSelectedPayroll(payroll)
                                setIsPayrollReadOnly(true)
                                setIsPayrollDetailModalOpen(true)
                              }}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            {payroll.status === 'Đang tính' && (
                              <button
                                className="edit"
                                onClick={() => {
                                  setSelectedPayroll(payroll)
                                  setIsPayrollReadOnly(false)
                                  setIsPayrollDetailModalOpen(true)
                                }}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                            )}
                            <button
                              className="view"
                              onClick={() => {
                                setSelectedPayslip(payroll)
                                setIsPayslipModalOpen(true)
                              }}
                              title="Xem phiếu lương"
                            >
                              <i className="fas fa-file-invoice-dollar"></i>
                            </button>
                            <button
                              className="delete"
                              onClick={() => handleDeletePayroll(payroll.id)}
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
                    <td colSpan="17" className="empty-state">Chưa có dữ liệu lương</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: BHXH */}
      {
        activeTab === 'insurance' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bảng 1: Thông tin BHXH</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Bộ phận</th>
                  <th>Số sổ BHXH</th>
                  <th>Ngày tham gia</th>
                  <th>Mức lương đóng BHXH</th>
                  <th>Tỷ lệ NLĐ (%)</th>
                  <th>Tỷ lệ DN (%)</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {insuranceInfo.length > 0 ? (
                  insuranceInfo.map((insurance, idx) => {
                    const employee = employees.find(e => e.id === insurance.employeeId)
                    return (
                      <tr key={insurance.id}>
                        <td>{idx + 1}</td>
                        <td>{insurance.employeeId || '-'}</td>
                        <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                        <td>{employee ? (employee.bo_phan || employee.department || '-') : '-'}</td>
                        <td>{escapeHtml(insurance.soSoBHXH || insurance.soSo || '-')}</td>
                        <td>{insurance.ngayThamGia ? new Date(insurance.ngayThamGia).toLocaleDateString('vi-VN') : '-'}</td>
                        <td>{formatMoney(insurance.mucLuongDong || insurance.mucLuong || 0)}</td>
                        <td>{insurance.tyLeNLD || insurance.tyLeNhanVien || 10.5}%</td>
                        <td>{insurance.tyLeDN || insurance.tyLeDoanhNghiep || 21.5}%</td>
                        <td>
                          <span className={`badge ${insurance.status === 'Đang tham gia' ? 'badge-success' :
                            'badge-danger'
                            }`}>
                            {escapeHtml(insurance.status || 'Đang tham gia')}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="view"
                              onClick={() => {
                                setSelectedInsurance(insurance)
                                setIsInsuranceReadOnly(true)
                                setIsInsuranceModalOpen(true)
                              }}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="edit"
                              onClick={() => {
                                setSelectedInsurance(insurance)
                                setIsInsuranceReadOnly(false)
                                setIsInsuranceModalOpen(true)
                              }}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="delete"
                              onClick={() => handleDeleteInsurance(insurance.id)}
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
                    <td colSpan="11" className="empty-state">Chưa có thông tin BHXH</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Tab 4: Thuế TNCN */}
      {
        activeTab === 'tax' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bảng 2: Thông tin Thuế TNCN</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã NV</th>
                    <th>Họ tên</th>
                    <th>Mã số thuế TNCN</th>
                    <th>Thu nhập tính thuế</th>
                    <th>Giảm trừ bản thân</th>
                    <th>Tổng giảm trừ người phụ thuộc</th>
                    <th>Thu nhập chịu thuế</th>
                    <th>Biểu thuế</th>
                    <th>Thuế TNCN phải nộp</th>
                    <th>Kỳ áp dụng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {taxInfo.length > 0 ? (
                    taxInfo.map((tax, idx) => {
                      const employee = employees.find(e => e.id === tax.employeeId)

                      // 1. Calculate Deductions
                      const personalDeduction = TAX_CONFIG.PERSONAL_DEDUCTION

                      const employeeDependents = dependents.filter(d =>
                        d.employeeId === tax.employeeId &&
                        d.status === 'Đang áp dụng'
                      )
                      const dependentDeduction = employeeDependents.length * TAX_CONFIG.DEPENDENT_DEDUCTION

                      // BHXH Deduction (10.5% of Insurance Salary)
                      const empInsurance = insuranceInfo.find(i => i.employeeId === tax.employeeId && i.status === 'Đang tham gia')
                      const insuranceDeduction = empInsurance ? (Number(empInsurance.mucLuongDongBHXH || 0) * 0.105) : 0

                      // 2. Calculate Assessable Income
                      const inputIncome = Number(tax.thuNhapTinhThue || 0)
                      const assessableIncome = Math.max(0, inputIncome - personalDeduction - dependentDeduction - insuranceDeduction)

                      // 3. Calculate Tax using progressive formula
                      const taxAmount = calculateProgressiveTax(assessableIncome)

                      return (
                        <tr key={tax.id}>
                          <td>{idx + 1}</td>
                          <td>{tax.employeeId || '-'}</td>
                          <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                          <td>{escapeHtml(tax.maSoThue || tax.mst || '-')}</td>
                          <td>{formatMoney(inputIncome)}</td>
                          <td>{formatMoney(personalDeduction)}</td>
                          <td>{formatMoney(dependentDeduction)}</td>
                          <td>{formatMoney(assessableIncome)}</td>
                          <td>{escapeHtml(tax.bieuThue || 'Lũy tiến')}</td>
                          <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                            {formatMoney(taxAmount)}
                          </td>
                          <td>{escapeHtml(tax.kyApDung || tax.period || '-')}</td>
                          <td>
                            <div className="actions">
                              <button
                                className="view"
                                onClick={() => {
                                  setSelectedTax(tax)
                                  setIsTaxReadOnly(true)
                                  setIsTaxModalOpen(true)
                                }}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="edit"
                                onClick={() => {
                                  setSelectedTax(tax)
                                  setIsTaxReadOnly(false)
                                  setIsTaxModalOpen(true)
                                }}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="delete"
                                onClick={() => handleDeleteTax(tax.id)}
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
                      <td colSpan="12" className="empty-state">Chưa có thông tin thuế TNCN</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Tab 5: Người phụ thuộc */}
      {
        activeTab === 'dependents' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bảng 3: Quản lý người phụ thuộc của nhân sự</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã NV</th>
                    <th>Họ tên NV</th>
                    <th>Họ tên người phụ thuộc</th>
                    <th>Quan hệ</th>
                    <th>Ngày sinh</th>
                    <th>CCCD/CMND</th>
                    <th>Thời gian giảm trừ từ</th>
                    <th>Thời gian giảm trừ đến</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {dependents.length > 0 ? (
                    dependents.map((dependent, idx) => {
                      const employee = employees.find(e => e.id === dependent.employeeId)
                      return (
                        <tr key={dependent.id}>
                          <td>{idx + 1}</td>
                          <td>{dependent.employeeId || '-'}</td>
                          <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                          <td>{escapeHtml(dependent.hoTen || dependent.name || '-')}</td>
                          <td>{escapeHtml(dependent.quanHe || dependent.relationship || '-')}</td>
                          <td>{dependent.ngaySinh ? new Date(dependent.ngaySinh).toLocaleDateString('vi-VN') : '-'}</td>
                          <td>{escapeHtml(dependent.cccd || dependent.cmnd || '-')}</td>
                          <td>{dependent.tuNgay ? new Date(dependent.tuNgay).toLocaleDateString('vi-VN') : '-'}</td>
                          <td>{dependent.denNgay ? new Date(dependent.denNgay).toLocaleDateString('vi-VN') : '-'}</td>
                          <td>
                            <span className={`badge ${dependent.status === 'Đang áp dụng' ? 'badge-success' :
                              'badge-danger'
                              }`}>
                              {escapeHtml(dependent.status || 'Đang áp dụng')}
                            </span>
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="view"
                                onClick={() => {
                                  setSelectedDependent(dependent)
                                  setIsDependentReadOnly(true)
                                  setIsDependentModalOpen(true)
                                }}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="edit"
                                onClick={() => {
                                  setSelectedDependent(dependent)
                                  setIsDependentReadOnly(false)
                                  setIsDependentModalOpen(true)
                                }}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="delete"
                                onClick={() => handleDeleteDependent(dependent.id)}
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
                      <td colSpan="11" className="empty-state">Chưa có người phụ thuộc</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {/* Modals */}
      <AttendanceImportModal
        employees={employees}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSave={loadData}
      />

      <AttendanceModal
        attendance={selectedAttendance}
        employees={employees}
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false)
          setSelectedAttendance(null)
          setIsAttendanceReadOnly(false)
        }}
        onSave={loadData}
        readOnly={isAttendanceReadOnly}
      />

      <PayrollDetailModal
        payroll={selectedPayroll}
        employees={employees}
        isOpen={isPayrollDetailModalOpen}
        onClose={() => {
          setIsPayrollDetailModalOpen(false)
          setSelectedPayroll(null)
          setIsPayrollReadOnly(false)
        }}
        onSave={loadData}
        readOnly={isPayrollReadOnly}
      />

      <InsuranceModal
        insurance={selectedInsurance}
        employees={employees}
        isOpen={isInsuranceModalOpen}
        onClose={() => {
          setIsInsuranceModalOpen(false)
          setSelectedInsurance(null)
          setIsInsuranceReadOnly(false)
        }}
        onSave={loadData}
        readOnly={isInsuranceReadOnly}
      />

      <TaxModal
        tax={selectedTax}
        employees={employees}
        dependents={dependents}
        isOpen={isTaxModalOpen}
        onClose={() => {
          setIsTaxModalOpen(false)
          setSelectedTax(null)
          setIsTaxReadOnly(false)
        }}
        onSave={loadData}
        readOnly={isTaxReadOnly}
      />

      <DependentModal
        dependent={selectedDependent}
        employees={employees}
        isOpen={isDependentModalOpen}
        onClose={() => {
          setIsDependentModalOpen(false)
          setSelectedDependent(null)
          setIsDependentReadOnly(false)
        }}
        onSave={loadData}
        readOnly={isDependentReadOnly}
      />

      <PayslipModal
        payroll={selectedPayslip}
        employee={selectedPayslip ? employees.find(e => e.id === selectedPayslip.employeeId) : null}
        isOpen={isPayslipModalOpen}
        onClose={() => {
          setIsPayslipModalOpen(false)
          setSelectedPayslip(null)
        }}
      />
    </div >
  )
}

export default Attendance
