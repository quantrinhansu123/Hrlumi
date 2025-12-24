import { formatMoney } from '../utils/helpers'

import { useEffect, useState } from 'react'
import { fbUpdate } from '../services/firebase'

function KPIResultDetailModal({ result, employees, kpiTemplates, isOpen, onClose, kpiConversions = [], isEditing = false, onSave }) {
    const [editedResults, setEditedResults] = useState({})

    useEffect(() => {
        if (isOpen && result && result.kpiResults) {
            setEditedResults(JSON.parse(JSON.stringify(result.kpiResults)))
        }
    }, [isOpen, result])

    if (!isOpen || !result) return null

    const employee = employees.find(e => e.id === result.employeeId)

    // Calculate total score based on current edited state
    const calculateTotalScore = () => {
        if (!editedResults) return 0
        return Object.values(editedResults).reduce((sum, res) => {
            // If weight is not stored in result, find it from template.
            // But result usually stores weight.
            // We need to use formula: conversionPercent * weight / 100
            const template = kpiTemplates.find(t => t.id === res.kpiId || t.code === res.kpiId)
            const weight = template?.weight || res.weight || 0
            const conversion = res.conversionPercent || 0
            return sum + (conversion * weight / 100)
        }, 0)
    }

    const currentTotalScore = calculateTotalScore()

    const getConversion = (kpiId, actual, target) => {
        const template = kpiTemplates.find(t => t.id === kpiId || t.code === kpiId)
        if (!template) return 0
        const conversions = kpiConversions.filter(c => c.kpiId === template.id || c.kpiCode === template.code)

        let percent = 0
        if (template.unit === 'Percent' || template.unit === '%') {
            // Simple calculation if no conversion table? 
            // Or assumes actual is the %? 
            // Default logic usually: (Actual / Target) * 100
            if (target > 0) percent = (actual / target) * 100
            else percent = 0
        } else {
            if (target > 0) percent = (actual / target) * 100
        }

        // Apply conversion table if exists
        if (conversions.length > 0) {
            // Find matching range
            // Logic: find row where actual percent falls into [from, to]
            // Actually usually based on % completion (actual/target)*100

            // Re-calculate basic completion percent
            let completion = 0
            if (target !== 0) completion = (actual / target) * 100

            const match = conversions.find(c => {
                const from = parseFloat(c.fromPercent)
                const to = c.toPercent ? parseFloat(c.toPercent) : Infinity
                return completion >= from && completion <= to
            })

            if (match) return parseFloat(match.conversionPercent)

            // If explicit ranges defined but no match? Usually 0 or max?
            // Fallback to completion if no table?
            // If table exists but no match, usually means 0
            return 0
        }

        // Default: cap at 100? or allow > 100?
        // Usually KPI allows > 100%
        return parseFloat(percent.toFixed(2))
    }

    const handleChangeActual = (kpiId, value) => {
        const val = parseFloat(value)
        setEditedResults(prev => {
            const current = prev[kpiId] || {}
            // Recalculate completion and conversion
            const target = current.target || 0
            let completion = 0
            if (target !== 0) completion = (val / target) * 100

            const conversion = getConversion(kpiId, val, target)

            return {
                ...prev,
                [kpiId]: {
                    ...current,
                    actual: val,
                    completionPercent: parseFloat(completion.toFixed(2)),
                    conversionPercent: conversion
                }
            }
        })
    }

    const handleSaveFunc = async () => {
        try {
            const totalKPI = calculateTotalScore()
            await fbUpdate(`hr/kpiResults/${result.id}`, {
                kpiResults: editedResults,
                totalKPI: parseFloat(totalKPI.toFixed(2))
            })
            if (onSave) onSave()
            onClose()
            alert('Đã cập nhật kết quả đánh giá')
        } catch (error) {
            alert('Lỗi cập nhật: ' + error.message)
        }
    }

    return (
        <div className="modal show" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
                <div className="modal-header">
                    <h3>
                        <i className="fas fa-chart-line"></i>
                        {isEditing ? 'Cập nhật Kết quả KPI' : 'Chi tiết Kết quả KPI'} - {employee ? (employee.ho_va_ten || employee.name) : 'N/A'}
                    </h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '20px', background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                        <div><strong>Mã NV:</strong> {result.employeeId}</div>
                        <div><strong>Tháng:</strong> {result.month}</div>
                        <div><strong>Bộ phận:</strong> {employee?.bo_phan || employee?.department}</div>
                        <div><strong>Tổng điểm:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{(isEditing ? currentTotalScore : (result.totalKPI || 0)).toFixed(1)}%</span></div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tên KPI</th>
                                    <th>Kế hoạch</th>
                                    <th>Thực tế</th>
                                    <th>Tỷ lệ hoàn thành</th>
                                    <th>% Quy đổi KPI</th>
                                    <th>Trọng số</th>
                                    <th>Nguồn dữ liệu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kpiTemplates.filter(t => t.status === 'Đang áp dụng').map((template, idx) => {
                                    // Use editedResults if editing, else result.kpiResults
                                    const source = isEditing ? editedResults : result.kpiResults
                                    const kpiRes = source?.[template.id] || source?.[template.code]

                                    if (!kpiRes) return null

                                    return (
                                        <tr key={template.id}>
                                            <td>{idx + 1}</td>
                                            <td>
                                                <div>{template.name}</div>
                                                <small style={{ color: '#666' }}>{template.code}</small>
                                            </td>
                                            <td>
                                                {template.unit === 'VNĐ' || template.unit === 'VND'
                                                    ? formatMoney(kpiRes.target)
                                                    : kpiRes.target} {template.unit}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={kpiRes.actual}
                                                        onChange={(e) => handleChangeActual(template.id, e.target.value)}
                                                        style={{ width: '100px', fontWeight: 'bold' }}
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 'bold' }}>
                                                        {template.unit === 'VNĐ' || template.unit === 'VND'
                                                            ? formatMoney(kpiRes.actual)
                                                            : kpiRes.actual}
                                                    </span>
                                                )}
                                                {template.unit !== 'VNĐ' && template.unit !== 'VND' ? ` ${template.unit}` : ''}
                                            </td>
                                            <td>
                                                <span className={`badge ${kpiRes.completionPercent >= 100 ? 'badge-success' : 'badge-warning'}`}>
                                                    {kpiRes.completionPercent}%
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                                {kpiRes.conversionPercent}%
                                            </td>
                                            <td>{template.weight}%</td>
                                            <td style={{ fontStyle: 'italic', color: '#666' }}>
                                                {kpiRes.source || 'Hệ thống'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="btn" onClick={onClose}>Đóng</button>
                    {isEditing && (
                        <button className="btn btn-primary" onClick={handleSaveFunc}>
                            <i className="fas fa-save"></i> Lưu thay đổi
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default KPIResultDetailModal
