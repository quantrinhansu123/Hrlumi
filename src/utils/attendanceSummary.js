import { buildSourceEmployeeKey } from './attendanceMatching'

const numberValue = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const attendanceDateString = (log) => {
  if (log?.date) return String(log.date).slice(0, 10)
  if (!log?.timestamp) return ''
  const date = new Date(log.timestamp)
  return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const hasNumericValue = (value) =>
  value !== '' &&
  value !== null &&
  value !== undefined &&
  Number.isFinite(Number(value))

export const summarizeAttendanceDay = (logs) => {
  let hours = 0
  let workdays = 0
  let extraWorkdays = 0
  let lateMinutes = 0
  let earlyMinutes = 0
  let hasSourceWorkday = false
  let hasPunch = false

  logs.forEach(log => {
    const logHours = numberValue(log.tongGio ?? (
      numberValue(log.hours ?? log.soGio ?? log.gio) +
      numberValue(log.gioPlus)
    ))
    hours += logHours
    lateMinutes += numberValue(log.lateMinutes ?? log.vaoTre)
    earlyMinutes += numberValue(log.earlyMinutes ?? log.raSom)
    hasPunch = hasPunch || Boolean(log.checkIn || log.checkOut || log.vao || log.ra)

    if (hasNumericValue(log.cong)) {
      workdays += numberValue(log.cong)
      hasSourceWorkday = true
    }
    if (hasNumericValue(log.congPlus)) {
      extraWorkdays += numberValue(log.congPlus)
      hasSourceWorkday = true
    }
  })

  if (!hasSourceWorkday) {
    workdays = hours >= 7.5 ? 1 : hours >= 3 ? 0.5 : 0
  }

  return {
    hours: Math.round(hours * 100) / 100,
    workdays: Math.round((workdays + extraWorkdays) * 100) / 100,
    regularWorkdays: Math.round(workdays * 100) / 100,
    extraWorkdays: Math.round(extraWorkdays * 100) / 100,
    lateMinutes,
    earlyMinutes,
    late: lateMinutes > 0,
    early: earlyMinutes > 0,
    hasPunch,
    logs
  }
}

export const buildDailyAttendanceMap = (attendanceLogs, month = '') => {
  const grouped = new Map()

  attendanceLogs.forEach(log => {
    const date = attendanceDateString(log)
    if (!date || (month && !date.startsWith(month))) return
    const rawEmployeeId = String(log.employeeId || '')
    const employeeId = rawEmployeeId.startsWith('external:')
      ? `external:${buildSourceEmployeeKey(
          log.sourceEmployeeCode || log.employeeCode || '',
          log.sourceEmployeeName || log.employeeName || log.machineName || ''
        )}`
      : rawEmployeeId
    if (!employeeId) return
    const key = `${employeeId}::${date}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(log)
  })

  return new Map(
    Array.from(grouped.entries()).map(([key, logs]) => [
      key,
      summarizeAttendanceDay(logs)
    ])
  )
}

export const buildAttendanceSummary = ({
  attendanceLogs,
  employees,
  month,
  attendanceAdjustments = {},
  manualWorkdays = {}
}) => {
  if (!month) return []

  const employeesById = new Map(
    employees.map(employee => [String(employee.id), employee])
  )
  const dailyMap = buildDailyAttendanceMap(attendanceLogs, month)
  const summaryByEmployee = new Map()

  dailyMap.forEach((daySummary, key) => {
    const separatorIndex = key.lastIndexOf('::')
    const employeeId = key.slice(0, separatorIndex)
    const date = key.slice(separatorIndex + 2)
    const log = daySummary.logs[0] || {}
    const employee = employeesById.get(employeeId)

    if (!summaryByEmployee.has(employeeId)) {
      summaryByEmployee.set(employeeId, {
        employeeId,
        employeeCode:
          employee?.employeeId ||
          employee?.username ||
          log.employeeCode ||
          '',
        employeeName:
          employee?.ho_va_ten ||
          employee?.name ||
          log.employeeName ||
          log.sourceEmployeeName ||
          '',
        department:
          employee?.bo_phan ||
          employee?.department ||
          log.department ||
          '',
        branch:
          employee?.chi_nhanh ||
          employee?.branch ||
          '',
        attendanceDays: 0,
        workdays: 0,
        totalHours: 0,
        lateCount: 0,
        lateMinutes: 0,
        earlyCount: 0,
        earlyMinutes: 0,
        days: new Map()
      })
    }

    const row = summaryByEmployee.get(employeeId)
    row.days.set(date, daySummary)
  })

  summaryByEmployee.forEach(row => {
    const permissionDays = String(attendanceAdjustments[row.employeeId] || '')
      .split(',')
      .map(value => Number.parseInt(value.trim(), 10))
      .filter(Number.isFinite)

    permissionDays.forEach(day => {
      const date = `${month}-${String(day).padStart(2, '0')}`
      const current = row.days.get(date) || summarizeAttendanceDay([])
      row.days.set(date, {
        ...current,
        workdays: numberValue(manualWorkdays[row.employeeId]?.[day] ?? 1)
      })
    })

    row.days.forEach(day => {
      row.workdays += day.workdays
      row.totalHours += day.hours
      row.attendanceDays += day.hasPunch || day.workdays > 0 ? 1 : 0
      row.lateCount += day.late ? 1 : 0
      row.lateMinutes += day.lateMinutes
      row.earlyCount += day.early ? 1 : 0
      row.earlyMinutes += day.earlyMinutes
    })

    row.workdays = Math.round(row.workdays * 100) / 100
    row.totalHours = Math.round(row.totalHours * 100) / 100
  })

  return Array.from(summaryByEmployee.values()).sort((left, right) =>
    left.employeeName.localeCompare(right.employeeName, 'vi')
  )
}
