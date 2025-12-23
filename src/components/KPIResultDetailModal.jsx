import { formatMoney } from '../utils/helpers'

function KPIResultDetailModal({ result, employees, kpiTemplates, isOpen, onClose }) {
    if (!isOpen || !result) return null

    const employee = employees.find(e => e.id === result.employeeId)

    // Calculate total weight for verify
    const totalWeight = Object.values(result.kpiResults || {}).reduce((sum, res) => {
        const template = kpiTemplates.find(t => t.id === res.kpiId || t.code === res.kpiId)
        return sum + (template?.weight || 0)
    }, 0)

    return (
        <div className="modal show" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
                <div className="modal-header">
                    <h3>
                        <i className="fas fa-chart-line"></i>
                        Bảng 2: Kết quả KPI Chi tiết - {employee ? (employee.ho_va_ten || employee.name) : 'N/A'}
                    </h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '20px', background: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
                        <div><strong>Mã NV:</strong> {result.employeeId}</div>
                        <div><strong>Tháng:</strong> {result.month}</div>
                        <div><strong>Bộ phận:</strong> {employee?.bo_phan || employee?.department}</div>
                        <div><strong>Tổng điểm:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{(result.totalKPI || 0).toFixed(1)}%</span></div>
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
                                    const kpiRes = result.kpiResults?.[template.id] || result.kpiResults?.[template.code]
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
                                            <td style={{ fontWeight: 'bold' }}>
                                                {template.unit === 'VNĐ' || template.unit === 'VND'
                                                    ? formatMoney(kpiRes.actual)
                                                    : kpiRes.actual} {template.unit !== 'VNĐ' && template.unit !== 'VND' ? template.unit : ''}
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
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    )
}

export default KPIResultDetailModal
