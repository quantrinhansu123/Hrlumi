import React, { useState, useEffect } from 'react'
import { fbGet, fbDelete } from '../services/firebase'
import { escapeHtml, formatMoney } from '../utils/helpers'
import KPITemplateModal from '../components/KPITemplateModal'
import EmployeeKPIModal from '../components/EmployeeKPIModal'
import KPIConversionModal from '../components/KPIConversionModal'
import KPIDetailModal from '../components/KPIDetailModal'
import SeedKPIDataButton from '../components/SeedKPIDataButton'

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
  
  // Selected items
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedEmployeeKPI, setSelectedEmployeeKPI] = useState(null)
  const [selectedKPIForConversion, setSelectedKPIForConversion] = useState(null)
  const [selectedResultForDetail, setSelectedResultForDetail] = useState(null)
  const [selectedEmployeeKPIView, setSelectedEmployeeKPIView] = useState(null)
  
  // Filters
  const [filterDept, setFilterDept] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterResultDept, setFilterResultDept] = useState('')
  const [filterResultMonth, setFilterResultMonth] = useState('')

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
            .filter(([k,v]) => v !== null && v !== undefined)
            .map(([k,v]) => ({...v, id: k}))
        }
      }
      setEmployees(empList)

      // Load KPI data
      const hrData = await fbGet('hr')
      const templates = hrData?.kpiTemplates ? Object.entries(hrData.kpiTemplates).map(([k,v]) => ({...v, id: k})) : []
      setKpiTemplates(templates)

      const empKPIs = hrData?.employeeKPIs ? Object.entries(hrData.employeeKPIs).map(([k,v]) => ({...v, id: k})) : []
      setEmployeeKPIs(empKPIs)

      const conversions = hrData?.kpiConversions ? Object.entries(hrData.kpiConversions).map(([k,v]) => ({...v, id: k})) : []
      setKpiConversions(conversions)

      const results = hrData?.kpiResults ? Object.entries(hrData.kpiResults).map(([k,v]) => ({...v, id: k})) : []
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
      return sum + (template?.weight || kpi.weight || 0)
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
            <SeedKPIDataButton onComplete={loadData} />
          </>
        )}
        {activeTab === 'assignment' && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              setSelectedEmployeeKPI(null)
              setIsEmployeeKPIModalOpen(true)
            }}
            style={{ marginLeft: '10px' }}
          >
            <i className="fas fa-plus"></i>
            Gán KPI cho nhân viên
          </button>
        )}
        {activeTab === 'results' && (
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
            <div className="card-header">
              <h3 className="card-title">Bảng 1: Quản lý danh mục KPI</h3>
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
                            className="edit"
                            onClick={() => {
                              setSelectedTemplate(template)
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
            <div className="card-header">
              <h3 className="card-title">Bảng 2: Nhập KPI cho từng cá nhân</h3>
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
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ và tên</th>
                    <th>Ca</th>
                    <th>Vị trí</th>
                    {kpiTemplates.filter(t => t.status === 'Đang áp dụng').map(template => (
                      <th key={template.id}>{escapeHtml(template.code || template.id)}</th>
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
                      return (
                        <tr key={empKPI.id}>
                          <td>{idx + 1}</td>
                          <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                          <td>{employee ? (employee.shift || 'Ngày') : '-'}</td>
                          <td>{employee ? (employee.vi_tri || '-') : '-'}</td>
                          {kpiTemplates.filter(t => t.status === 'Đang áp dụng').map(template => {
                            const kpiValue = empKPI.kpiValues?.[template.id] || empKPI.kpiValues?.[template.code]
                            return (
                              <td key={template.id}>
                                {kpiValue ? (
                                  <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Nhập</span>
                                ) : (
                                  <span style={{ color: '#999' }}>-</span>
                                )}
                              </td>
                            )
                          })}
                          <td>{totalWeight}%</td>
                          <td>
                            <span className={`badge ${
                              empKPI.status === 'Đã giao' ? 'badge-success' :
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
                                setSelectedEmployeeKPIView(empKPI)
                                setIsAssignmentViewOpen(true)
                                  }}
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
                      <td colSpan={8 + kpiTemplates.filter(t => t.status === 'Đang áp dụng').length} className="empty-state">
                        Chưa có KPI cho nhân viên
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ và tên</th>
                    <th>Bộ phận</th>
                    <th>Vị trí</th>
                    <th>Ca</th>
                    <th>Tháng</th>
                    {kpiTemplates.filter(t => t.status === 'Đang áp dụng').map(template => (
                      <th key={template.id}>{escapeHtml(template.code || template.id)} (Thực tế)</th>
                    ))}
                    {kpiTemplates.filter(t => t.status === 'Đang áp dụng').map(template => (
                      <th key={`conv-${template.id}`}>% Quy đổi {escapeHtml(template.code || template.id)}</th>
                    ))}
                    <th>KPI tổng (%)</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length > 0 ? (
                    filteredResults.map((result, idx) => {
                      const employee = employees.find(e => e.id === result.employeeId)
                      const totalKPI = result.totalKPI || result.kpiTong || 0
                      const status = totalKPI >= 100 ? 'Đạt' : 'Chưa đạt'
                      return (
                        <tr key={result.id}>
                          <td>{idx + 1}</td>
                          <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                          <td>{escapeHtml(result.department || '-')}</td>
                          <td>{employee ? (employee.vi_tri || '-') : '-'}</td>
                          <td>{employee ? (employee.shift || 'Ngày') : '-'}</td>
                          <td>{escapeHtml(result.month || '-')}</td>
                          {kpiTemplates.filter(t => t.status === 'Đang áp dụng').map(template => {
                            const kpiResult = result.kpiResults?.[template.id] || result.kpiResults?.[template.code]
                            return (
                              <td key={template.id}>
                                {kpiResult?.actual !== undefined ? (
                                  template.unit === 'VNĐ' || template.unit === 'VND' 
                                    ? formatMoney(kpiResult.actual)
                                    : kpiResult.actual
                                ) : '-'}
                              </td>
                            )
                          })}
                          {kpiTemplates.filter(t => t.status === 'Đang áp dụng').map(template => {
                            const kpiResult = result.kpiResults?.[template.id] || result.kpiResults?.[template.code]
                            return (
                              <td key={`conv-${template.id}`}>
                                {kpiResult?.conversionPercent !== undefined ? `${kpiResult.conversionPercent}%` : '-'}
                              </td>
                            )
                          })}
                          <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{totalKPI.toFixed(1)}%</td>
                          <td>
                            <span className={`badge ${status === 'Đạt' ? 'badge-success' : 'badge-danger'}`}>
                              {status}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="view"
                              onClick={() => {
                                setSelectedResultForDetail(result)
                                setIsDetailModalOpen(true)
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
                      <td colSpan={11 + kpiTemplates.filter(t => t.status === 'Đang áp dụng').length * 2} className="empty-state">
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
          </div>
        </>
      )}

      {/* Modals */}
      <KPITemplateModal
        template={selectedTemplate}
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false)
          setSelectedTemplate(null)
        }}
        onSave={loadData}
      />

      <EmployeeKPIModal
        employeeKPI={selectedEmployeeKPI}
        employees={employees}
        kpiTemplates={kpiTemplates}
        isOpen={isEmployeeKPIModalOpen}
        onClose={() => {
          setIsEmployeeKPIModalOpen(false)
          setSelectedEmployeeKPI(null)
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

      <KPIDetailModal
        result={selectedResultForDetail}
        employee={selectedResultForDetail ? employees.find(e => e.id === selectedResultForDetail.employeeId) : null}
        kpiTemplates={kpiTemplates}
        kpiConversions={kpiConversions}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedResultForDetail(null)
        }}
      />

      {/* Modal xem chi tiết KPI đã giao (Bảng 2) */}
      {isAssignmentViewOpen && selectedEmployeeKPIView && (
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
      )}
    </div>
  )
}

export default KPI
