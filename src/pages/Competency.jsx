import { useEffect, useState } from 'react'


import CompetencyFrameworkModal from '../components/CompetencyFrameworkModal'
import EvaluationDetailModal from '../components/EvaluationDetailModal'
import SeedCompetencyDataButton from '../components/SeedCompetencyDataButton'
import TrainingParticipantModal from '../components/TrainingParticipantModal'
import TrainingProgramModal from '../components/TrainingProgramModal'
import { fbDelete, fbGet, fbPush, fbUpdate } from '../services/firebase'
import { escapeHtml, normalizeString } from '../utils/helpers'

function Competency() {
  const [activeTab, setActiveTab] = useState('framework')
  const [competencyFramework, setCompetencyFramework] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [trainingPrograms, setTrainingPrograms] = useState([])
  const [trainingParticipants, setTrainingParticipants] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states

  const [isEvaluationDetailModalOpen, setIsEvaluationDetailModalOpen] = useState(false)

  // Training Modal State
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState(null)

  // Participant Modal State
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false)
  const [participantInitialView, setParticipantInitialView] = useState('participants')
  const [isParticipantReadOnly, setIsParticipantReadOnly] = useState(false)


  // Selected items
  const [selectedFramework, setSelectedFramework] = useState(null)
  const [selectedEvaluation, setSelectedEvaluation] = useState(null)
  const [selectedEvaluationDetail, setSelectedEvaluationDetail] = useState(null)

  // Filters
  const [filterDept, setFilterDept] = useState('')
  const [filterEvaluationDept, setFilterEvaluationDept] = useState('')
  const [filterEvaluationPeriod, setFilterEvaluationPeriod] = useState('')
  const [filterTrainingProgram, setFilterTrainingProgram] = useState('')

  // Bảng 1: Nhập đánh giá state
  const [assessmentForm, setAssessmentForm] = useState({
    employeeId: '',
    employeeCode: '',
    position: '',
    department: '',
    period: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    items: []
  })
  const [inputFilterDept, setInputFilterDept] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Bảng 1: Khai báo khung năng lực state
  const [isFrameworkModalOpen, setIsFrameworkModalOpen] = useState(false)
  const [isFrameworkReadOnly, setIsFrameworkReadOnly] = useState(false)

  // Bảng 1: Khai báo khung năng lực state (Inline Form)
  const [frameworkForm, setFrameworkForm] = useState({
    id: null,
    department: '',
    position: '',
    group: 'Chuyên môn',
    name: '',
    level: 1,
    status: 'Áp dụng',
    note: ''
  })
  const [isFrameworkSaving, setIsFrameworkSaving] = useState(false)

  // Searchable Select State
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Framework Form Dropdown States
  const [showPositionDropdown, setShowPositionDropdown] = useState(false)
  const [showNameDropdown, setShowNameDropdown] = useState(false)

  // Sync search term with assessmentForm.employeeId
  useEffect(() => {
    if (assessmentForm.employeeId) {
      const emp = employees.find(e => e.id === assessmentForm.employeeId)
      if (emp) {
        setSearchTerm(emp.ho_va_ten || emp.name || '')
      }
    } else {
      setSearchTerm('')
    }
  }, [assessmentForm.employeeId, employees])

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

      // Load competency framework
      const hrData = await fbGet('hr')
      const framework = hrData?.competencyFramework ? Object.entries(hrData.competencyFramework).map(([k, v]) => ({ ...v, id: k })) : []
      setCompetencyFramework(framework)

      // Load evaluations (đổi sang employee_competency_assessment)
      const evals = hrData?.employee_competency_assessment
        ? Object.entries(hrData.employee_competency_assessment).map(([k, v]) => ({ ...v, id: k }))
        : []
      setEvaluations(evals)

      // Load training programs
      const trainings = hrData?.trainings ? Object.entries(hrData.trainings).map(([k, v]) => ({ ...v, id: k })) : []
      setTrainingPrograms(trainings)

      // Load training participants
      const participants = hrData?.trainingParticipants ? Object.entries(hrData.trainingParticipants).map(([k, v]) => ({ ...v, id: k })) : []
      setTrainingParticipants(participants)

      setLoading(false)
    } catch (error) {
      console.error('Error loading competency data:', error)
      setLoading(false)
    }
  }

  const handleDeleteFramework = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa năng lực này?')) return
    try {
      await fbDelete(`hr/competencyFramework/${id}`)
      loadData()
      alert('Đã xóa năng lực')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  const handleDeleteTraining = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa chương trình đào tạo này?')) return
    try {
      await fbDelete(`hr/trainings/${id}`)
      loadData()
      alert('Đã xóa chương trình đào tạo')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  // Filter competency framework by department
  const filteredFramework = filterDept
    ? competencyFramework.filter(c => c.department === filterDept)
    : competencyFramework

  // Pivot dữ liệu cho Ma trận (Bảng 2)
  const matrixPositions = [...new Set(filteredFramework.map(c => c.position).filter(Boolean))].sort()

  const pivotRows = Object.values(
    filteredFramework.reduce((acc, item) => {
      const group = item.group || 'Khác'
      const name = item.name || 'Khác'
      const key = `${group}__${name}`
      if (!acc[key]) {
        acc[key] = { group, name, levels: {} }
      }
      acc[key].levels[item.position || ''] = item.level || '–'
      return acc
    }, {})
  ).sort((a, b) => {
    // Sort by group then by name
    if (a.group !== b.group) return a.group.localeCompare(b.group)
    return a.name.localeCompare(b.name)
  })

  // Filter evaluations
  const filteredEvaluations = evaluations.filter(e => {
    if (filterEvaluationDept && e.department !== filterEvaluationDept) return false
    if (filterEvaluationPeriod && e.period !== filterEvaluationPeriod) return false
    return true
  })

  // Filter training participants
  const [filteredParticipants, setFilteredParticipants] = useState([])
  useEffect(() => {
    setFilteredParticipants(filterTrainingProgram
      ? trainingParticipants.filter(p => p.trainingProgramId === filterTrainingProgram)
      : trainingParticipants)
  }, [filterTrainingProgram, trainingParticipants])

  // Bảng 1 Logic
  const handleAssessmentFormChange = (e) => {
    const { name, value } = e.target
    setAssessmentForm(prev => ({ ...prev, [name]: value }))

    if (name === 'employeeId') {
      const emp = employees.find(e => e.id === value)
      if (emp) {
        // Try to auto-match position from framework
        const empPosition = String(emp.vi_tri || emp.position || '').trim()
        const empDept = String(emp.bo_phan || emp.department || '').trim()

        // Find if this position exists in framework (case-insensitive)
        const frameworkPositions = [...new Set(competencyFramework
          .filter(c => (!inputFilterDept || c.department === inputFilterDept))
          .map(c => c.position))]

        const matchingPos = frameworkPositions.find(p => p.toLowerCase() === empPosition.toLowerCase())
        const positionToUse = matchingPos || empPosition // Fallback to employee's own position string if no match found, user can change later

        setAssessmentForm(prev => ({
          ...prev,
          employeeId: value,
          employeeCode: emp.ma_nhan_vien || emp.employeeCode || emp.code || emp.id || '',
          position: positionToUse, // Set the tentative position
          department: emp.bo_phan || emp.department || ''
        }))
        loadAssessmentItems(positionToUse, empDept)
      } else {
        setAssessmentForm(prev => ({ ...prev, items: [] }))
      }
    }

    if (name === 'position') {
      // User manually changed the framework position
      loadAssessmentItems(value, assessmentForm.department)
    }
  }

  const loadAssessmentItems = (position, department, existingItems = null) => {
    if (!position) return

    const searchPos = position.trim().toLowerCase()
    const searchDept = String(department || '').trim().toLowerCase()

    const frameworkItems = competencyFramework.filter(c => {
      const framePosition = String(c.position || '').trim().toLowerCase()
      const frameDept = String(c.department || '').trim().toLowerCase()

      // Match Position AND Department (if Dept is specified in framework)
      // Note: We prioritize the explicitly selected 'position'
      return framePosition === searchPos && (!c.department || frameDept === searchDept || searchDept === '') && c.status !== 'Không áp dụng'
    })

    const items = frameworkItems.map(item => {
      const existing = existingItems?.find(i => i.competencyId === item.id)
      const requiredLevel = Number(item.level || 0)
      const achievedLevel = existing ? Number(existing.achievedLevel || 0) : requiredLevel

      return {
        competencyId: item.id,
        competencyCode: item.code || item.id,
        competencyName: item.name,
        group: item.group,
        requiredLevel: requiredLevel,
        achievedLevel: achievedLevel,
        difference: achievedLevel - requiredLevel,
        comment: existing ? existing.comment : ''
      }
    })

    setAssessmentForm(prev => ({ ...prev, items }))
  }

  const handleAssessmentItemChange = (index, field, value) => {
    const newItems = [...assessmentForm.items]
    const item = { ...newItems[index] }
    item[field] = field === 'achievedLevel' ? (parseInt(value) || 0) : value
    if (field === 'achievedLevel') {
      item.difference = item.achievedLevel - item.requiredLevel
    }
    newItems[index] = item
    setAssessmentForm(prev => ({ ...prev, items: newItems }))
  }

  const handleSaveAssessment = async () => {
    if (!assessmentForm.employeeId || !assessmentForm.period) {
      alert('Vui lòng chọn nhân viên và kỳ đánh giá')
      return
    }
    if (assessmentForm.items.length === 0) {
      alert('Không có năng lực để đánh giá cho nhân viên này. Vui lòng kiểm tra Khung năng lực.')
      return
    }

    try {
      setIsSaving(true)
      const avgRequired = assessmentForm.items.reduce((sum, i) => sum + i.requiredLevel, 0) / assessmentForm.items.length
      const avgAchieved = assessmentForm.items.reduce((sum, i) => sum + i.achievedLevel, 0) / assessmentForm.items.length

      const dataToSave = {
        ...assessmentForm,
        diemYC: avgRequired,
        diemKQ: avgAchieved,
        result: avgAchieved >= avgRequired ? 'Đạt' : 'Cần cải thiện',
        updatedAt: new Date().toISOString()
      }

      if (assessmentForm.id) {
        const { id, ...cleanData } = dataToSave
        await fbUpdate(`hr/employee_competency_assessment/${id}`, cleanData)
      } else {
        await fbPush('hr/employee_competency_assessment', dataToSave)
      }

      alert('Đã lưu kết quả đánh giá thành công')
      setAssessmentForm({
        employeeId: '',
        employeeCode: '',
        position: '',
        department: '',
        period: '',
        evaluationDate: new Date().toISOString().split('T')[0],
        items: []
      })
      loadData()
    } catch (error) {
      alert('Lỗi khi lưu: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Khung năng lực Logic (Inline Form)
  const handleFrameworkFormChange = (e) => {
    const { name, value } = e.target
    const val = name === 'level' ? (parseInt(value) || 1) : value
    setFrameworkForm(prev => ({ ...prev, [name]: val }))
  }

  const handleSaveFramework = async (e) => {
    e.preventDefault()
    if (!frameworkForm.department || !frameworkForm.position || !frameworkForm.name) {
      alert('Vui lòng nhập đầy đủ Bộ phận, Vị trí và Tên năng lực')
      return
    }

    try {
      setIsFrameworkSaving(true)
      const { id, ...dataToSave } = frameworkForm

      if (id) {
        // Nếu có ID (trường hợp sửa từ Bảng 1 - dù hiện tại ưu tiên Modal cho sửa)
        await fbUpdate(`hr/competencyFramework/${id}`, dataToSave)
        alert('Cập nhật năng lực thành công')
      } else {
        await fbPush('hr/competencyFramework', dataToSave)
        alert('Thêm năng lực thành công')
      }

      setFrameworkForm({
        id: null,
        department: '',
        position: '',
        group: 'Chuyên môn',
        name: '',
        level: 1,
        status: 'Áp dụng',
        note: ''
      })
      loadData()
    } catch (error) {
      alert('Lỗi khi lưu: ' + error.message)
    } finally {
      setIsFrameworkSaving(false)
    }
  }

  if (loading) {
    return <div className="loadingState">Đang tải dữ liệu...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-graduation-cap"></i>
          Năng lực nhân sự
        </h1>
        {activeTab === 'framework' && (
          <>
            <SeedCompetencyDataButton onComplete={loadData} />
          </>
        )}
        {activeTab === 'training' && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedTraining(null)
              setIsTrainingModalOpen(true)
            }}
          >
            <i className="fas fa-plus"></i>
            Thêm CTĐT
          </button>
        )}
      </div>

      <div className="tabs">
        <div
          className={`tab ${activeTab === 'framework' ? 'active' : ''}`}
          onClick={() => setActiveTab('framework')}
        >
          📋 Khung năng lực
        </div>
        <div
          className={`tab ${activeTab === 'evaluation' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluation')}
        >
          ⭐ Đánh giá năng lực
        </div>
        <div
          className={`tab ${activeTab === 'training' ? 'active' : ''}`}
          onClick={() => setActiveTab('training')}
        >
          📚 Đào tạo nội bộ
        </div>
      </div>

      {/* Tab 1: Khung năng lực */}
      {activeTab === 'framework' && (
        <>

          {/* Bảng 1: Khai báo khung năng lực theo vị trí (Inline) */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3 className="card-title">Bảng 1: Khai báo khung năng lực theo vị trí</h3>
            </div>
            <div style={{ padding: '15px' }}>
              <form onSubmit={handleSaveFramework}>
                <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                    <label>Bộ phận *</label>
                    <select
                      name="department"
                      value={frameworkForm.department}
                      onChange={handleFrameworkFormChange}
                      style={{ width: '100%', padding: '8px' }}
                      required
                    >
                      <option value="">Chọn bộ phận</option>
                      {['MKT', 'Sale', 'BOD', 'Nhân sự', 'Kế toán', 'Vận đơn', 'CSKH'].sort().map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      {[...new Set(employees.map(e => e.bo_phan || e.department).filter(Boolean))].filter(d => !['MKT', 'Sale', 'BOD', 'Nhân sự', 'Kế toán', 'Vận đơn', 'CSKH'].includes(d)).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                    <label>Vị trí *</label>
                    <input
                      type="text"
                      name="position"
                      value={frameworkForm.position}
                      onChange={handleFrameworkFormChange}
                      onFocus={() => setShowPositionDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPositionDropdown(false), 200)}
                      placeholder="VD: MKT 1, Sale 1..."
                      style={{ width: '100%', padding: '8px' }}
                      required
                      autoComplete="off"
                    />
                    {showPositionDropdown && (
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
                        {[...new Set([
                          ...competencyFramework.map(c => c.position),
                          ...employees.map(e => e.vi_tri || e.position)
                        ].filter(Boolean))].sort().filter(p => normalizeString(p).includes(normalizeString(frameworkForm.position || ''))).map((pos, idx) => (
                          <li
                            key={idx}
                            onClick={() => setFrameworkForm(prev => ({ ...prev, position: pos }))}
                            style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {pos}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                    <label>Nhóm năng lực *</label>
                    <select
                      name="group"
                      value={frameworkForm.group}
                      onChange={handleFrameworkFormChange}
                      style={{ width: '100%', padding: '8px' }}
                      required
                    >
                      <option value="Chuyên môn">Chuyên môn</option>
                      <option value="Lãnh đạo">Lãnh đạo</option>
                      <option value="Cá nhân">Cá nhân</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '2', minWidth: '300px', position: 'relative' }}>
                    <label>Tên năng lực *</label>
                    <input
                      type="text"
                      name="name"
                      value={frameworkForm.name}
                      onChange={handleFrameworkFormChange}
                      onFocus={() => setShowNameDropdown(true)}
                      onBlur={() => setTimeout(() => setShowNameDropdown(false), 200)}
                      placeholder="VD: Lập kế hoạch & giám sát KPI"
                      style={{ width: '100%', padding: '8px' }}
                      required
                      autoComplete="off"
                    />
                    {showNameDropdown && (
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
                        {[...new Set(competencyFramework.map(c => c.name).filter(Boolean))].sort()
                          .filter(n => normalizeString(n).includes(normalizeString(frameworkForm.name || '')))
                          .map((name, idx) => (
                            <li
                              key={idx}
                              onClick={() => setFrameworkForm(prev => ({ ...prev, name: name }))}
                              style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {name}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                    <label>Level yêu cầu (1-5) *</label>
                    <select
                      name="level"
                      value={frameworkForm.level}
                      onChange={handleFrameworkFormChange}
                      style={{ width: '100%', padding: '8px' }}
                      required
                    >
                      {[1, 2, 3, 4, 5].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                    <label>Trạng thái</label>
                    <select
                      name="status"
                      value={frameworkForm.status}
                      onChange={handleFrameworkFormChange}
                      style={{ width: '100%', padding: '8px' }}
                    >
                      <option value="Áp dụng">Áp dụng</option>
                      <option value="Ngừng">Ngừng</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label>Ghi chú</label>
                  <textarea
                    name="note"
                    value={frameworkForm.note}
                    onChange={handleFrameworkFormChange}
                    rows="2"
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {frameworkForm.id && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setFrameworkForm({
                        id: null,
                        department: '',
                        position: '',
                        group: 'Chuyên môn',
                        name: '',
                        level: 1,
                        status: 'Áp dụng',
                        note: ''
                      })}
                    >Hủy</button>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={isFrameworkSaving}>
                    {isFrameworkSaving ? 'Đang lưu...' : (frameworkForm.id ? 'Cập nhật Năng lực' : 'Tạo mới Năng lực')}
                  </button>
                </div>
              </form>
            </div>
          </div>


          {/* Bảng 2: Danh mục khung năng lực theo bộ phận (Ma trận) */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Bảng 2: Danh mục khung năng lực theo bộ phận</h3>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px' }}
              >
                <option value="">Chọn Bộ phận để xem Ma trận</option>
                {[...new Set(competencyFramework.map(c => c.department).filter(Boolean))].sort().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            {filterDept ? (
              matrixPositions.length > 0 ? (
                <div style={{ overflowX: 'auto', padding: '15px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th rowSpan="2">STT</th>
                        <th rowSpan="2">Nhóm năng lực</th>
                        <th rowSpan="2">Tên năng lực</th>
                        {matrixPositions.map(pos => (
                          <th key={pos}>{escapeHtml(pos)}</th>
                        ))}
                      </tr>
                      <tr>
                        {matrixPositions.map((pos, idx) => (
                          <th key={`code_${pos}`} style={{ fontSize: '0.85em', color: '#666', background: '#f8f9fa' }}>B{idx + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pivotRows.length > 0 ? (
                        pivotRows.map((row, idx) => (
                          <tr key={`${row.group}_${row.name}`}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td>{escapeHtml(row.group)}</td>
                            <td>{escapeHtml(row.name)}</td>
                            {matrixPositions.map(pos => (
                              <td key={pos} style={{ textAlign: 'center', fontWeight: 'bold', color: row.levels[pos] !== '–' ? 'var(--primary)' : 'inherit' }}>
                                {row.levels[pos] || '–'}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3 + matrixPositions.length} className="empty-state">
                            Chưa có dữ liệu để hiển thị ma trận
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-state" style={{ padding: '40px' }}>Bộ phận này chưa có dữ liệu khung năng lực</p>
              )
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <i className="fas fa-hand-pointer" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
                <p>Vui lòng chọn <strong>Bộ phận</strong> ở trên để hiển thị Ma trận năng lực</p>
              </div>
            )}
          </div>

          {/* Bảng 3: Danh sách tổng hợp */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bảng 3: Danh sách chi tiết khung năng lực</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Bộ phận</th>
                    <th>Vị trí</th>
                    <th>Nhóm năng lực</th>
                    <th>Tên năng lực</th>
                    <th>Level yêu cầu</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {competencyFramework.length > 0 ? (
                    competencyFramework.map((c, idx) => (
                      <tr key={c.id}>
                        <td>{idx + 1}</td>
                        <td>{escapeHtml(c.department || '-')}</td>
                        <td>{escapeHtml(c.position || '-')}</td>
                        <td>{escapeHtml(c.group || '-')}</td>
                        <td>{escapeHtml(c.name || '-')}</td>
                        <td style={{ textAlign: 'center' }}>{c.level || '-'}</td>
                        <td>
                          <span className={`badge ${c.status === 'Áp dụng' ? 'badge-success' : 'badge-danger'}`}>
                            {escapeHtml(c.status || 'Áp dụng')}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="view"
                              onClick={() => {
                                setSelectedFramework(c)
                                setIsFrameworkReadOnly(true)
                                setIsFrameworkModalOpen(true)
                              }}
                              title="Xem chi tiết"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button
                              className="edit"
                              onClick={() => {
                                setSelectedFramework(c)
                                setIsFrameworkReadOnly(false)
                                setIsFrameworkModalOpen(true)
                              }}
                              title="Sửa"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="delete"
                              onClick={() => handleDeleteFramework(c.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="empty-state">Chưa có khung năng lực</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )
      }

      {/* Tab 2: Đánh giá năng lực */}
      {
        activeTab === 'evaluation' && (
          <>
            {/* Bảng 1: Nhập kết quả đánh giá năng lực cho 1 nhân sự */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <h3 className="card-title">Bảng 1: HR nhập kết quả đánh giá năng lực cho 1 nhân sự</h3>
              </div>
              <div style={{ padding: '15px' }}>
                <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                    <label>Chọn Bộ phận</label>
                    <select
                      value={inputFilterDept}
                      onChange={(e) => setInputFilterDept(e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    >
                      <option value="">Tất cả bộ phận</option>
                      {[...new Set(employees.map(e => e.bo_phan || e.department).filter(Boolean))].sort().map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                    <label>Nhân sự *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder={inputFilterDept ? `Tìm nhân viên ${inputFilterDept}...` : "Tìm kiếm nhân viên..."}
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setShowDropdown(true)
                          if (assessmentForm.employeeId) {
                            // Clear selection if user types (optional, strictly forcing re-select)
                            handleAssessmentFormChange({ target: { name: 'employeeId', value: '' } })
                          }
                        }}
                        onFocus={() => setShowDropdown(true)}
                        style={{ width: '100%', padding: '8px' }}
                      />
                      {showDropdown && (
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
                            .filter(e => {
                              const matchDept = !inputFilterDept || (e.bo_phan || e.department) === inputFilterDept
                              const matchName = normalizeString(e.ho_va_ten || e.name || '').includes(normalizeString(searchTerm))
                              return matchDept && matchName
                            })
                            .map(e => (
                              <li
                                key={e.id}
                                onClick={() => {
                                  handleAssessmentFormChange({ target: { name: 'employeeId', value: e.id } })
                                  setSearchTerm(e.ho_va_ten || e.name || '')
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
                                <strong>{e.ho_va_ten || e.name || 'N/A'}</strong>
                                <br />
                                <small style={{ color: '#666' }}>{e.vi_tri || '-'} | {e.bo_phan || '-'}</small>
                              </li>
                            ))}
                          {employees.filter(e => {
                            const matchDept = !inputFilterDept || (e.bo_phan || e.department) === inputFilterDept
                            const matchName = normalizeString(e.ho_va_ten || e.name || '').includes(normalizeString(searchTerm))
                            return matchDept && matchName
                          }).length === 0 && (
                              <li style={{ padding: '10px', color: '#999', textAlign: 'center' }}>
                                Không tìm thấy nhân viên
                              </li>
                            )}
                        </ul>
                      )}
                      {/* Overlay to close dropdown */}
                      {showDropdown && (
                        <div
                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                          onClick={() => setShowDropdown(false)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                    <label>Vị trí áp dụng KHNL *</label>
                    <select
                      name="position"
                      value={assessmentForm.position}
                      onChange={handleAssessmentFormChange}
                      style={{ width: '100%', padding: '8px' }}
                    >
                      <option value="">Chọn vị trí KHNL</option>
                      {[...new Set(competencyFramework
                        .filter(c => !inputFilterDept || c.department === inputFilterDept)
                        .map(c => c.position)
                      )].sort().map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                    <label>Kỳ đánh giá (Tháng) *</label>
                    <input
                      type="month"
                      name="period"
                      value={assessmentForm.period}
                      onChange={handleAssessmentFormChange}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                    <label>Ngày đánh giá</label>
                    <input
                      type="date"
                      name="evaluationDate"
                      value={assessmentForm.evaluationDate}
                      onChange={handleAssessmentFormChange}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                </div>

                {assessmentForm.items.length > 0 ? (
                  <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Nhóm năng lực</th>
                          <th>Tên năng lực</th>
                          <th>Level yêu cầu</th>
                          <th>Level đạt được</th>
                          <th>Điểm chênh lệch</th>
                          <th>Nhận xét</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessmentForm.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{escapeHtml(item.group || '-')}</td>
                            <td>{escapeHtml(item.competencyName || '-')}</td>
                            <td style={{ textAlign: 'center' }}>{item.requiredLevel}</td>
                            <td>
                              <select
                                value={item.achievedLevel}
                                onChange={(e) => handleAssessmentItemChange(idx, 'achievedLevel', e.target.value)}
                                style={{ width: '100%', padding: '5px' }}
                              >
                                {[1, 2, 3, 4, 5].map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{
                              textAlign: 'center',
                              fontWeight: 'bold',
                              color: item.difference > 0 ? 'var(--success)' : item.difference < 0 ? 'var(--danger)' : 'inherit'
                            }}>
                              {item.difference > 0 ? `+${item.difference}` : item.difference}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.comment}
                                onChange={(e) => handleAssessmentItemChange(idx, 'comment', e.target.value)}
                                placeholder="Nhập nhận xét..."
                                style={{ width: '100%', padding: '5px' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : assessmentForm.employeeId && (
                  <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    Nhân sự này chưa được cài đặt Khung năng lực cho vị trí: <strong>{assessmentForm.position}</strong>. <br />
                    Vui lòng qua tab <strong>Khung năng lực</strong> để thiết lập trước.
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    className="btn"
                    onClick={() => setAssessmentForm({
                      employeeId: '',
                      employeeCode: '',
                      position: '',
                      department: '',
                      period: '',
                      evaluationDate: new Date().toISOString().split('T')[0],
                      items: []
                    })}
                  >Hủy</button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveAssessment}
                    disabled={isSaving || assessmentForm.items.length === 0}
                  >
                    {isSaving ? 'Đang lưu...' : (assessmentForm.id ? 'Cập nhật kết quả' : 'Lưu kết quả')}
                  </button>
                </div>
              </div>
            </div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Bảng 2: Kết quả đánh giá năng lực</h3>
                <div className="search-box" style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={filterEvaluationDept}
                    onChange={(e) => setFilterEvaluationDept(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px' }}
                  >
                    <option value="">Tất cả bộ phận</option>
                    {[...new Set(evaluations.map(e => e.department).filter(Boolean))].sort().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select
                    value={filterEvaluationPeriod}
                    onChange={(e) => setFilterEvaluationPeriod(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px' }}
                  >
                    <option value="">Tất cả kỳ</option>
                    {[...new Set(evaluations.map(e => e.period).filter(Boolean))].sort().map(period => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Kỳ đánh giá</th>
                      <th>Mã NV</th>
                      <th>Họ và tên</th>
                      <th>Bộ phận</th>
                      <th>Vị trí</th>
                      <th>Điểm YC</th>
                      <th>Điểm KQ</th>
                      <th>Kết quả</th>
                      <th>Ngày đánh giá</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvaluations.length > 0 ? (
                      filteredEvaluations.map((evaluation, idx) => {
                        const employee = employees.find(e => e.id === evaluation.employeeId)
                        const avgRequired = evaluation.diemYC || evaluation.avgRequired || 0
                        const avgAchieved = evaluation.diemKQ || evaluation.avgAchieved || 0
                        const result = avgAchieved >= avgRequired ? 'Đạt' : 'Cần cải thiện'

                        return (
                          <tr key={evaluation.id}>
                            <td>{idx + 1}</td>
                            <td>{escapeHtml(evaluation.period || '-')}</td>
                            <td>{evaluation.employeeCode || evaluation.employeeId || '-'}</td>
                            <td>{employee ? (employee.ho_va_ten || employee.name || '-') : (evaluation.employeeName || '-')}</td>
                            <td>{escapeHtml(evaluation.department || '-')}</td>
                            <td>{escapeHtml(evaluation.position || '-')}</td>
                            <td style={{ fontWeight: 'bold' }}>{avgRequired.toFixed(1)}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{avgAchieved.toFixed(1)}</td>
                            <td>
                              <span className={`badge ${result === 'Đạt' ? 'badge-success' : 'badge-warning'}`}>
                                {result}
                              </span>
                            </td>
                            <td>{evaluation.evaluationDate ? new Date(evaluation.evaluationDate).toLocaleDateString('vi-VN') : '-'}</td>
                            <td>
                              <div className="actions">
                                <button
                                  className="view"
                                  onClick={() => {
                                    setSelectedEvaluationDetail(evaluation)
                                    setIsEvaluationDetailModalOpen(true)
                                  }}
                                  title="Xem chi tiết"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button
                                  className="edit"
                                  onClick={() => {
                                    const emp = employees.find(e => e.id === evaluation.employeeId)
                                    setAssessmentForm({ ...evaluation })
                                    // Load items based on the saved position (or employee position if missing) and department
                                    loadAssessmentItems(evaluation.position || (emp ? emp.vi_tri : ''), evaluation.department, evaluation.items)
                                    // Scroll to top to see Bảng 1
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                  }}
                                  title="Sửa (Load lên Bảng 1)"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="11" className="empty-state">Chưa có đánh giá năng lượng</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      }

      {/* Tab 3: Đào tạo nội bộ */}
      {
        activeTab === 'training' && (
          <>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <h3 className="card-title">Bảng 1: Danh sách chương trình đào tạo</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã chương trình</th>
                    <th>Tên chương trình đào tạo</th>
                    <th>Hình thức đào tạo</th>
                    <th>Đơn vị đào tạo</th>
                    <th>Thời gian bắt đầu</th>
                    <th>Thời gian kết thúc</th>
                    <th>Mục tiêu đào tạo</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingPrograms.length > 0 ? (
                    trainingPrograms.map((training, idx) => (
                      <tr key={training.id}>
                        <td>{idx + 1}</td>
                        <td>{escapeHtml(training.code || training.id || '-')}</td>
                        <td>{escapeHtml(training.name || '-')}</td>
                        <td>{escapeHtml(training.format || training.hinhThuc || '-')}</td>
                        <td>{escapeHtml(training.provider || training.donVi || '-')}</td>
                        <td>{training.startDate ? new Date(training.startDate).toLocaleDateString('vi-VN') : '-'}</td>
                        <td>{training.endDate ? new Date(training.endDate).toLocaleDateString('vi-VN') : '-'}</td>
                        <td>{escapeHtml(training.objective || training.mucTieu || '-')}</td>
                        <td>
                          <span className={`badge ${training.status === 'Đã kết thúc' ? 'badge-success' :
                            training.status === 'Đang diễn ra' ? 'badge-info' :
                              training.status === 'Sắp diễn ra' ? 'badge-warning' :
                                'badge-danger'
                            }`}>
                            {escapeHtml(training.status || '-')}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="edit"
                              onClick={() => {
                                setSelectedTraining(training)
                                setIsTrainingModalOpen(true)
                              }}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="delete"
                              onClick={() => handleDeleteTraining(training.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                            <button
                              className="view"
                              onClick={() => {
                                setSelectedTraining(training)
                                setParticipantInitialView('participants')
                                setIsParticipantModalOpen(true)
                              }}
                              title="Gán học viên"
                            >
                              <i className="fas fa-user-plus"></i>
                            </button>
                            {training.status === 'Đã kết thúc' && (
                              <button
                                className="view"
                                onClick={() => {
                                  setSelectedTraining(training)
                                  setParticipantInitialView('results')
                                  setIsParticipantModalOpen(true)
                                }}
                                title="Xem chi tiết & kết quả"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="empty-state">Chưa có chương trình đào tạo</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bảng 2: Danh sách học viên tham gia */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Bảng 2: Danh sách học viên tham gia</h3>
                <select
                  value={filterTrainingProgram}
                  onChange={(e) => setFilterTrainingProgram(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px' }}
                >
                  <option value="">Tất cả chương trình</option>
                  {trainingPrograms.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.code}</option>
                  ))}
                </select>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã NV</th>
                    <th>Họ và tên</th>
                    <th>Bộ phận</th>
                    <th>Vị trí</th>
                    <th>Chương trình đào tạo</th>
                    <th>Tình trạng tham gia</th>
                    <th>Tỷ lệ tham dự (%)</th>
                    <th>Ghi chú</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((participant, idx) => {
                      const employee = employees.find(e => e.id === participant.employeeId)
                      const training = trainingPrograms.find(t => t.id === participant.trainingProgramId)
                      return (
                        <tr key={participant.id}>
                          <td>{idx + 1}</td>
                          <td>{participant.employeeId || '-'}</td>
                          <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                          <td>{employee ? (employee.bo_phan || '-') : '-'}</td>
                          <td>{employee ? (employee.vi_tri || '-') : '-'}</td>
                          <td>{training ? (training.name || '-') : '-'}</td>
                          <td>
                            <span className={`badge ${participant.status === 'Đã tham gia' ? 'badge-success' :
                              participant.status === 'Vắng' ? 'badge-danger' :
                                'badge-warning'
                              }`}>
                              {escapeHtml(participant.status || '-')}
                            </span>
                          </td>
                          <td>{participant.attendanceRate || participant.tyLeThamDu || 0}%</td>
                          <td>{escapeHtml(participant.note || participant.ghiChu || '-')}</td>
                          <td>
                            <div className="actions">
                              <button
                                className="view"
                                onClick={() => {
                                  setSelectedTraining(training)
                                  setIsParticipantReadOnly(true)
                                  setIsParticipantModalOpen(true)
                                }}
                                title="Xem chi tiết"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="edit"
                                onClick={() => {
                                  setSelectedTraining(training)
                                  setIsParticipantReadOnly(false)
                                  setIsParticipantModalOpen(true)
                                }}
                                title="Cập nhật trạng thái"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="delete"
                                onClick={() => {
                                  if (confirm('Bạn có chắc muốn xóa học viên này khỏi chương trình đào tạo?')) {
                                    fbDelete(`hr/trainingParticipants/${participant.id}`).then(() => {
                                      loadData()
                                      alert('Đã xóa học viên khỏi chương trình')
                                    }).catch(err => alert('Lỗi: ' + err.message))
                                  }
                                }}
                                title="Xóa học viên"
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
                      <td colSpan="10" className="empty-state">Chưa có học viên tham gia</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )
      }

      {/* Modals */}




      <EvaluationDetailModal
        evaluation={selectedEvaluationDetail}
        employee={selectedEvaluationDetail ? employees.find(e => e.id === selectedEvaluationDetail.employeeId) : null}
        competencyFramework={competencyFramework}
        isOpen={isEvaluationDetailModalOpen}
        onClose={() => {
          setIsEvaluationDetailModalOpen(false)
          setSelectedEvaluationDetail(null)
        }}
      />

      <TrainingProgramModal
        training={selectedTraining}
        isOpen={isTrainingModalOpen}
        onClose={() => {
          setIsTrainingModalOpen(false)
          setSelectedTraining(null)
        }}
        onSave={loadData}
      />

      <TrainingParticipantModal
        training={selectedTraining}
        employees={employees}
        trainingPrograms={trainingPrograms}
        isOpen={isParticipantModalOpen}
        onClose={() => {
          setIsParticipantModalOpen(false)
          setSelectedTraining(null)
          setIsParticipantReadOnly(false)
        }}
        onSave={loadData}
        readOnly={isParticipantReadOnly}
      />
      <CompetencyFrameworkModal
        framework={selectedFramework}
        isOpen={isFrameworkModalOpen}
        onClose={() => {
          setIsFrameworkModalOpen(false)
          setSelectedFramework(null)
          setIsFrameworkReadOnly(false)
        }}
        onSave={loadData}
        readOnly={isFrameworkReadOnly}
        employees={employees}
        competencyFramework={competencyFramework}
      />
    </div >
  )
}

export default Competency
