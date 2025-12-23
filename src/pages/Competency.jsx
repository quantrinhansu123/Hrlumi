import React, { useEffect, useState } from 'react'
import CompetencyEvaluationModal from '../components/CompetencyEvaluationModal'
import CompetencyFrameworkModal from '../components/CompetencyFrameworkModal'
import EvaluationDetailModal from '../components/EvaluationDetailModal'
import SeedCompetencyDataButton from '../components/SeedCompetencyDataButton'
import TrainingParticipantModal from '../components/TrainingParticipantModal'
import TrainingProgramModal from '../components/TrainingProgramModal'
import { fbDelete, fbGet } from '../services/firebase'
import { escapeHtml } from '../utils/helpers'

function Competency() {
  const [activeTab, setActiveTab] = useState('framework')
  const [competencyFramework, setCompetencyFramework] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [trainingPrograms, setTrainingPrograms] = useState([])
  const [trainingParticipants, setTrainingParticipants] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isFrameworkModalOpen, setIsFrameworkModalOpen] = useState(false)
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false)
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false)
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false)
  const [isEvaluationDetailModalOpen, setIsEvaluationDetailModalOpen] = useState(false)
  
  // Selected items
  const [selectedFramework, setSelectedFramework] = useState(null)
  const [selectedEvaluation, setSelectedEvaluation] = useState(null)
  const [selectedTraining, setSelectedTraining] = useState(null)
  const [selectedEvaluationDetail, setSelectedEvaluationDetail] = useState(null)
  const [participantInitialView, setParticipantInitialView] = useState('participants')
  
  // Filters
  const [filterDept, setFilterDept] = useState('')
  const [filterEvaluationDept, setFilterEvaluationDept] = useState('')
  const [filterEvaluationPeriod, setFilterEvaluationPeriod] = useState('')
  const [filterTrainingProgram, setFilterTrainingProgram] = useState('')

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

      // Load competency framework
      const hrData = await fbGet('hr')
      const framework = hrData?.competencyFramework ? Object.entries(hrData.competencyFramework).map(([k,v]) => ({...v, id: k})) : []
      setCompetencyFramework(framework)

      // Load evaluations (đổi sang employee_competency_assessment)
      const evals = hrData?.employee_competency_assessment 
        ? Object.entries(hrData.employee_competency_assessment).map(([k,v]) => ({...v, id: k})) 
        : []
      setEvaluations(evals)

      // Load training programs
      const trainings = hrData?.trainings ? Object.entries(hrData.trainings).map(([k,v]) => ({...v, id: k})) : []
      setTrainingPrograms(trainings)

      // Load training participants
      const participants = hrData?.trainingParticipants ? Object.entries(hrData.trainingParticipants).map(([k,v]) => ({...v, id: k})) : []
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

  // Pivot dữ liệu: hàng = (Nhóm năng lực, Tên năng lực), cột = Vị trí
  const positions = [...new Set(filteredFramework.map(c => c.position).filter(Boolean))].sort()

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
  )
  
  // Filter evaluations
  const filteredEvaluations = evaluations.filter(e => {
    if (filterEvaluationDept && e.department !== filterEvaluationDept) return false
    if (filterEvaluationPeriod && e.period !== filterEvaluationPeriod) return false
    return true
  })

  // Filter training participants
  const filteredParticipants = filterTrainingProgram
    ? trainingParticipants.filter(p => p.trainingProgramId === filterTrainingProgram)
    : trainingParticipants

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
            <button 
              className="btn btn-primary"
              onClick={() => {
                setSelectedFramework(null)
                setIsFrameworkModalOpen(true)
              }}
            >
              <i className="fas fa-plus"></i>
              Thêm năng lực
            </button>
            <SeedCompetencyDataButton onComplete={loadData} />
          </>
        )}
        {activeTab === 'evaluation' && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              setSelectedEvaluation(null)
              setIsEvaluationModalOpen(true)
            }}
          >
            <i className="fas fa-plus"></i>
            Nhập đánh giá
          </button>
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
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3 className="card-title">Bảng 1: Khai báo khung năng lực theo vị trí</h3>
            </div>
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
                      <td>{c.level || '-'}</td>
                      <td>
                        <span className={`badge ${c.status === 'Áp dụng' ? 'badge-success' : 'badge-danger'}`}>
                          {escapeHtml(c.status || 'Áp dụng')}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button 
                            className="edit"
                            onClick={() => {
                              setSelectedFramework(c)
                              setIsFrameworkModalOpen(true)
                            }}
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

          {/* Bảng 2: Danh mục khung năng lực theo bộ phận (Ma trận) */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bảng 2: Danh mục khung năng lực theo bộ phận</h3>
              <select 
                value={filterDept} 
                onChange={(e) => setFilterDept(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px' }}
              >
                <option value="">Tất cả bộ phận</option>
                {[...new Set(competencyFramework.map(c => c.department).filter(Boolean))].sort().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            {positions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Nhóm năng lực</th>
                      <th>Tên năng lực</th>
                      {positions.map(pos => (
                        <th key={pos}>{escapeHtml(pos)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pivotRows.length > 0 ? (
                      pivotRows.map((row, idx) => (
                        <tr key={`${row.group}_${row.name}`}>
                          <td>{idx + 1}</td>
                          <td>{escapeHtml(row.group)}</td>
                          <td>{escapeHtml(row.name)}</td>
                          {positions.map(pos => (
                            <td key={pos} style={{ textAlign: 'center' }}>
                              {row.levels[pos] || '–'}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3 + positions.length} className="empty-state">
                          Chưa có dữ liệu để hiển thị ma trận
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">Chưa có dữ liệu để hiển thị ma trận</p>
            )}
          </div>
        </>
      )}

      {/* Tab 2: Đánh giá năng lực */}
      {activeTab === 'evaluation' && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="search-box">
              <select 
                value={filterEvaluationDept} 
                onChange={(e) => setFilterEvaluationDept(e.target.value)}
              >
                <option value="">Tất cả bộ phận</option>
                {[...new Set(evaluations.map(e => e.department).filter(Boolean))].sort().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select 
                value={filterEvaluationPeriod} 
                onChange={(e) => setFilterEvaluationPeriod(e.target.value)}
              >
                <option value="">Tất cả kỳ</option>
                {[...new Set(evaluations.map(e => e.period).filter(Boolean))].sort().map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>
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
                    const avgRequired = evaluation.avgRequired || evaluation.diemYC || 0
                    const avgAchieved = evaluation.avgAchieved || evaluation.diemKQ || 0
                    const result = avgAchieved > avgRequired ? 'Đạt' : 'Cần cải thiện'
                    return (
                      <tr key={evaluation.id}>
                        <td>{idx + 1}</td>
                        <td>{escapeHtml(evaluation.period || '-')}</td>
                        <td>{evaluation.employeeId || '-'}</td>
                        <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                        <td>{escapeHtml(evaluation.department || '-')}</td>
                        <td>{employee ? (employee.vi_tri || '-') : '-'}</td>
                        <td>{avgRequired.toFixed(1)}</td>
                        <td>{avgAchieved.toFixed(1)}</td>
                        <td>
                          <span className={`badge ${result === 'Đạt' ? 'badge-success' : 'badge-warning'}`}>
                            {result}
                          </span>
                        </td>
                        <td>{evaluation.evaluationDate ? new Date(evaluation.evaluationDate).toLocaleDateString('vi-VN') : '-'}</td>
                        <td>
                          <button 
                            className="view"
                            onClick={() => {
                              setSelectedEvaluationDetail(evaluation)
                              setIsEvaluationDetailModalOpen(true)
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
                    <td colSpan="11" className="empty-state">Chưa có đánh giá năng lực</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab 3: Đào tạo nội bộ */}
      {activeTab === 'training' && (
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
                        <span className={`badge ${
                          training.status === 'Đã kết thúc' ? 'badge-success' :
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
                          <span className={`badge ${
                            participant.status === 'Đã tham gia' ? 'badge-success' :
                            participant.status === 'Vắng' ? 'badge-danger' :
                            'badge-warning'
                          }`}>
                            {escapeHtml(participant.status || '-')}
                          </span>
                        </td>
                        <td>{participant.attendanceRate || participant.tyLeThamDu || 0}%</td>
                        <td>{escapeHtml(participant.note || participant.ghiChu || '-')}</td>
                        <td>
                          <button 
                            className="edit"
                            onClick={() => {
                              setSelectedTraining(training)
                              setIsParticipantModalOpen(true)
                            }}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
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
      )}

      {/* Modals */}
      <CompetencyFrameworkModal
        framework={selectedFramework}
        isOpen={isFrameworkModalOpen}
        onClose={() => {
          setIsFrameworkModalOpen(false)
          setSelectedFramework(null)
        }}
        onSave={loadData}
      />

      <CompetencyEvaluationModal
        evaluation={selectedEvaluation}
        employees={employees}
        competencyFramework={competencyFramework}
        isOpen={isEvaluationModalOpen}
        onClose={() => {
          setIsEvaluationModalOpen(false)
          setSelectedEvaluation(null)
        }}
        onSave={loadData}
      />

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
        }}
        onSave={loadData}
      />
    </div>
  )
}

export default Competency
