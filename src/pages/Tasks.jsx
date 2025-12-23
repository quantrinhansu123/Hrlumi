import React, { useState, useEffect } from 'react'
import { fbGet, fbDelete } from '../services/firebase'
import { escapeHtml } from '../utils/helpers'
import TaskModal from '../components/TaskModal'
import TaskDetailModal from '../components/TaskDetailModal'
import SeedTaskDataButton from '../components/SeedTaskDataButton'

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [taskLogs, setTaskLogs] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false)
  
  // Selected items
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null)
  
  // Filters
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

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

      // Load tasks
      const hrData = await fbGet('hr')
      const tasksList = hrData?.tasks ? Object.entries(hrData.tasks).map(([k,v]) => ({...v, id: k})) : []
      setTasks(tasksList)

      // Load task logs
      const logsList = hrData?.taskLogs ? Object.entries(hrData.taskLogs).map(([k,v]) => ({...v, id: k})) : []
      setTaskLogs(logsList)

      setLoading(false)
    } catch (error) {
      console.error('Error loading task data:', error)
      setLoading(false)
    }
  }

  const handleDeleteTask = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa công việc này?')) return
    try {
      await fbDelete(`hr/tasks/${id}`)
      loadData()
      alert('Đã xóa công việc')
    } catch (error) {
      alert('Lỗi khi xóa: ' + error.message)
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterDept && task.department !== filterDept) return false
    if (filterStatus && task.status !== filterStatus) return false
    if (filterAssignee && task.assigneeId !== filterAssignee) return false
    if (filterPriority && task.priority !== filterPriority) return false
    return true
  })

  // Get task logs for a task
  const getTaskLogs = (taskId) => {
    return taskLogs.filter(log => log.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0))
  }

  // Get employee name
  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId)
    return emp ? (emp.ho_va_ten || emp.name || 'N/A') : employeeId || 'N/A'
  }

  // Check if task is overdue
  const isOverdue = (task) => {
    if (!task.deadline || task.status === 'Đã xong' || task.status === 'Đã hoàn thành') return false
    const deadline = new Date(task.deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadline.setHours(0, 0, 0, 0)
    return deadline < today
  }

  if (loading) {
    return <div className="loadingState">Đang tải dữ liệu...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-clipboard-list"></i>
          Quản trị Giao việc
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setSelectedTask(null)
              setIsTaskModalOpen(true)
            }}
          >
            <i className="fas fa-plus"></i>
            Tạo Task mới
          </button>
          <SeedTaskDataButton employees={employees} onComplete={loadData} />
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="search-box" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select 
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px' }}
          >
            <option value="">Tất cả bộ phận</option>
            {[...new Set(tasks.map(t => t.department).filter(Boolean))].sort().map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px' }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Chưa bắt đầu">Chưa bắt đầu</option>
            <option value="Đang làm">Đang làm</option>
            <option value="Đã xong">Đã xong</option>
            <option value="Đã hoàn thành">Đã hoàn thành</option>
            <option value="Quá hạn">Quá hạn</option>
            <option value="Tạm dừng">Tạm dừng</option>
          </select>

          <select 
            value={filterAssignee} 
            onChange={(e) => setFilterAssignee(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px' }}
          >
            <option value="">Tất cả người nhận</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.ho_va_ten || emp.name || 'N/A'}
              </option>
            ))}
          </select>

          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px' }}
          >
            <option value="">Tất cả mức ưu tiên</option>
            <option value="Cao">Cao</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Thấp">Thấp</option>
          </select>

          <button 
            className="btn btn-sm"
            onClick={() => {
              setFilterDept('')
              setFilterStatus('')
              setFilterAssignee('')
              setFilterPriority('')
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã công việc</th>
              <th>Tên công việc</th>
              <th>Bộ phận</th>
              <th>Người giao</th>
              <th>Người nhận</th>
              <th>Mức ưu tiên</th>
              <th>Ngày bắt đầu</th>
              <th>Deadline</th>
              <th>Trạng thái</th>
              <th>Link file kết quả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task, idx) => {
                const overdue = isOverdue(task)
                const status = overdue && task.status !== 'Đã xong' && task.status !== 'Đã hoàn thành' 
                  ? 'Quá hạn' 
                  : task.status
                
                return (
                  <tr key={task.id} style={overdue ? { backgroundColor: '#fff3cd' } : {}}>
                    <td>{idx + 1}</td>
                    <td>{escapeHtml(task.code || task.id || '-')}</td>
                    <td>{escapeHtml(task.name || task.title || '-')}</td>
                    <td>{escapeHtml(task.department || '-')}</td>
                    <td>{escapeHtml(task.assignerName || getEmployeeName(task.assignerId) || '-')}</td>
                    <td>{escapeHtml(getEmployeeName(task.assigneeId) || '-')}</td>
                    <td>
                      <span className={`badge ${
                        task.priority === 'Cao' ? 'badge-danger' :
                        task.priority === 'Trung bình' ? 'badge-warning' :
                        'badge-info'
                      }`}>
                        {escapeHtml(task.priority || '-')}
                      </span>
                    </td>
                    <td>{task.startDate ? new Date(task.startDate).toLocaleDateString('vi-VN') : '-'}</td>
                    <td style={overdue ? { color: 'var(--danger)', fontWeight: 'bold' } : {}}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td>
                      <span className={`badge ${
                        status === 'Đã xong' || status === 'Đã hoàn thành' ? 'badge-success' :
                        status === 'Đang làm' ? 'badge-info' :
                        status === 'Quá hạn' ? 'badge-danger' :
                        status === 'Tạm dừng' ? 'badge-warning' :
                        'badge-secondary'
                      }`}>
                        {escapeHtml(status || '-')}
                      </span>
                    </td>
                    <td>
                      {task.resultFileLink ? (
                        <a 
                          href={task.resultFileLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)' }}
                        >
                          <i className="fas fa-link"></i> Link
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <button 
                          className="edit"
                          onClick={() => {
                            setSelectedTask(task)
                            setIsTaskModalOpen(true)
                          }}
                          title="Sửa"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="view"
                          onClick={() => {
                            setSelectedTaskForDetail(task)
                            setIsTaskDetailModalOpen(true)
                          }}
                          title="Xem chi tiết"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="delete"
                          onClick={() => handleDeleteTask(task.id)}
                          title="Xóa"
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
                <td colSpan="12" className="empty-state">Chưa có công việc nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <TaskModal
        task={selectedTask}
        employees={employees}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setSelectedTask(null)
        }}
        onSave={loadData}
      />

      <TaskDetailModal
        task={selectedTaskForDetail}
        employees={employees}
        taskLogs={getTaskLogs(selectedTaskForDetail?.id)}
        isOpen={isTaskDetailModalOpen}
        onClose={() => {
          setIsTaskDetailModalOpen(false)
          setSelectedTaskForDetail(null)
        }}
        onSave={loadData}
      />
    </div>
  )
}

export default Tasks
