import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import EmployeeSalaryModal from '../components/EmployeeSalaryModal'
import InsuranceModal from '../components/InsuranceModal'
import PromotionHistoryModal from '../components/PromotionHistoryModal'
import PromotionModal from '../components/PromotionModal'
import SalaryGradeModal from '../components/SalaryGradeModal'
import SeedDataButton from '../components/SeedDataButton'
import SeedPromotionHistoryButton from '../components/SeedPromotionHistoryButton'
import TaxModal from '../components/TaxModal'
import { fbDelete, fbGet, fbPush } from '../services/firebase'
import { escapeHtml, formatMoney } from '../utils/helpers'


function Salary() {
  const [activeTab, setActiveTab] = useState('grades')
  const [salaryGrades, setSalaryGrades] = useState([])
  const [employeeSalaries, setEmployeeSalaries] = useState([])
  const [promotionHistory, setPromotionHistory] = useState([])
  const [insuranceInfo, setInsuranceInfo] = useState([])
  const [taxInfo, setTaxInfo] = useState([])
  const [dependents, setDependents] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false)
  const [isEmployeeSalaryModalOpen, setIsEmployeeSalaryModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false)
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false)
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false)

  const [selectedGrade, setSelectedGrade] = useState(null)
  const [selectedEmployeeSalary, setSelectedEmployeeSalary] = useState(null)
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState(null)
  const [selectedInsurance, setSelectedInsurance] = useState(null)
  const [selectedTax, setSelectedTax] = useState(null)
  const [isTaxReadOnly, setIsTaxReadOnly] = useState(false)
  const [isInsuranceReadOnly, setIsInsuranceReadOnly] = useState(false)

  // Excel Import/Export states for Insurance
  const [isInsuranceImportModalOpen, setIsInsuranceImportModalOpen] = useState(false)
  const [insuranceImportFile, setInsuranceImportFile] = useState(null)
  const [insuranceImportPreviewData, setInsuranceImportPreviewData] = useState([])
  const [isInsuranceImporting, setIsInsuranceImporting] = useState(false)

  // Excel Import/Export states for Tax
  const [isTaxImportModalOpen, setIsTaxImportModalOpen] = useState(false)
  const [taxImportFile, setTaxImportFile] = useState(null)
  const [taxImportPreviewData, setTaxImportPreviewData] = useState([])
  const [isTaxImporting, setIsTaxImporting] = useState(false)

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

      // Load salary grades
      const hrData = await fbGet('hr')
      const grades = hrData?.salaryGrades ? Object.entries(hrData.salaryGrades).map(([k, v]) => ({ ...v, id: k })) : []
      setSalaryGrades(grades)

      // Load employee salaries
      const empSalaries = hrData?.employeeSalaries ? Object.entries(hrData.employeeSalaries).map(([k, v]) => ({ ...v, id: k })) : []
      setEmployeeSalaries(empSalaries)

      // Load promotion history
      const history = hrData?.promotionHistory ? Object.entries(hrData.promotionHistory).map(([k, v]) => ({ ...v, id: k })) : []
      setPromotionHistory(history)

      // Load Insurance Info
      const insData = hrData?.insuranceInfo ? Object.entries(hrData.insuranceInfo).map(([k, v]) => ({ ...v, id: k })) : []
      setInsuranceInfo(insData)

      // Load Tax Info
      const taxData = hrData?.taxInfo ? Object.entries(hrData.taxInfo).map(([k, v]) => ({ ...v, id: k })) : []
      setTaxInfo(taxData)

      // Load Dependents (for Tax Calc)
      const depData = hrData?.dependents ? Object.entries(hrData.dependents).map(([k, v]) => ({ ...v, id: k })) : []
      setDependents(depData)

      setLoading(false)
    } catch (error) {
      console.error('Error loading salary data:', error)
      setLoading(false)
    }
  }

  const handleDeleteGrade = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa bậc lương này?')) return
    try {
      await fbDelete(`hr/salaryGrades/${id}`)
      loadData()
      alert('Đã xóa bậc lương')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  const handleDeleteEmployeeSalary = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa bậc lương nhân viên này?')) return
    try {
      await fbDelete(`hr/employeeSalaries/${id}`)
      loadData()
      alert('Đã xóa bậc lương nhân viên')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  // Export Insurance Data to Excel
  const exportInsuranceToExcel = () => {
    if (insuranceInfo.length === 0) {
      alert('Không có dữ liệu để xuất!')
      return
    }

    const exportData = insuranceInfo.map((ins, idx) => {
      const employee = employees.find(e => e.id === ins.employeeId)
      return {
        'STT': idx + 1,
        'Mã NV': ins.employeeId || '',
        'Họ và tên': employee ? (employee.ho_va_ten || employee.name || '') : '',
        'Bộ phận': employee ? (employee.bo_phan || '') : '',
        'Số sổ BHXH': ins.soSoBHXH || '',
        'Ngày tham gia': ins.ngayThamGia ? new Date(ins.ngayThamGia).toLocaleDateString('vi-VN') : '',
        'Mức lương đóng BHXH': ins.mucLuongDong || 0,
        'Tỷ lệ NLĐ (%)': ins.tyLeNLD || 0,
        'Tỷ lệ DN (%)': ins.tyLeDN || 0,
        'Trạng thái': ins.status || ''
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bảo Hiểm Xã Hội')
    const fileName = `Thong_tin_BHXH_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Handle file selection for insurance import
  const handleInsuranceFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setInsuranceImportFile(file)
    setIsInsuranceImporting(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length < 2) {
        alert('File Excel không có dữ liệu')
        setIsInsuranceImporting(false)
        return
      }

      const headers = Array.from(jsonData[0] || []).map(h => String(h || '').toLowerCase().trim())

      // Find column indexes
      const maNVIdx = headers.findIndex(h => h.includes('mã nv') || h.includes('mã nhân viên'))
      const soSoIdx = headers.findIndex(h => h.includes('số sổ'))
      const ngayThamGiaIdx = headers.findIndex(h => h.includes('ngày tham gia'))
      const mucLuongIdx = headers.findIndex(h => h.includes('mức lương'))
      const tyLeNLDIdx = headers.findIndex(h => h.includes('tỷ lệ nld') || h.includes('nld'))
      const tyLeDNIdx = headers.findIndex(h => h.includes('tỷ lệ dn') || h.includes('dn'))
      const statusIdx = headers.findIndex(h => h.includes('trạng thái'))

      // Validate required columns
      if (maNVIdx === -1 || soSoIdx === -1 || mucLuongIdx === -1) {
        alert('File Excel cần có các cột: Mã NV, Số sổ BHXH, Mức lương đóng BHXH')
        setIsInsuranceImporting(false)
        return
      }

      // Parse data rows
      const parsedData = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row[maNVIdx] || !row[soSoIdx] || !row[mucLuongIdx]) continue

        // Find employee by ID
        const empId = String(row[maNVIdx]).trim()
        const employee = employees.find(e => e.id === empId)

        if (!employee) {
          console.warn(`Không tìm thấy nhân viên với mã: ${empId}`)
          continue
        }

        parsedData.push({
          employeeId: empId,
          soSoBHXH: row[soSoIdx] || '',
          ngayThamGia: ngayThamGiaIdx !== -1 ? row[ngayThamGiaIdx] || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          mucLuongDong: Number(row[mucLuongIdx]) || 0,
          tyLeNLD: tyLeNLDIdx !== -1 ? Number(row[tyLeNLDIdx]) || 10.5 : 10.5,
          tyLeDN: tyLeDNIdx !== -1 ? Number(row[tyLeDNIdx]) || 21.5 : 21.5,
          status: statusIdx !== -1 ? row[statusIdx] || 'Đang tham gia' : 'Đang tham gia',
          employeeName: employee.ho_va_ten || employee.name || '',
          department: employee.bo_phan || ''
        })
      }

      setInsuranceImportPreviewData(parsedData)
      setIsInsuranceImporting(false)
    } catch (error) {
      alert('Lỗi khi đọc file: ' + error.message)
      setIsInsuranceImporting(false)
    }
  }

  // Confirm and import insurance data to Firebase
  const handleConfirmInsuranceImport = async () => {
    if (insuranceImportPreviewData.length === 0) {
      alert('Không có dữ liệu để import')
      return
    }

    setIsInsuranceImporting(true)
    try {
      let successCount = 0
      for (const insurance of insuranceImportPreviewData) {
        // Remove temporary fields before saving
        const { employeeName, department, ...dataToSave } = insurance
        await fbPush('hr/insuranceInfo', dataToSave)
        successCount++
      }

      alert(`Đã import thành công ${successCount} thông tin BHXH`)
      setIsInsuranceImportModalOpen(false)
      setInsuranceImportFile(null)
      setInsuranceImportPreviewData([])
      await loadData()
    } catch (error) {
      alert('Lỗi khi import: ' + error.message)
    } finally {
      setIsInsuranceImporting(false)
    }
  }

  // Export Tax Data to Excel
  const exportTaxToExcel = () => {
    if (taxInfo.length === 0) {
      alert('Không có dữ liệu để xuất!')
      return
    }

    const exportData = taxInfo.map((tax, idx) => {
      const employee = employees.find(e => e.id === tax.employeeId)
      return {
        'STT': idx + 1,
        'Mã NV': tax.employeeId || '',
        'Họ và tên': employee ? (employee.ho_va_ten || employee.name || '') : '',
        'Bộ phận': employee ? (employee.bo_phan || '') : '',
        'Mã số thuế': tax.maSoThue || '',
        'Thu nhập tính thuế': tax.thuNhapTinhThue || 0,
        'Giảm trừ bản thân': tax.giamTruBanThan || 0,
        'Giảm trừ BHXH': tax.giamTruBHXH || 0,
        'Tổng giảm trừ NPT': tax.tongGiamTruNguoiPhuThuoc || 0,
        'Thu nhập chịu thuế': tax.thuNhapChiuThue || 0,
        'Thuế phải nộp': tax.thuePhaiNop || 0,
        'Biểu thuế': tax.bieuThue || '',
        'Kỳ áp dụng': tax.kyApDung || ''
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Thuế TNCN')
    const fileName = `Thong_tin_Thue_TNCN_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Handle file selection for tax import
  const handleTaxFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setTaxImportFile(file)
    setIsTaxImporting(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length < 2) {
        alert('File Excel không có dữ liệu')
        setIsTaxImporting(false)
        return
      }

      const headers = Array.from(jsonData[0] || []).map(h => String(h || '').toLowerCase().trim())

      // Find column indexes
      const maNVIdx = headers.findIndex(h => h.includes('mã nv') || h.includes('mã nhân viên'))
      const mstIdx = headers.findIndex(h => h.includes('mã số thuế'))
      const thuNhapIdx = headers.findIndex(h => h.includes('thu nhập tính thuế'))
      const giamTruIdx = headers.findIndex(h => h.includes('giảm trừ bản thân'))
      const bieuThueIdx = headers.findIndex(h => h.includes('biểu thuế'))
      const kyApDungIdx = headers.findIndex(h => h.includes('kỳ áp dụng'))

      // Validate required columns
      if (maNVIdx === -1 || thuNhapIdx === -1) {
        alert('File Excel cần có các cột: Mã NV, Thu nhập tính thuế')
        setIsTaxImporting(false)
        return
      }

      // Parse data rows
      const parsedData = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row[maNVIdx] || !row[thuNhapIdx]) continue

        // Find employee by ID
        const empId = String(row[maNVIdx]).trim()
        const employee = employees.find(e => e.id === empId)

        if (!employee) {
          console.warn(`Không tìm thấy nhân viên với mã: ${empId}`)
          continue
        }

        parsedData.push({
          employeeId: empId,
          maSoThue: mstIdx !== -1 ? row[mstIdx] || '' : '',
          thuNhapTinhThue: Number(row[thuNhapIdx]) || 0,
          giamTruBanThan: giamTruIdx !== -1 ? Number(row[giamTruIdx]) || 15500000 : 15500000,
          bieuThue: bieuThueIdx !== -1 ? row[bieuThueIdx] || 'Lũy tiến' : 'Lũy tiến',
          kyApDung: kyApDungIdx !== -1 ? row[kyApDungIdx] || '' : '',
          employeeName: employee.ho_va_ten || employee.name || '',
          department: employee.bo_phan || ''
        })
      }

      setTaxImportPreviewData(parsedData)
      setIsTaxImporting(false)
    } catch (error) {
      alert('Lỗi khi đọc file: ' + error.message)
      setIsTaxImporting(false)
    }
  }

  // Confirm and import tax data to Firebase
  const handleConfirmTaxImport = async () => {
    if (taxImportPreviewData.length === 0) {
      alert('Không có dữ liệu để import')
      return
    }

    setIsTaxImporting(true)
    try {
      let successCount = 0
      for (const tax of taxImportPreviewData) {
        // Remove temporary fields and calculate tax
        const { employeeName, department, ...baseData } = tax

        // Get dependents for this employee
        const employeeDependents = dependents.filter(d => d.employeeId === tax.employeeId && d.status === 'Đang áp dụng')
        const totalDependentDeduction = employeeDependents.length * 6200000

        // Get insurance deduction
        let insuranceDeduction = 0
        const empIns = insuranceInfo.find(i => i.employeeId === tax.employeeId && i.status === 'Đang tham gia')
        if (empIns) {
          insuranceDeduction = (empIns.mucLuongDong || 0) * ((empIns.tyLeNLD || 10.5) / 100)
        }

        const personalDeduction = tax.giamTruBanThan || 15500000
        const taxableIncome = Math.max(0, tax.thuNhapTinhThue - personalDeduction - totalDependentDeduction - insuranceDeduction)

        // Calculate tax based on bieuThue
        let thuePhaiNop = 0
        if (tax.bieuThue === 'Toàn phần') {
          thuePhaiNop = taxableIncome * 0.1
        } else {
          // Lũy tiến
          if (taxableIncome <= 0) thuePhaiNop = 0
          else if (taxableIncome <= 5000000) thuePhaiNop = taxableIncome * 0.05
          else if (taxableIncome <= 10000000) thuePhaiNop = taxableIncome * 0.1 - 250000
          else if (taxableIncome <= 18000000) thuePhaiNop = taxableIncome * 0.15 - 750000
          else if (taxableIncome <= 32000000) thuePhaiNop = taxableIncome * 0.2 - 1650000
          else if (taxableIncome <= 52000000) thuePhaiNop = taxableIncome * 0.25 - 3250000
          else if (taxableIncome <= 80000000) thuePhaiNop = taxableIncome * 0.3 - 5850000
          else thuePhaiNop = taxableIncome * 0.35 - 9850000
        }

        const dataToSave = {
          ...baseData,
          tongGiamTruNguoiPhuThuoc: totalDependentDeduction,
          giamTruBHXH: insuranceDeduction,
          thuNhapChiuThue: taxableIncome,
          thuePhaiNop
        }

        await fbPush('hr/taxInfo', dataToSave)
        successCount++
      }

      alert(`Đã import thành công ${successCount} thông tin thuế TNCN`)
      setIsTaxImportModalOpen(false)
      setTaxImportFile(null)
      setTaxImportPreviewData([])
      await loadData()
    } catch (error) {
      alert('Lỗi khi import: ' + error.message)
    } finally {
      setIsTaxImporting(false)
    }
  }

  if (loading) {
    return <div className="loadingState">Đang tải dữ liệu...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-dollar-sign"></i>
          Bậc lương & Thăng tiến
        </h1>
        {activeTab === 'grades' && (
          <>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedGrade(null)
                setIsGradeModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Thêm bậc lương
            </button>
            <SeedDataButton />
          </>
        )}
        {activeTab === 'employee-salary' && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedEmployeeSalary(null)
              setIsEmployeeSalaryModalOpen(true)
            }}
          >
            <i className="fas fa-plus"></i>
            Gán bậc lương NV
          </button>
        )}
        {activeTab === 'promotions' && (
          <>
            <button
              className="btn btn-primary"
              onClick={() => {
                setIsPromotionModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Thêm lịch sử thăng tiến
            </button>
            <SeedPromotionHistoryButton
              employees={employees}
              salaryGrades={salaryGrades}
              onComplete={loadData}
            />
          </>
        )}
        {activeTab === 'insurance' && (
          <>
            <button
              className="btn btn-success"
              onClick={exportInsuranceToExcel}
              title="Xuất dữ liệu ra Excel"
            >
              <i className="fas fa-file-excel"></i>
              Xuất Excel
            </button>
            <button
              className="btn btn-info"
              onClick={() => setIsInsuranceImportModalOpen(true)}
              title="Import từ Excel"
            >
              <i className="fas fa-file-import"></i>
              Import từ Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedInsurance(null)
                setIsInsuranceModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Tạo mới Cá nhân BHXH
            </button>
          </>
        )}
        {activeTab === 'tax' && (
          <>
            <button
              className="btn btn-success"
              onClick={exportTaxToExcel}
              title="Xuất dữ liệu ra Excel"
            >
              <i className="fas fa-file-excel"></i>
              Xuất Excel
            </button>
            <button
              className="btn btn-info"
              onClick={() => setIsTaxImportModalOpen(true)}
              title="Import từ Excel"
            >
              <i className="fas fa-file-import"></i>
              Import từ Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedTax(null)
                setIsTaxModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Tạo mới Cá nhân Thuế
            </button>
          </>
        )}
      </div>

      <div className="tabs">
        <div
          className={`tab ${activeTab === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveTab('grades')}
        >
          📊 Danh mục bậc lương
        </div>
        <div
          className={`tab ${activeTab === 'employee-salary' ? 'active' : ''}`}
          onClick={() => setActiveTab('employee-salary')}
        >
          👤 Bậc lương NV
        </div>
        <div
          className={`tab ${activeTab === 'promotions' ? 'active' : ''}`}
          onClick={() => setActiveTab('promotions')}
        >
          📈 Lịch sử thăng tiến
        </div>
        <div
          className={`tab ${activeTab === 'insurance' ? 'active' : ''}`}
          onClick={() => setActiveTab('insurance')}
        >
          🏥 Thông tin BHXH
        </div>
        <div
          className={`tab ${activeTab === 'tax' ? 'active' : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          💸 Thuế TNCN
        </div>
      </div>

      {/* Tab 1: Danh mục bậc lương */}
      {activeTab === 'grades' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Vị trí</th>
                <th>Ca làm việc</th>
                <th>Doanh thu từ (triệu/tháng)</th>
                <th>Doanh thu đến (triệu/tháng)</th>
                <th>Bậc lương</th>
                <th>Lương P1 (VNĐ)</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {salaryGrades.length > 0 ? (
                salaryGrades
                  .sort((a, b) => (a.level || 0) - (b.level || 0))
                  .map((grade, idx) => (
                    <tr key={grade.id}>
                      <td>{idx + 1}</td>
                      <td>{escapeHtml(grade.position || grade.name || '-')}</td>
                      <td>{escapeHtml(grade.shift || 'Ca ngày')}</td>
                      <td>{grade.revenueFrom || 0}</td>
                      <td>{grade.revenueTo === null || grade.revenueTo === undefined || grade.revenueTo === '' ? 'Không giới hạn' : grade.revenueTo}</td>
                      <td>Bậc {grade.level || 1}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {formatMoney(grade.salary || 0)}
                      </td>
                      <td>
                        <span className={`badge ${grade.status === 'Đang áp dụng' ? 'badge-success' : 'badge-danger'}`}>
                          {escapeHtml(grade.status || 'Đang áp dụng')}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="edit"
                            onClick={() => {
                              setSelectedGrade(grade)
                              setIsGradeModalOpen(true)
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="delete"
                            onClick={() => handleDeleteGrade(grade.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">Chưa có bậc lương</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Bậc lương nhân viên */}
      {activeTab === 'employee-salary' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã NV</th>
                <th>Họ và tên</th>
                <th>Bộ phận</th>
                <th>Vị trí</th>
                <th>Ca làm việc</th>
                <th>Bậc lương P1</th>
                <th>Lương P1 (VNĐ)</th>
                <th>Ngày hiệu lực</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {employeeSalaries.length > 0 ? (
                employeeSalaries.map((empSal, idx) => {
                  const employee = employees.find(e => e.id === empSal.employeeId)
                  const grade = salaryGrades.find(g => g.id === empSal.salaryGradeId)
                  return (
                    <tr key={empSal.id}>
                      <td>{idx + 1}</td>
                      <td>{empSal.employeeId || '-'}</td>
                      <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                      <td>{employee ? (employee.bo_phan || '-') : '-'}</td>
                      <td>{employee ? (employee.vi_tri || '-') : '-'}</td>
                      <td>{grade ? (grade.shift || 'Ca ngày') : '-'}</td>
                      <td>{grade ? `Bậc ${grade.level || 1}` : '-'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {grade ? formatMoney(grade.salary || 0) : '-'}
                      </td>
                      <td>{empSal.effectiveDate || '-'}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="edit"
                            onClick={() => {
                              setSelectedEmployeeSalary(empSal)
                              setIsEmployeeSalaryModalOpen(true)
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="delete"
                            onClick={() => handleDeleteEmployeeSalary(empSal.id)}
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
                  <td colSpan="10" className="empty-state">Chưa có bậc lương nhân viên</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Lịch sử thăng tiến */}
      {activeTab === 'promotions' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã NV</th>
                <th>Họ và tên</th>
                <th>Bộ phận</th>
                <th>Vị trí</th>
                <th>Ca làm việc</th>
                <th>Bậc lương</th>
                <th>Lương P1 (VNĐ)</th>
                <th>Ngày thay đổi</th>
                <th>Hình thức</th>
                <th>Lý do điều chỉnh</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {promotionHistory.length > 0 ? (
                promotionHistory
                  .sort((a, b) => new Date(b.effectiveDate || 0) - new Date(a.effectiveDate || 0))
                  .map((history, idx) => {
                    const employee = employees.find(e => e.id === history.employeeId)
                    const grade = salaryGrades.find(g => g.id === history.salaryGradeId)
                    return (
                      <tr key={history.id}>
                        <td>{idx + 1}</td>
                        <td>{history.employeeId || '-'}</td>
                        <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                        <td>{employee ? (employee.bo_phan || '-') : '-'}</td>
                        <td>{employee ? (employee.vi_tri || '-') : '-'}</td>
                        <td>{grade ? (grade.shift || 'Ca ngày') : '-'}</td>
                        <td>{grade ? `Bậc ${grade.level || 1}` : '-'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {grade ? formatMoney(grade.salary || 0) : '-'}
                        </td>
                        <td>
                          {history.effectiveDate
                            ? new Date(history.effectiveDate).toLocaleDateString('vi-VN')
                            : '-'}
                        </td>
                        <td>{escapeHtml(history.type || history.hinhThuc || '-')}</td>
                        <td>{escapeHtml(history.reason || history.lyDo || '-')}</td>
                        <td>
                          <button
                            className="view"
                            onClick={() => {
                              setSelectedEmployeeForHistory(history)
                              setIsHistoryModalOpen(true)
                            }}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    )
                  })
              ) : (
                <tr>
                  <td colSpan="12" className="empty-state">Chưa có lịch sử thăng tiến</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <SalaryGradeModal
        grade={selectedGrade}
        isOpen={isGradeModalOpen}
        onClose={() => {
          setIsGradeModalOpen(false)
          setSelectedGrade(null)
        }}
        onSave={loadData}
      />

      <EmployeeSalaryModal
        employeeSalary={selectedEmployeeSalary}
        employees={employees}
        salaryGrades={salaryGrades}
        isOpen={isEmployeeSalaryModalOpen}
        onClose={() => {
          setIsEmployeeSalaryModalOpen(false)
          setSelectedEmployeeSalary(null)
        }}
        onSave={loadData}
      />

      {/* Tab 4: Thông tin BHXH */}
      {activeTab === 'insurance' && (
        <div className="card">
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
                insuranceInfo.map((ins, idx) => {
                  const employee = employees.find(e => e.id === ins.employeeId)
                  return (
                    <tr key={ins.id}>
                      <td>{idx + 1}</td>
                      <td>{employee ? (employee.id || '-') : '-'}</td>
                      <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                      <td>{employee ? (employee.bo_phan || '-') : '-'}</td>
                      <td>{ins.soSoBHXH || ins.soSo || '-'}</td>
                      <td>{ins.ngayThamGia || '-'}</td>
                      <td>{formatMoney(ins.mucLuongDong || ins.mucLuong || 0)}</td>
                      <td>{ins.tyLeNLD || ins.tyLeNhanVien || 10.5}%</td>
                      <td>{ins.tyLeDN || ins.tyLeDoanhNghiep || 21.5}%</td>
                      <td>
                        <span className={`badge ${ins.status === 'Đang tham gia' ? 'badge-success' : 'badge-danger'}`}>
                          {ins.status || 'Đang tham gia'}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          {ins.status === 'Đang tham gia' && (
                            <button
                              className="view"
                              title="Xem chi tiết"
                              onClick={() => {
                                setSelectedInsurance(ins)
                                setIsInsuranceReadOnly(true)
                                setIsInsuranceModalOpen(true)
                              }}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          )}
                          <button
                            className="edit"
                            onClick={() => {
                              setSelectedInsurance(ins)
                              setIsInsuranceReadOnly(false)
                              setIsInsuranceModalOpen(true)
                            }}
                          >
                            <i className="fas fa-pencil-alt"></i>
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
      )}

      {activeTab === 'tax' && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>Mã số thuế TNCN</th>
                <th>Thu nhập tính thuế</th>
                <th>Giảm trừ bản thân</th>
                <th>Tổng giảm trừ NPT</th>
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
                  return (
                    <tr key={tax.id}>
                      <td>{idx + 1}</td>
                      <td>{employee ? (employee.id || '-') : '-'}</td>
                      <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                      <td>{tax.maSoThue || tax.mst || '-'}</td>
                      <td>{formatMoney(tax.thuNhapTinhThue || 0)}</td>
                      <td>{formatMoney(tax.giamTruBanThan || 15500000)}</td>
                      <td>{formatMoney(tax.tongGiamTruNguoiPhuThuoc || 0)}</td>
                      <td>{formatMoney(tax.thuNhapChiuThue || 0)}</td>
                      <td>{tax.bieuThue || 'Lũy tiến'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatMoney(tax.thuePhaiNop || 0)}</td>
                      <td>{tax.kyApDung || tax.period || '-'}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="view"
                            title="Xem chi tiết"
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
                            <i className="fas fa-pencil-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="12" className="empty-state">Chưa có thông tin Thuế TNCN</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <SalaryGradeModal
        grade={selectedGrade}
        isOpen={isGradeModalOpen}
        onClose={() => {
          setIsGradeModalOpen(false)
          setSelectedGrade(null)
        }}
        onSave={loadData}
      />

      <EmployeeSalaryModal
        employeeSalary={selectedEmployeeSalary}
        employees={employees}
        salaryGrades={salaryGrades}
        isOpen={isEmployeeSalaryModalOpen}
        onClose={() => {
          setIsEmployeeSalaryModalOpen(false)
          setSelectedEmployeeSalary(null)
        }}
        onSave={loadData}
      />

      <PromotionHistoryModal
        history={selectedEmployeeForHistory}
        employee={selectedEmployeeForHistory ? employees.find(e => e.id === selectedEmployeeForHistory.employeeId) : null}
        promotionHistory={promotionHistory}
        salaryGrades={salaryGrades}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false)
          setSelectedEmployeeForHistory(null)
        }}
      />

      <PromotionModal
        employees={employees}
        salaryGrades={salaryGrades}
        isOpen={isPromotionModalOpen}
        onClose={() => {
          setIsPromotionModalOpen(false)
        }}
        onSave={loadData}
      />

      <InsuranceModal
        insurance={selectedInsurance}
        employees={employees}
        employeeSalaries={employeeSalaries}
        salaryGrades={salaryGrades}
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
        insuranceList={insuranceInfo}
        isOpen={isTaxModalOpen}
        onClose={() => {
          setIsTaxModalOpen(false)
          setSelectedTax(null)
          setIsTaxReadOnly(false)
        }}
        onSave={loadData}
        readOnly={isTaxReadOnly}
      />

      {/* Import Excel Modal for Insurance */}
      {isInsuranceImportModalOpen && (
        <div className="modal show" onClick={() => setIsInsuranceImportModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-file-import"></i>
                Import Thông tin BHXH từ Excel
              </h3>
              <button className="modal-close" onClick={() => setIsInsuranceImportModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Chọn file Excel</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleInsuranceFileSelect}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px', fontSize: '0.9rem' }}>
                <strong>Lưu ý:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  <li>File Excel cần có các cột bắt buộc: <b>Mã NV, Số sổ BHXH, Mức lương đóng BHXH</b></li>
                  <li>Các cột khác: Ngày tham gia, Tỷ lệ NLĐ, Tỷ lệ DN, Trạng thái</li>
                  <li>Mã NV phải tồn tại trong hệ thống</li>
                  <li>Tải file Excel mẫu để xem định dạng chuẩn</li>
                </ul>
              </div>

              {insuranceImportPreviewData.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4>Preview dữ liệu ({insuranceImportPreviewData.length} nhân viên)</h4>
                  <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                        <tr>
                          <th>STT</th>
                          <th>Mã NV</th>
                          <th>Họ tên</th>
                          <th>Bộ phận</th>
                          <th>Số sổ BHXH</th>
                          <th>Mức lương đóng</th>
                          <th>Tỷ lệ NLĐ</th>
                          <th>Tỷ lệ DN</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insuranceImportPreviewData.map((item, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{item.employeeId}</td>
                            <td>{item.employeeName}</td>
                            <td>{item.department}</td>
                            <td>{item.soSoBHXH}</td>
                            <td>{formatMoney(item.mucLuongDong)}</td>
                            <td>{item.tyLeNLD}%</td>
                            <td>{item.tyLeDN}%</td>
                            <td>{item.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsInsuranceImportModalOpen(false)
                    setInsuranceImportFile(null)
                    setInsuranceImportPreviewData([])
                  }}
                  disabled={isInsuranceImporting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmInsuranceImport}
                  disabled={isInsuranceImporting || insuranceImportPreviewData.length === 0}
                >
                  {isInsuranceImporting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Đang import...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Xác nhận Import ({insuranceImportPreviewData.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal for Tax */}
      {isTaxImportModalOpen && (
        <div className="modal show" onClick={() => setIsTaxImportModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-file-import"></i>
                Import Thuế TNCN từ Excel
              </h3>
              <button className="modal-close" onClick={() => setIsTaxImportModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Chọn file Excel</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleTaxFileSelect}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px', fontSize: '0.9rem' }}>
                <strong>Lưu ý:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  <li>File Excel cần có các cột bắt buộc: <b>Mã NV, Thu nhập tính thuế</b></li>
                  <li>Các cột khác: Mã số thuế TNCN, Giảm trừ bản thân, Biểu thuế, Kỳ áp dụng</li>
                  <li>Mã NV phải tồn tại trong hệ thống</li>
                  <li>Hệ thống sẽ tự động tính thuế dựa trên người phụ thuộc và BHXH</li>
                  <li>Tải file Excel mẫu để xem định dạng chuẩn</li>
                </ul>
              </div>

              {taxImportPreviewData.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4>Preview dữ liệu ({taxImportPreviewData.length} nhân viên)</h4>
                  <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                        <tr>
                          <th>STT</th>
                          <th>Mã NV</th>
                          <th>Họ tên</th>
                          <th>Bộ phận</th>
                          <th>MST</th>
                          <th>Thu nhập</th>
                          <th>Giảm trừ BT</th>
                          <th>Biểu thuế</th>
                          <th>Kỳ áp dụng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxImportPreviewData.map((item, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{item.employeeId}</td>
                            <td>{item.employeeName}</td>
                            <td>{item.department}</td>
                            <td>{item.maSoThue}</td>
                            <td>{formatMoney(item.thuNhapTinhThue)}</td>
                            <td>{formatMoney(item.giamTruBanThan)}</td>
                            <td>{item.bieuThue}</td>
                            <td>{item.kyApDung}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsTaxImportModalOpen(false)
                    setTaxImportFile(null)
                    setTaxImportPreviewData([])
                  }}
                  disabled={isTaxImporting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmTaxImport}
                  disabled={isTaxImporting || taxImportPreviewData.length === 0}
                >
                  {isTaxImporting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Đang import...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Xác nhận Import ({taxImportPreviewData.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Salary
