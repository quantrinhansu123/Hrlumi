import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import EmployeeKPIModal from '../components/EmployeeKPIModal'
import KPIConversionModal from '../components/KPIConversionModal'
import KPIResultDetailModal from '../components/KPIResultDetailModal'
import KPIResultImportModal from '../components/KPIResultImportModal'
import KPITemplateModal from '../components/KPITemplateModal'
import SeedKPIDataButton from '../components/SeedKPIDataButton'
import { fbDelete, fbGet, fbPush } from '../services/firebase'
import { escapeHtml, formatMoney } from '../utils/helpers'

function KPI() {
  const [activeTab, setActiveTab] = useState('assignment')
  const [kpiTemplates, setKpiTemplates] = useState([])
  const [employeeKPIs, setEmployeeKPIs] = useState([])
  const [kpiConversions, setKpiConversions] = useState([])
  const [kpiResults, setKpiResults] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isEmployeeKPIModalOpen, setIsEmployeeKPIModalOpen] = useState(false)
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isAssignmentViewOpen, setIsAssignmentViewOpen] = useState(false)
  const [isResultImportModalOpen, setIsResultImportModalOpen] = useState(false)
  const [isResultDetailModalOpen, setIsResultDetailModalOpen] = useState(false)
  const [isResultEditing, setIsResultEditing] = useState(false)

  // Selected items
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isTemplateReadOnly, setIsTemplateReadOnly] = useState(false) // NEW State
  const [selectedEmployeeKPI, setSelectedEmployeeKPI] = useState(null)
  const [targetedKPIId, setTargetedKPIId] = useState(null) // NEW: For single KPI edit
  const [selectedKPIForConversion, setSelectedKPIForConversion] = useState(null)
  const [selectedResultForDetail, setSelectedResultForDetail] = useState(null)
  const [selectedEmployeeKPIView, setSelectedEmployeeKPIView] = useState(null)

  // Filters
  const [filterDept, setFilterDept] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterResultDept, setFilterResultDept] = useState('')
  const [filterResultMonth, setFilterResultMonth] = useState('')

  // Excel Import states for KPI Templates (Bảng 1)
  const [isTemplateImportModalOpen, setIsTemplateImportModalOpen] = useState(false)
  const [templateImportPreviewData, setTemplateImportPreviewData] = useState([])
  const [isTemplateImporting, setIsTemplateImporting] = useState(false)

  // Excel Import states for Employee KPIs (Bảng 2)
  const [isEmployeeKPIImportModalOpen, setIsEmployeeKPIImportModalOpen] = useState(false)
  const [employeeKPIImportPreviewData, setEmployeeKPIImportPreviewData] = useState([])
  const [isEmployeeKPIImporting, setIsEmployeeKPIImporting] = useState(false)

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

      // Load KPI data
      const hrData = await fbGet('hr')
      const templates = hrData?.kpiTemplates ? Object.entries(hrData.kpiTemplates).map(([k, v]) => ({ ...v, id: k })) : []
      setKpiTemplates(templates)

      const empKPIs = hrData?.employeeKPIs ? Object.entries(hrData.employeeKPIs).map(([k, v]) => ({ ...v, id: k })) : []
      setEmployeeKPIs(empKPIs)

      const conversions = hrData?.kpiConversions ? Object.entries(hrData.kpiConversions).map(([k, v]) => ({ ...v, id: k })) : []
      setKpiConversions(conversions)

      const results = hrData?.kpiResults ? Object.entries(hrData.kpiResults).map(([k, v]) => ({ ...v, id: k })) : []
      setKpiResults(results)

      setLoading(false)
    } catch (error) {
      console.error('Error loading KPI data:', error)
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa KPI này?')) return
    try {
      await fbDelete(`hr/kpiTemplates/${id}`)
      loadData()
      alert('Đã xóa KPI')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  // --- KPI Catalog Excel Functions ---
  const exportKPITemplatesToExcel = () => {
    if (kpiTemplates.length === 0) {
      alert('Không có dữ liệu để xuất!')
      return
    }
    const data = kpiTemplates.map((t, idx) => ({
      'STT': idx + 1,
      'Mã KPI': t.code || t.id || '',
      'Tên KPI': t.name || '',
      'Đơn vị đo': t.unit || t.donVi || '',
      'Đối tượng áp dụng': t.target || t.doiTuong || '',
      'Trọng số (%)': t.weight || 0,
      'Tháng áp dụng': t.month || '',
      'Trạng thái': t.status || 'Đang áp dụng'
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DanhMucKPI')
    XLSX.writeFile(wb, `DanhMucKPI_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const downloadKPITemplateFile = () => {
    const data = [
      ['Mã KPI', 'Tên KPI', 'Đơn vị đo', 'Đối tượng áp dụng', 'Trọng số (%)', 'Tháng áp dụng (YYYY-MM)', 'Trạng thái'],
      ['KPI01', 'Doanh số cá nhân', 'VNĐ', 'Nhân viên kinh doanh', 60, '2024-10', 'Đang áp dụng'],
      ['KPI02', 'Tỷ lệ khách hàng quay lại', '%', 'Bộ phận CSKH', 40, '2024-10', 'Đang áp dụng']
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MauImportKPI')
    XLSX.writeFile(wb, 'Mau_import_danh_muc_KPI.xlsx')
  }

  const handleDeleteEmployeeKPI = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa KPI của nhân viên này?')) return
    try {
      await fbDelete(`hr/employeeKPIs/${id}`)
      loadData()
      alert('Đã xóa KPI nhân viên')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  // --- KPI Assignment Excel Functions ---
  const exportEmployeeKPIsToExcel = () => {
    if (employeeKPIs.length === 0) {
      alert('Không có dữ liệu để xuất!')
      return
    }
    const data = employeeKPIs.map((empKPI, idx) => {
      const employee = employees.find(e => e.id === empKPI.employeeId)
      const row = {
        'STT': idx + 1,
        'Mã NV': empKPI.employeeId,
        'Họ và tên': employee ? (employee.ho_va_ten || employee.name) : '-',
        'Tháng': empKPI.month || '',
        'Trạng thái': empKPI.status || 'Chưa chốt',
      }
      // Add KPI columns
      kpiTemplates.forEach(t => {
        const val = empKPI.kpiValues?.[t.id] || empKPI.kpiValues?.[t.code]
        row[t.code || t.id] = val ? val.target : ''
      })
      return row
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'GiaoKPI')
    XLSX.writeFile(wb, `GiaoKPI_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const downloadEmployeeKPITemplate = () => {
    const header = ['Mã NV', 'Tháng (YYYY-MM)', 'Trạng thái']
    // Add all KPI codes to header
    kpiTemplates.forEach(t => {
      header.push(t.code || t.id)
    })
    const sample = ['NV001', '2024-10', 'Chưa chốt']
    kpiTemplates.forEach(() => sample.push(100))

    const data = [header, sample]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MauGiaoKPI')
    XLSX.writeFile(wb, 'Mau_giao_kpi_nhan_vien.xlsx')
  }
  const handleTemplateFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsTemplateImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      if (jsonData.length < 2) {
        alert('File Excel không có dữ liệu')
        setIsTemplateImporting(false)
        return
      }
      const headers = Array.from(jsonData[0] || []).map(h => String(h || '').toLowerCase().trim())
      const codeIdx = headers.findIndex(h => h.includes('mã') && h.includes('kpi') || h.includes('code'))
      const nameIdx = headers.findIndex(h => (h.includes('tên') || h.includes('ten')) && h.includes('kpi') || h === 'name')
      const unitIdx = headers.findIndex(h => h.includes('đơn vị') || h.includes('don vi') || h === 'unit')
      const targetIdx = headers.findIndex(h => h.includes('đối tượng') || h.includes('doi tuong') || h === 'target')
      const weightIdx = headers.findIndex(h => h.includes('trọng số') || h.includes('trong so') || h === 'weight')
      const monthIdx = headers.findIndex(h => h.includes('tháng') || h.includes('thang') || h === 'month')
      const statusIdx = headers.findIndex(h => h.includes('trạng thái') || h.includes('trang thai') || h === 'status')
      if (codeIdx === -1 || nameIdx === -1) {
        alert('File Excel cần có các cột: Mã KPI, Tên KPI')
        setIsTemplateImporting(false)
        return
      }
      const parsedData = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row[codeIdx] || !row[nameIdx]) continue
        parsedData.push({
          code: row[codeIdx] || '',
          name: row[nameIdx] || '',
          unit: unitIdx !== -1 ? (row[unitIdx] || '') : '',
          target: targetIdx !== -1 ? (row[targetIdx] || '') : '',
          weight: weightIdx !== -1 ? Number(row[weightIdx]) || 0 : 0,
          month: monthIdx !== -1 ? (row[monthIdx] || '') : '',
          status: statusIdx !== -1 ? (row[statusIdx] || 'Đang áp dụng') : 'Đang áp dụng'
        })
      }
      setTemplateImportPreviewData(parsedData)
      setIsTemplateImporting(false)
    } catch (error) {
      alert('Lỗi khi đọc file: ' + error.message)
      setIsTemplateImporting(false)
    }
  }
  const handleConfirmTemplateImport = async () => {
    if (templateImportPreviewData.length === 0) {
      alert('Không có dữ liệu để import')
      return
    }
    setIsTemplateImporting(true)
    try {
      let successCount = 0
      for (const template of templateImportPreviewData) {
        await fbPush('hr/kpiTemplates', template)
        successCount++
      }
      alert(`Đã import thành công ${successCount} KPI`)
      setIsTemplateImportModalOpen(false)
      setTemplateImportPreviewData([])
      await loadData()
    } catch (error) {
      alert('Lỗi khi import: ' + error.message)
    } finally {
      setIsTemplateImporting(false)
    }
  }
  const handleEmployeeKPIFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsEmployeeKPIImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      if (jsonData.length < 2) {
        alert('File Excel không có dữ liệu')
        setIsEmployeeKPIImporting(false)
        return
      }
      const headers = Array.from(jsonData[0] || []).map(h => String(h || '').toLowerCase().trim())
      const empIdIdx = headers.findIndex(h => (h.includes('mã') && h.includes('nv')) || h.includes('employeeid'))
      const monthIdx = headers.findIndex(h => h.includes('tháng') || h.includes('thang') || h === 'month')
      const statusIdx = headers.findIndex(h => h.includes('trạng thái') || h.includes('trang thai') || h === 'status')
      if (empIdIdx === -1) {
        alert('File Excel cần có cột: Mã NV')
        setIsEmployeeKPIImporting(false)
        return
      }
      const kpiColumns = []
      kpiTemplates.forEach(template => {
        const kpiCode = (template.code || template.id || '').toLowerCase()
        const idx = headers.findIndex(h => h.includes(kpiCode))
        if (idx !== -1) {
          kpiColumns.push({ kpiId: template.id, kpiCode: template.code, columnIndex: idx })
        }
      })
      const parsedData = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row[empIdIdx]) continue
        const empId = String(row[empIdIdx]).trim()
        const employee = employees.find(e => e.id === empId)
        if (!employee) {
          console.warn(`Không tìm thấy nhân viên với mã: ${empId}`)
          continue
        }
        const kpiValues = {}
        kpiColumns.forEach(kpiCol => {
          const value = row[kpiCol.columnIndex]
          if (value !== undefined && value !== null && value !== '') {
            kpiValues[kpiCol.kpiId] = {
              kpiId: kpiCol.kpiId,
              target: Number(value) || value,
              weight: kpiTemplates.find(t => t.id === kpiCol.kpiId)?.weight || 0
            }
          }
        })
        parsedData.push({
          employeeId: empId,
          employeeName: employee.ho_va_ten || employee.name || '',
          department: employee.bo_phan || '',
          month: monthIdx !== -1 ? (row[monthIdx] || '') : '',
          status: statusIdx !== -1 ? (row[statusIdx] || 'Chưa chốt') : 'Chưa chốt',
          kpiValues
        })
      }
      setEmployeeKPIImportPreviewData(parsedData)
      setIsEmployeeKPIImporting(false)
    } catch (error) {
      alert('Lỗi khi đọc file: ' + error.message)
      setIsEmployeeKPIImporting(false)
    }
  }
  const handleConfirmEmployeeKPIImport = async () => {
    if (employeeKPIImportPreviewData.length === 0) {
      alert('Không có dữ liệu để import')
      return
    }
    setIsEmployeeKPIImporting(true)
    try {
      let successCount = 0
      for (const empKPI of employeeKPIImportPreviewData) {
        const { employeeName, department, ...dataToSave } = empKPI
        await fbPush('hr/employeeKPIs', dataToSave)
        successCount++
      }
      alert(`Đã import thành công ${successCount} KPI nhân viên`)
      setIsEmployeeKPIImportModalOpen(false)
      setEmployeeKPIImportPreviewData([])
      await loadData()
    } catch (error) {
      alert('Lỗi khi import: ' + error.message)
    } finally {
      setIsEmployeeKPIImporting(false)
    }
  }
  // --- KPI Results Excel Functions ---
  const exportKPIResultsToExcel = () => {
    if (kpiResults.length === 0) {
      alert('Không có dữ liệu để xuất!')
      return
    }
    const data = kpiResults.map((result, idx) => {
      const employee = employees.find(e => e.id === result.employeeId)
      const row = {
        'STT': idx + 1,
        'Mã NV': employee ? (employee.ma_nhan_vien || employee.employeeCode) : result.employeeId,
        'Họ và tên': employee ? (employee.ho_va_ten || employee.name) : '-',
        'Tháng': result.month || '',
        'KPI tổng (%)': (result.totalKPI || result.kpiTong || 0).toFixed(1) + '%'
      }
      kpiTemplates.forEach(t => {
        const kpiRes = result.kpiResults?.[t.id] || result.kpiResults?.[t.code]
        row[t.code || t.id + ' (Thực tế)'] = kpiRes ? kpiRes.actual : ''
        row[t.code || t.id + ' (% Quy đổi)'] = kpiRes ? kpiRes.conversionPercent + '%' : ''
      })
      return row
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'KetQuaKPI')
    XLSX.writeFile(wb, `KetQuaKPI_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const downloadKPIResultTemplate = () => {
    const header = ['Mã NV', 'Tháng (YYYY-MM)']
    kpiTemplates.forEach(t => {
      header.push(t.code || t.id)
    })
    const sample = ['NV001', '2024-10']
    kpiTemplates.forEach(() => sample.push(50000000)) // Sample value

    const data = [header, sample]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MauKetQuaKPI')
    XLSX.writeFile(wb, 'Mau_import_ket_qua_KPI.xlsx')
  }

  // Get employee name
  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId)
    return emp ? (emp.ho_va_ten || emp.name || 'N/A') : employeeId || 'N/A'
  }

  // Get KPI template by ID
  const getKPITemplate = (kpiId) => {
    return kpiTemplates.find(k => k.id === kpiId || k.code === kpiId)
  }

  // Calculate total weight for employee KPI
  const calculateTotalWeight = (employeeKPI) => {
    if (!employeeKPI.kpiValues) return 0
    return Object.values(employeeKPI.kpiValues).reduce((sum, kpi) => {
      const template = getKPITemplate(kpi.kpiId)
      const weight = template?.weight || kpi.weight || 0
      return sum + Number(weight)
    }, 0)
  }

  // Filter employee KPIs
  const filteredEmployeeKPIs = employeeKPIs.filter(empKPI => {
    if (filterDept) {
      const emp = employees.find(e => e.id === empKPI.employeeId)
      if (emp && emp.bo_phan !== filterDept && emp.department !== filterDept) return false
    }
    if (filterMonth && empKPI.month !== filterMonth) return false
    return true
  })

  // Filter KPI results
  const filteredResults = kpiResults.filter(result => {
    if (filterResultDept && result.department !== filterResultDept) return false
    if (filterResultMonth && result.month !== filterResultMonth) return false
    return true
  })

  // Calculate department summary
  const getDepartmentSummary = () => {
    const summary = {}
    filteredResults.forEach(result => {
      const dept = result.department || 'Khác'
      if (!summary[dept]) {
        summary[dept] = {
          department: dept,
          totalEmployees: 0,
          achieved: 0,
          exceeded: 0,
          notAchieved: 0,
          totalScore: 0,
          count: 0
        }
      }
      summary[dept].totalEmployees++
      summary[dept].count++
      const totalKPI = result.totalKPI || result.kpiTong || 0
      summary[dept].totalScore += totalKPI

      if (totalKPI >= 100) {
        summary[dept].exceeded++
      } else if (totalKPI >= 80) {
        summary[dept].achieved++
      } else {
        summary[dept].notAchieved++
      }
    })

    return Object.values(summary).map(dept => ({
      ...dept,
      avgScore: dept.count > 0 ? (dept.totalScore / dept.count).toFixed(1) : 0,
      achievedPercent: dept.totalEmployees > 0 ? ((dept.achieved / dept.totalEmployees) * 100).toFixed(0) : 0,
      exceededPercent: dept.totalEmployees > 0 ? ((dept.exceeded / dept.totalEmployees) * 100).toFixed(0) : 0,
      notAchievedPercent: dept.totalEmployees > 0 ? ((dept.notAchieved / dept.totalEmployees) * 100).toFixed(0) : 0,
      note: dept.avgScore >= 100 ? 'Hiệu suất tốt' : dept.avgScore >= 80 ? 'Đạt yêu cầu' : 'Cần cải thiện'
    }))
  }

  if (loading) {
    return <div className="loadingState">Đang tải dữ liệu...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-bullseye"></i>
          Giao KPI & Đánh giá KPI
        </h1>
        {activeTab === 'assignment' && (
          <>

            <SeedKPIDataButton onComplete={loadData} />

          </>
        )}

        {activeTab === 'results' && (
          <>
            <button
              className="btn btn-info"
              onClick={() => {
                setFilterResultDept('')
                setFilterResultMonth('')
              }}
            >
              <i className="fas fa-filter"></i>
              Xóa bộ lọc
            </button>
            <button
              className="btn"
              onClick={exportKPIResultsToExcel}
              style={{
                marginLeft: '10px',
                background: '#28a745',
                borderColor: '#28a745',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <i className="fas fa-file-excel"></i> Xuất Excel
            </button>
            <button
              className="btn btn-info"
              onClick={downloadKPIResultTemplate}
              style={{ marginLeft: '10px' }}
            >
              <i className="fas fa-download"></i> Tải mẫu
            </button>
            <button
              className="btn"
              onClick={() => setIsResultImportModalOpen(true)}
              style={{
                marginLeft: '10px',
                background: '#6f42c1',
                borderColor: '#6f42c1',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <i className="fas fa-upload"></i>
              Import Kết quả (Excel)
            </button>
          </>
        )}
      </div>

      <div className="tabs">
        <div
          className={`tab ${activeTab === 'assignment' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignment')}
        >
          📋 Giao KPI
        </div>
        <div
          className={`tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          📊 Đánh giá KPI
        </div>
      </div>

      {/* Tab 1: Giao KPI */}
      {activeTab === 'assignment' && (
        <>
          {/* Bảng 1: Quản lý danh mục KPI */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Bảng 1: Quản lý danh mục KPI</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedTemplate(null)
                    setIsTemplateModalOpen(true)
                  }}
                >
                  <i className="fas fa-plus"></i>
                  Thêm danh mục KPI
                </button>
                <button
                  className="btn"
                  onClick={exportKPITemplatesToExcel}
                  style={{
                    background: '#28a745',
                    borderColor: '#28a745',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <i className="fas fa-file-excel"></i> Xuất Excel
                </button>
                <button
                  className="btn btn-info"
                  onClick={downloadKPITemplateFile}
                >
                  <i className="fas fa-download"></i> Tải mẫu
                </button>
                <button
                  className="btn"
                  onClick={() => setIsTemplateImportModalOpen(true)}
                  style={{
                    background: '#6f42c1',
                    borderColor: '#6f42c1',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Import Excel"
                >
                  <i className="fas fa-file-import"></i>
                  Import Excel
                </button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã KPI</th>
                  <th>Tên KPI</th>
                  <th>Đơn vị đo</th>
                  <th>Đối tượng áp dụng</th>
                  <th>Trọng số (%)</th>
                  <th>Tháng áp dụng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {kpiTemplates.length > 0 ? (
                  kpiTemplates.map((template, idx) => (
                    <tr key={template.id}>
                      <td>{idx + 1}</td>
                      <td>{escapeHtml(template.code || template.id || '-')}</td>
                      <td>{escapeHtml(template.name || '-')}</td>
                      <td>{escapeHtml(template.unit || template.donVi || '-')}</td>
                      <td>{escapeHtml(template.target || template.doiTuong || '-')}</td>
                      <td>{template.weight || template.trongSo || 0}%</td>
                      <td>{template.month ? new Date(template.month).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>
                        <span className={`badge ${template.status === 'Đang áp dụng' ? 'badge-success' : 'badge-danger'}`}>
                          {escapeHtml(template.status || 'Đang áp dụng')}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="view"
                            onClick={() => {
                              setSelectedTemplate(template)
                              setIsTemplateReadOnly(true)
                              setIsTemplateModalOpen(true)
                            }}
                            title="Xem chi tiết"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="edit"
                            onClick={() => {
                              setSelectedTemplate(template)
                              setIsTemplateReadOnly(false)
                              setIsTemplateModalOpen(true)
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="delete"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="empty-state">Chưa có danh mục KPI</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bảng 2: Nhập KPI cho từng cá nhân */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Bảng 2: Nhập KPI cho từng cá nhân</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedEmployeeKPI(null)
                    setIsEmployeeKPIModalOpen(true)
                  }}
                  style={{ marginTop: '-20px' }}
                >
                  <i className="fas fa-plus"></i>
                  Gán KPI
                </button>
                <button
                  className="btn"
                  onClick={exportEmployeeKPIsToExcel}
                  style={{
                    marginTop: '-20px',
                    background: '#28a745',
                    borderColor: '#28a745',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <i className="fas fa-file-excel"></i> Xuất Excel
                </button>
                <button
                  className="btn btn-info"
                  onClick={downloadEmployeeKPITemplate}
                  style={{ marginTop: '-20px' }}
                >
                  <i className="fas fa-download"></i> Tải mẫu
                </button>
                <button
                  className="btn"
                  onClick={() => setIsEmployeeKPIImportModalOpen(true)}
                  style={{
                    marginTop: '-20px',
                    background: '#6f42c1',
                    borderColor: '#6f42c1',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Import Excel"
                >
                  <i className="fas fa-file-import"></i>
                  Import Excel
                </button>
                <div className="search-box" style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px' }}
                  >
                    <option value="">Tất cả bộ phận</option>
                    {[...new Set(employees.map(e => e.bo_phan || e.department).filter(Boolean))].sort().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px' }}
                  >
                    <option value="">Tất cả tháng</option>
                    {[...new Set(employeeKPIs.map(e => e.month).filter(Boolean))].sort().map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {(() => {
                // Calculate max KPI count to expand columns dynamically
                const maxKpiCount = 3

                return (
                  <table>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Họ và tên</th>
                        <th>Ca</th>
                        <th>Vị trí</th>
                        {Array.from({ length: maxKpiCount }).map((_, i) => (
                          <React.Fragment key={i}>
                            <th>Mã KPI {i + 1}</th>
                            <th>KPI {i + 1}</th>
                          </React.Fragment>
                        ))}
                        <th>Tổng trọng số</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployeeKPIs.length > 0 ? (
                        filteredEmployeeKPIs.map((empKPI, idx) => {
                          const employee = employees.find(e => e.id === empKPI.employeeId)
                          const totalWeight = calculateTotalWeight(empKPI)

                          // Get assigned KPIs as array [ {id, val}, ... ]
                          const assignedKPIs = Object.entries(empKPI.kpiValues || {}).map(([kId, val]) => {
                            const template = kpiTemplates.find(t => t.id === kId || t.code === kId)
                            return {
                              id: kId,
                              code: template ? (template.code || template.id) : kId,
                              ...val
                            }
                          })

                          return (
                            <tr key={empKPI.id}>
                              <td>{idx + 1}</td>
                              <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                              <td>{employee ? (employee.shift || 'Ngày') : '-'}</td>
                              <td>{employee ? (employee.vi_tri || '-') : '-'}</td>

                              {Array.from({ length: maxKpiCount }).map((_, i) => {
                                const kpi = assignedKPIs[i]
                                return (
                                  <React.Fragment key={i}>
                                    <td>{kpi ? escapeHtml(kpi.code) : ''}</td>
                                    <td>
                                      {kpi ? (
                                        <span
                                          style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
                                          onClick={() => {
                                            setSelectedEmployeeKPI(empKPI)
                                            setTargetedKPIId(kpi.id)
                                            setIsEmployeeKPIModalOpen(true)
                                          }}
                                        >
                                          Nhập
                                        </span>
                                      ) : ''}
                                    </td>
                                  </React.Fragment>
                                )
                              })}

                              <td>{totalWeight}%</td>
                              <td>
                                <span className={`badge ${empKPI.status === 'Đã giao' ? 'badge-success' :
                                  empKPI.status === 'Chưa chốt' ? 'badge-warning' :
                                    'badge-secondary'
                                  }`}>
                                  {escapeHtml(empKPI.status || 'Chưa chốt')}
                                </span>
                              </td>
                              <td>
                                <div className="actions">
                                  <button
                                    className="edit"
                                    onClick={() => {
                                      setSelectedEmployeeKPI(empKPI)
                                      setIsEmployeeKPIModalOpen(true)
                                    }}
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  {empKPI.status === 'Đã giao' && (
                                    <button
                                      className="view"
                                      onClick={() => {
                                        console.log('Viewing KPI:', empKPI)
                                        setSelectedEmployeeKPIView(empKPI)
                                        setIsAssignmentViewOpen(true)
                                      }}
                                      title="Xem chi tiết"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7 + maxKpiCount * 2} className="empty-state">
                            Chưa có KPI cho nhân viên
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>

          {/* Bảng 3: Khai báo tỷ lệ quy đổi */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bảng 3: Khai báo tỷ lệ quy đổi cho từng mã KPI</h3>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const template = kpiTemplates.find(t => t.id === e.target.value || t.code === e.target.value)
                    if (template) {
                      setSelectedKPIForConversion(template)
                      setIsConversionModalOpen(true)
                    }
                    e.target.value = ''
                  }
                }}
                style={{ padding: '8px', borderRadius: '4px' }}
              >
                <option value="">Chọn Mã KPI để khai báo</option>
                {kpiTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.code || t.id}</option>
                ))}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Mã KPI</th>
                    <th>STT</th>
                    <th>Tỷ lệ hoàn thành KPI từ</th>
                    <th>Tỷ lệ hoàn thành KPI đến</th>
                    <th>% Quy đổi KPI</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiTemplates.length > 0 ? (
                    kpiTemplates.map(template => {
                      const conversions = kpiConversions.filter(c => c.kpiId === template.id || c.kpiCode === template.code)
                      if (conversions.length === 0) {
                        return (
                          <tr key={template.id}>
                            <td>{escapeHtml(template.code || template.id)}</td>
                            <td colSpan="5" className="empty-state">Chưa có tỷ lệ quy đổi</td>
                          </tr>
                        )
                      }
                      return conversions.map((conv, idx) => (
                        <tr key={conv.id}>
                          {idx === 0 && <td rowSpan={conversions.length}>{escapeHtml(template.code || template.id)}</td>}
                          <td>{idx + 1}</td>
                          <td>{conv.fromPercent || 0}%</td>
                          <td>{conv.toPercent === null || conv.toPercent === undefined ? '100%+' : `${conv.toPercent}%`}</td>
                          <td>{conv.conversionPercent || 0}%</td>
                          <td>
                            <button
                              className="edit"
                              onClick={() => {
                                setSelectedKPIForConversion(template)
                                setIsConversionModalOpen(true)
                              }}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-state">Chưa có KPI để hiển thị tỷ lệ quy đổi</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bảng 3: Báo cáo tổng hợp theo bộ phận */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bảng 3: Báo cáo tổng hợp theo bộ phận</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Bộ phận</th>
                  <th>Số nhân sự</th>
                  <th>% Đạt KPI</th>
                  <th>% Vượt KPI</th>
                  <th>% Không đạt</th>
                  <th>Điểm KPI TB</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {getDepartmentSummary().length > 0 ? (
                  getDepartmentSummary().map((dept, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{dept.department}</td>
                      <td>{dept.totalEmployees}</td>
                      <td>{dept.achievedPercent}%</td>
                      <td>{dept.exceededPercent}%</td>
                      <td>{dept.notAchievedPercent}%</td>
                      <td style={{ fontWeight: 'bold' }}>{dept.avgScore}%</td>
                      <td>
                        <span className={`badge ${dept.avgScore >= 100 ? 'badge-success' : dept.avgScore >= 80 ? 'badge-info' : 'badge-warning'}`}>
                          {dept.note}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="8" className="empty-state">Chưa có dữ liệu đánh giá</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab 2: Đánh giá KPI */}
      {activeTab === 'results' && (
        <>
          {/* Bảng 1: Kết quả hoàn thành và quy đổi KPI */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3 className="card-title">Bảng 1: Kết quả hoàn thành và quy đổi KPI</h3>
              <div className="search-box" style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={filterResultDept}
                  onChange={(e) => setFilterResultDept(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px' }}
                >
                  <option value="">Tất cả bộ phận</option>
                  {[...new Set(kpiResults.map(r => r.department).filter(Boolean))].sort().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <select
                  value={filterResultMonth}
                  onChange={(e) => setFilterResultMonth(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px' }}
                >
                  <option value="">Tất cả tháng</option>
                  {[...new Set(kpiResults.map(r => r.month).filter(Boolean))].sort().map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: '13px', minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Mã NV</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Họ và tên</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Bộ phận</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Vị trí</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Ca</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Tháng</th>
                    {/* Generic Headers matching Table 2 structure */}
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <th key={`h-kpi-${idx}`} style={{ whiteSpace: 'nowrap' }}>KPI {idx + 1}</th>
                    ))}
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <th key={`h-conv-${idx}`} style={{ whiteSpace: 'nowrap' }}>% Quy đổi KPI {idx + 1}</th>
                    ))}
                    <th style={{ whiteSpace: 'nowrap' }}>KPI tổng (%)</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length > 0 ? (
                    filteredResults.map((result, idx) => {
                      const employee = employees.find(e => e.id === result.employeeId)
                      const totalKPI = result.totalKPI || result.kpiTong || 0

                      // Find Assignment Record (Table 2) for this employee/month
                      // This defines what "KPI 1", "KPI 2" etc. means for this person.
                      const assignment = employeeKPIs.find(e =>
                        e.employeeId === result.employeeId && e.month === result.month
                      )

                      // Get assigned KPIs list exactly as Table 2 does
                      const assignedKPIs = assignment
                        ? Object.entries(assignment.kpiValues || {}).map(([kId, val]) => {
                          const template = kpiTemplates.find(t => t.id === kId || t.code === kId)
                          return {
                            id: kId,
                            code: template ? (template.code || template.id) : kId,
                            name: template ? template.name : '',
                            unit: template ? template.unit : '',
                            ...val
                          }
                        })
                        : [] // No assignment found?

                      // Ensure we check up to 3 slots

                      return (
                        <tr key={result.id}>
                          <td>{idx + 1}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{employee ? (employee.ma_nhan_vien || employee.employeeCode || employee.code || '-') : '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{escapeHtml(result.department || '-')}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{employee ? (employee.vi_tri || '-') : '-'}</td>
                          <td>{employee ? (employee.shift || 'Ngày') : '-'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{escapeHtml(result.month || '-')}</td>

                          {/* Render Actuals based on Assignment Slots */}
                          {Array.from({ length: 3 }).map((_, i) => {
                            const kpi = assignedKPIs[i] // The KPI assigned at this slot
                            // Get the Result for this specific KPI
                            // The result object stores keys by TemplateID
                            const kpiResult = kpi ? (result.kpiResults?.[kpi.id] || result.kpiResults?.[kpi.code]) : null

                            return (
                              <td key={`val-${i}`} style={{ whiteSpace: 'nowrap' }}>
                                {kpiResult?.actual !== undefined ? (
                                  kpi.unit === 'VNĐ' || kpi.unit === 'VND'
                                    ? formatMoney(kpiResult.actual)
                                    : kpiResult.actual
                                ) : '-'}
                              </td>
                            )
                          })}

                          {/* Render Conversions based on Assignment Slots */}
                          {Array.from({ length: 3 }).map((_, i) => {
                            const kpi = assignedKPIs[i]
                            const kpiResult = kpi ? (result.kpiResults?.[kpi.id] || result.kpiResults?.[kpi.code]) : null

                            return (
                              <td key={`conv-${i}`} style={{ whiteSpace: 'nowrap' }}>
                                {kpiResult?.conversionPercent !== undefined ? `${kpiResult.conversionPercent}%` : '-'}
                              </td>
                            )
                          })}

                          <td style={{ fontWeight: 'bold', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{totalKPI.toFixed(1)}%</td>
                          <td>
                            <div className="actions">
                              <button
                                className="view"
                                onClick={() => {
                                  setSelectedResultForDetail(result)
                                  setIsResultEditing(false)
                                  setIsResultDetailModalOpen(true)
                                }}
                                title="Xem chi tiết"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="edit"
                                onClick={() => {
                                  setSelectedResultForDetail(result)
                                  setIsResultEditing(true)
                                  setIsResultDetailModalOpen(true)
                                }}
                                title="Sửa kết quả"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="delete"
                                onClick={async () => {
                                  if (confirm('Bạn có chắc muốn xóa kết quả đánh giá này?')) {
                                    try {
                                      await fbDelete(`hr/kpiResults/${result.id}`)
                                      loadData()
                                    } catch (error) {
                                      alert('Lỗi khi xóa: ' + error.message)
                                    }
                                  }
                                }}
                                title="Xóa kết quả"
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
                      <td colSpan={12 + kpiTemplates.filter(t => t.status === 'Đang áp dụng').length * 2} className="empty-state">
                        Chưa có kết quả KPI
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>



          {/* Bảng 3: Báo cáo tổng hợp theo bộ phận */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bảng 3: Báo cáo tổng hợp theo bộ phận</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Bộ phận</th>
                  <th>Số nhân sự</th>
                  <th>% Đạt KPI</th>
                  <th>% Vượt KPI</th>
                  <th>% Không đạt</th>
                  <th>Điểm KPI TB</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {getDepartmentSummary().length > 0 ? (
                  getDepartmentSummary().map((dept, idx) => (
                    <tr key={dept.department}>
                      <td>{idx + 1}</td>
                      <td>{escapeHtml(dept.department)}</td>
                      <td>{dept.totalEmployees}</td>
                      <td>{dept.achievedPercent}%</td>
                      <td>{dept.exceededPercent}%</td>
                      <td>{dept.notAchievedPercent}%</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{dept.avgScore}%</td>
                      <td>{escapeHtml(dept.note)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-state">Chưa có dữ liệu báo cáo</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div >
        </>
      )}

      {/* Modals */}
      <KPITemplateModal
        template={selectedTemplate}
        isOpen={isTemplateModalOpen}
        readOnly={isTemplateReadOnly}
        onClose={() => {
          setIsTemplateModalOpen(false)
          setSelectedTemplate(null)
          setIsTemplateReadOnly(false)
        }}
        onSave={loadData}
      />

      <EmployeeKPIModal
        employeeKPI={selectedEmployeeKPI}
        employees={employees}
        kpiTemplates={kpiTemplates}
        targetedKPIId={targetedKPIId} // NEW prop
        isOpen={isEmployeeKPIModalOpen}
        onClose={() => {
          setIsEmployeeKPIModalOpen(false)
          setSelectedEmployeeKPI(null)
          setTargetedKPIId(null) // Reset
        }}
        onSave={loadData}
      />

      <KPIConversionModal
        kpiTemplate={selectedKPIForConversion}
        conversions={selectedKPIForConversion ? kpiConversions.filter(c => c.kpiId === selectedKPIForConversion.id || c.kpiCode === selectedKPIForConversion.code) : []}
        isOpen={isConversionModalOpen}
        onClose={() => {
          setIsConversionModalOpen(false)
          setSelectedKPIForConversion(null)
        }}
        onSave={loadData}
      />



      {/* Modal xem chi tiết KPI đã giao (Bảng 2) */}
      {
        isAssignmentViewOpen && selectedEmployeeKPIView && (
          <div className="modal show" onClick={() => setIsAssignmentViewOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
              <div className="modal-header">
                <h3>
                  <i className="fas fa-eye"></i>
                  Bảng 2: KPI đã giao - {getEmployeeName(selectedEmployeeKPIView.employeeId)}
                </h3>
                <button className="modal-close" onClick={() => setIsAssignmentViewOpen(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '16px' }}>
                  <p><strong>Tháng:</strong> {escapeHtml(selectedEmployeeKPIView.month || '-')}</p>
                  <p><strong>Trạng thái:</strong> {escapeHtml(selectedEmployeeKPIView.status || '-')}</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã KPI</th>
                        <th>Tên KPI</th>
                        <th>Đơn vị</th>
                        <th>Kế hoạch</th>
                        <th>Trọng số (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiTemplates.filter(t => t.status === 'Đang áp dụng').map((template, idx) => {
                        const kpiValue = selectedEmployeeKPIView.kpiValues?.[template.id] || selectedEmployeeKPIView.kpiValues?.[template.code] || {}
                        return (
                          <tr key={template.id}>
                            <td>{idx + 1}</td>
                            <td>{escapeHtml(template.code || template.id || '-')}</td>
                            <td>{escapeHtml(template.name || '-')}</td>
                            <td>{escapeHtml(template.unit || '-')}</td>
                            <td>
                              {template.unit === 'VNĐ' || template.unit === 'VND'
                                ? formatMoney(kpiValue.target || 0)
                                : kpiValue.target || 0}
                            </td>
                            <td>{template.weight || 0}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '12px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>

                  <strong>Tổng trọng số: {calculateTotalWeight(selectedEmployeeKPIView)}%</strong>
                </div>
              </div>
              <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setIsAssignmentViewOpen(false)}>Đóng</button>
              </div>
            </div>
          </div>
        )
      }
      {/* Import Modal for KPI Templates */}
      {
        isTemplateImportModalOpen && (
          <div className="modal show" onClick={() => setIsTemplateImportModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
              <div className="modal-header">
                <h3><i className="fas fa-file-import"></i> Import Danh mục KPI</h3>
                <button className="modal-close" onClick={() => setIsTemplateImportModalOpen(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Chọn file Excel</label>
                  <input type="file" accept=".xlsx,.xls" onChange={handleTemplateFileSelect} style={{ width: '100%', padding: '10px' }} />
                </div>
                <div style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px', fontSize: '0.9rem' }}>
                  <strong>Lưu ý:</strong>
                  <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                    <li>File Excel cần có các cột bắt buộc: <b>Mã KPI, Tên KPI</b></li>
                    <li>Các cột khác: Đơn vị đo, Đối tượng áp dụng, Trọng số, Tháng áp dụng, Trạng thái</li>
                    <li>Thứ tự cột không quan trọng, hệ thống tự nhận diện</li>
                  </ul>
                </div>
                {templateImportPreviewData.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>Preview dữ liệu ({templateImportPreviewData.length} KPI)</h4>
                    <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <table style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                          <tr>
                            <th>STT</th><th>Mã KPI</th><th>Tên KPI</th><th>Đơn vị</th><th>Trọng số</th><th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {templateImportPreviewData.map((item, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{item.code}</td>
                              <td>{item.name}</td>
                              <td>{item.unit}</td>
                              <td>{item.weight}%</td>
                              <td>{item.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn" onClick={() => { setIsTemplateImportModalOpen(false); setTemplateImportPreviewData([]) }} disabled={isTemplateImporting}>Hủy</button>
                  <button type="button" className="btn btn-primary" onClick={handleConfirmTemplateImport} disabled={isTemplateImporting || templateImportPreviewData.length === 0}>
                    {isTemplateImporting ? <><i className="fas fa-spinner fa-spin"></i> Đang import...</> : <><i className="fas fa-check"></i> Xác nhận Import ({templateImportPreviewData.length})</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

        )
      }

      {/* Import Modal for Employee KPIs */}
      {
        isEmployeeKPIImportModalOpen && (
          <div className="modal show" onClick={() => setIsEmployeeKPIImportModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
              <div className="modal-header">
                <h3><i className="fas fa-file-import"></i> Import KPI Nhân viên</h3>
                <button className="modal-close" onClick={() => setIsEmployeeKPIImportModalOpen(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Chọn file Excel</label>
                  <input type="file" accept=".xlsx,.xls" onChange={handleEmployeeKPIFileSelect} style={{ width: '100%', padding: '10px' }} />
                </div>
                <div style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px', fontSize: '0.9rem' }}>
                  <strong>Lưu ý:</strong>
                  <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                    <li>File Excel cần có cột bắt buộc: <b>Mã NV</b></li>
                    <li>Các cột KPI: Đặt tên cột theo Mã KPI (ví dụ: KPI01, KPI02...)</li>
                    <li>Các cột khác: Tháng, Trạng thái</li>
                    <li>Thứ tự cột không quan trọng</li>
                  </ul>
                </div>
                {employeeKPIImportPreviewData.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>Preview dữ liệu ({employeeKPIImportPreviewData.length} nhân viên)</h4>
                    <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <table style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5' }}>
                          <tr>
                            <th>STT</th><th>Mã NV</th><th>Họ tên</th><th>Bộ phận</th><th>Tháng</th><th>Số KPI</th><th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeKPIImportPreviewData.map((item, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{item.employeeId}</td>
                              <td>{item.employeeName}</td>
                              <td>{item.department}</td>
                              <td>{item.month}</td>
                              <td>{Object.keys(item.kpiValues || {}).length}</td>
                              <td>{item.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn" onClick={() => { setIsEmployeeKPIImportModalOpen(false); setEmployeeKPIImportPreviewData([]) }} disabled={isEmployeeKPIImporting}>Hủy</button>
                  <button type="button" className="btn btn-primary" onClick={handleConfirmEmployeeKPIImport} disabled={isEmployeeKPIImporting || employeeKPIImportPreviewData.length === 0}>
                    {isEmployeeKPIImporting ? <><i className="fas fa-spinner fa-spin"></i> Đang import...</> : <><i className="fas fa-check"></i> Xác nhận Import ({employeeKPIImportPreviewData.length})</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      <KPIResultDetailModal
        result={selectedResultForDetail}
        employees={employees}
        employeeKPIs={employeeKPIs} // Link to Assignments
        kpiTemplates={kpiTemplates}
        isOpen={isResultDetailModalOpen}
        onClose={() => {
          setIsResultDetailModalOpen(false)
          setSelectedResultForDetail(null)
          setIsResultEditing(false)
        }}
        kpiConversions={kpiConversions}
        isEditing={isResultEditing}
        onSave={loadData}
      />

      <KPIResultImportModal
        employees={employees}
        kpiTemplates={kpiTemplates}
        employeeKPIs={employeeKPIs}
        kpiConversions={kpiConversions}
        isOpen={isResultImportModalOpen}
        onClose={() => setIsResultImportModalOpen(false)}
        onSave={loadData}
      />
    </div >
  )
}

export default KPI
