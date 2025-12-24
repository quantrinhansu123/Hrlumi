import { useEffect, useState } from 'react'
import { fbDelete, fbGet, fbPush, fbUpdate } from '../services/firebase'
import { escapeHtml } from '../utils/helpers'

function TrainingParticipantModal({ training, employees, trainingPrograms, isOpen, onClose, onSave, initialView = 'participants', readOnly = false }) {
  const [participants, setParticipants] = useState([])
  const [trainingResults, setTrainingResults] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [activeView, setActiveView] = useState(initialView) // participants or results
  const [searchEmp, setSearchEmp] = useState('')
  const [resultSearch, setResultSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (training) {
        setSelectedProgramId(training.id)
      } else if (trainingPrograms.length > 0) {
        setSelectedProgramId(trainingPrograms[0].id)
      }
      setActiveView(initialView || 'participants')
    }
  }, [isOpen, training, trainingPrograms, initialView])

  useEffect(() => {
    if (isOpen && selectedProgramId) {
      loadParticipants()
      loadTrainingResults()
    }
  }, [isOpen, selectedProgramId])

  const loadParticipants = async () => {
    try {
      const hrData = await fbGet('hr')
      const allParticipants = hrData?.trainingParticipants ? Object.entries(hrData.trainingParticipants).map(([k, v]) => ({ ...v, id: k })) : []
      if (selectedProgramId) {
        setParticipants(allParticipants.filter(p => p.trainingProgramId === selectedProgramId))
      } else {
        setParticipants(allParticipants)
      }
    } catch (error) {
      console.error('Error loading participants:', error)
    }
  }

  const loadTrainingResults = async () => {
    try {
      const hrData = await fbGet('hr')
      const allResults = hrData?.trainingResults ? Object.entries(hrData.trainingResults).map(([k, v]) => ({ ...v, id: k })) : []
      if (selectedProgramId) {
        setTrainingResults(allResults.filter(r => r.trainingProgramId === selectedProgramId))
      } else {
        setTrainingResults(allResults)
      }
    } catch (error) {
      console.error('Error loading results:', error)
    }
  }

  const handleAddParticipant = async (employeeId) => {
    if (!selectedProgramId) {
      alert('Vui lòng chọn chương trình đào tạo')
      return
    }

    try {
      const participantData = {
        employeeId,
        trainingProgramId: selectedProgramId,
        status: 'Đã tham gia',
        attendanceRate: 100,
        note: ''
      }
      await fbPush('hr/trainingParticipants', participantData)
      loadParticipants()
      alert('Đã thêm học viên')
    } catch (error) {
      alert('Lỗi khi thêm học viên: ' + error.message)
    }
  }

  const handleUpdateParticipant = async (participantId, field, value) => {
    try {
      await fbUpdate(`hr/trainingParticipants/${participantId}`, { [field]: value })
      loadParticipants()
    } catch (error) {
      alert('Lỗi khi cập nhật: ' + error.message)
    }
  }

  const handleAddResult = async (employeeId) => {
    if (!selectedProgramId) {
      alert('Vui lòng chọn chương trình đào tạo')
      return
    }

    const score = prompt('Nhập điểm thu hoạch (0-100):')
    if (score === null) return

    const scoreNum = parseInt(score)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      alert('Điểm phải từ 0-100')
      return
    }

    let grade = 'Yếu'
    if (scoreNum >= 90) grade = 'Giỏi'
    else if (scoreNum >= 80) grade = 'Khá'
    else if (scoreNum >= 70) grade = 'Trung bình'

    try {
      const resultData = {
        employeeId,
        trainingProgramId: selectedProgramId,
        score: scoreNum,
        grade,
        evaluation: '',
        applied: 'Có',
        evaluator: 'Giảng viên'
      }
      await fbPush('hr/trainingResults', resultData)
      loadTrainingResults()
      alert('Đã thêm kết quả đánh giá')
    } catch (error) {
      alert('Lỗi khi thêm kết quả: ' + error.message)
    }
  }

  if (!isOpen) return null

  const currentParticipants = selectedProgramId
    ? participants.filter(p => p.trainingProgramId === selectedProgramId)
    : participants

  const currentResults = selectedProgramId
    ? trainingResults.filter(r => r.trainingProgramId === selectedProgramId)
    : trainingResults

  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-user-plus"></i>
            {training ? (readOnly ? `Chi tiết học viên - ${training.name}` : `Gán học viên - ${training.name}`) : 'Gán học viên & Kết quả đào tạo'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {!training && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Chọn chương trình đào tạo</label>
              <select
                value={selectedProgramId}
                onChange={(e) => {
                  setSelectedProgramId(e.target.value)
                  loadParticipants()
                  loadTrainingResults()
                }}
                style={{ width: '100%', padding: '10px' }}
                disabled={readOnly}
              >
                <option value="">Chọn chương trình</option>
                {trainingPrograms.map(t => (
                  <option key={t.id} value={t.id}>{t.name || t.code}</option>
                ))}
              </select>
            </div>
          )}

          <div className="tabs" style={{ marginBottom: '20px' }}>
            <div
              className={`tab ${activeView === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveView('participants')}
            >
              👥 Học viên tham gia
            </div>
            <div
              className={`tab ${activeView === 'results' ? 'active' : ''}`}
              onClick={() => setActiveView('results')}
            >
              📊 Kết quả đánh giá
            </div>
          </div>

          {activeView === 'participants' && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <h4>Bảng 2: Danh sách học viên tham gia</h4>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Tìm nhân viên theo tên/mã"
                      value={searchEmp}
                      onChange={(e) => setSearchEmp(e.target.value)}
                      style={{ padding: '8px', flex: '1', minWidth: '220px' }}
                    />
                    <select
                      onChange={(e) => {
                        const empId = e.target.value
                        if (empId) {
                          handleAddParticipant(empId)
                          e.target.value = ''
                        }
                      }}
                      style={{ padding: '8px', minWidth: '220px' }}
                    >
                      <option value="">+ Thêm học viên</option>
                      {employees
                        .filter(emp => !currentParticipants.some(p => p.employeeId === emp.id))
                        .filter(emp => {
                          if (!searchEmp) return true
                          const q = searchEmp.toLowerCase()
                          const name = (emp.ho_va_ten || emp.name || '').toLowerCase()
                          const code = (emp.ma_nhan_vien || emp.employeeCode || emp.code || '').toLowerCase()
                          return name.includes(q) || code.includes(q)
                        })
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {(emp.ma_nhan_vien || emp.employeeCode || emp.code || emp.id) + ' - ' + (emp.ho_va_ten || emp.name || 'N/A')}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã NV</th>
                    <th>Họ và tên</th>
                    <th>Bộ phận</th>
                    <th>Vị trí</th>
                    <th>Tình trạng tham gia</th>
                    <th>Tỷ lệ tham dự (%)</th>
                    <th>Ghi chú</th>
                    {!readOnly && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentParticipants.length > 0 ? (
                    currentParticipants.map((participant, idx) => {
                      const employee = employees.find(e => e.id === participant.employeeId)
                      return (
                        <tr key={participant.id}>
                          <td>{idx + 1}</td>
                          <td>{participant.employeeId || '-'}</td>
                          <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                          <td>{employee ? (employee.bo_phan || '-') : '-'}</td>
                          <td>{employee ? (employee.vi_tri || '-') : '-'}</td>
                          <td>
                            <select
                              value={participant.status || 'Đã tham gia'}
                              onChange={(e) => handleUpdateParticipant(participant.id, 'status', e.target.value)}
                              disabled={readOnly}
                            >
                              <option value="Đã tham gia">Đã tham gia</option>
                              <option value="Vắng">Vắng</option>
                              <option value="Đang tham gia">Đang tham gia</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              value={participant.attendanceRate || participant.tyLeThamDu || 0}
                              onChange={(e) => handleUpdateParticipant(participant.id, 'attendanceRate', parseInt(e.target.value) || 0)}
                              min="0"
                              max="100"
                              style={{ width: '80px' }}
                              disabled={readOnly}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={participant.note || participant.ghiChu || ''}
                              onChange={(e) => handleUpdateParticipant(participant.id, 'note', e.target.value)}
                              placeholder={readOnly ? "" : "Ghi chú"}
                              style={{ width: '150px' }}
                              disabled={readOnly}
                            />
                          </td>
                          {!readOnly && (
                            <td>
                              <button
                                className="delete"
                                onClick={async () => {
                                  if (confirm('Xóa học viên này?')) {
                                    try {
                                      await fbDelete(`hr/trainingParticipants/${participant.id}`)
                                      loadParticipants()
                                    } catch (error) {
                                      alert('Lỗi khi xóa: ' + error.message)
                                    }
                                  }
                                }}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={readOnly ? 8 : 9} className="empty-state">Chưa có học viên tham gia</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeView === 'results' && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <h4>Bảng 3: Kết quả đánh giá sau đào tạo</h4>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                    <select
                      onChange={(e) => {
                        const empId = e.target.value
                        if (empId) {
                          handleAddResult(empId)
                          e.target.value = ''
                        }
                      }}
                      style={{ padding: '8px', minWidth: '220px' }}
                    >
                      <option value="">+ Thêm kết quả đánh giá</option>
                      {currentParticipants.map(p => {
                        const employee = employees.find(e => e.id === p.employeeId)
                        const hasResult = currentResults.some(r => r.employeeId === p.employeeId)
                        if (hasResult) return null
                        return (
                          <option key={p.employeeId} value={p.employeeId}>
                            {employee ? (employee.ho_va_ten || employee.name || 'N/A') : p.employeeId}
                          </option>
                        )
                      })}
                    </select>
                    <input
                      type="text"
                      placeholder="Tìm theo tên/mã NV"
                      value={resultSearch}
                      onChange={(e) => setResultSearch(e.target.value)}
                      style={{ padding: '8px', minWidth: '220px', flex: '1' }}
                    />
                  </div>
                )}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã NV</th>
                    <th>Họ và tên</th>
                    <th>Chương trình đào tạo</th>
                    <th>Điểm Thu hoạch</th>
                    <th>Xếp loại</th>
                    <th>Đánh giá sau đào tạo</th>
                    <th>Áp dụng vào công việc</th>
                    <th>Người đánh giá</th>
                    {!readOnly && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentResults
                    .filter(r => {
                      if (!resultSearch) return true
                      const q = resultSearch.toLowerCase()
                      const emp = employees.find(e => e.id === r.employeeId)
                      const name = (emp?.ho_va_ten || emp?.name || '').toLowerCase()
                      const code = (r.employeeId || '').toLowerCase()
                      return name.includes(q) || code.includes(q)
                    })
                    .length > 0 ? (
                    currentResults
                      .filter(r => {
                        if (!resultSearch) return true
                        const q = resultSearch.toLowerCase()
                        const emp = employees.find(e => e.id === r.employeeId)
                        const name = (emp?.ho_va_ten || emp?.name || '').toLowerCase()
                        const code = (r.employeeId || '').toLowerCase()
                        return name.includes(q) || code.includes(q)
                      })
                      .map((result, idx) => {
                        const employee = employees.find(e => e.id === result.employeeId)
                        const training = trainingPrograms.find(t => t.id === result.trainingProgramId)
                        return (
                          <tr key={result.id}>
                            <td>{idx + 1}</td>
                            <td>{result.employeeId || '-'}</td>
                            <td>{employee ? (employee.ho_va_ten || employee.name || '-') : '-'}</td>
                            <td>{training ? (training.name || '-') : '-'}</td>
                            <td>{result.score || result.diemThuHoach || '-'}</td>
                            <td>
                              <span className={`badge ${result.grade === 'Giỏi' ? 'badge-success' :
                                  result.grade === 'Khá' ? 'badge-info' :
                                    result.grade === 'Trung bình' ? 'badge-warning' :
                                      'badge-danger'
                                }`}>
                                {escapeHtml(result.grade || result.xepLoai || '-')}
                              </span>
                            </td>
                            <td>{escapeHtml(result.evaluation || result.danhGia || '-')}</td>
                            <td>{escapeHtml(result.applied || result.apDung || '-')}</td>
                            <td>{escapeHtml(result.evaluator || result.nguoiDanhGia || '-')}</td>
                            {!readOnly && (
                              <td>
                                <button
                                  className="edit"
                                  onClick={async () => {
                                    const newEvaluation = prompt('Nhập đánh giá sau đào tạo:', result.evaluation || '')
                                    if (newEvaluation !== null) {
                                      try {
                                        await fbUpdate(`hr/trainingResults/${result.id}`, { evaluation: newEvaluation })
                                        loadTrainingResults()
                                      } catch (error) {
                                        alert('Lỗi khi cập nhật: ' + error.message)
                                      }
                                    }
                                  }}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })
                  ) : (
                    <tr>
                      <td colSpan={readOnly ? 9 : 10} className="empty-state">Chưa có kết quả đánh giá</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>
            {readOnly ? 'Đóng' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrainingParticipantModal

