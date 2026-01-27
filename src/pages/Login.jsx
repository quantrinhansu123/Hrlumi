import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const from = location.state?.from?.pathname || '/'

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Use RPC to check credentials safely (bypassing RLS)
            const { data, error } = await supabase
                .rpc('check_credentials', {
                    p_email: email,
                    p_password: password
                })

            if (error) throw error

            if (!data) {
                setError('Email hoặc mật khẩu không chính xác')
            } else {
                login(data)
                navigate(from, { replace: true })
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Đã có lỗi xảy ra. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#f0f2f5'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>LUMI GLOBAL</h2>
                    <p className="text-muted">Đăng nhập hệ thống nhân sự</p>
                </div>

                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Email</label>
                        <input
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nhanvien@lumi.vn"
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Mật khẩu</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            required
                            style={{ width: '100%' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '10px', fontSize: '1.1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Login
