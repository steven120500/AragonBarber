import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Eye, EyeOff, X, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import '../../components/admin/admin.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // Si ya hay una sesión abierta, no tiene sentido mostrar el login: directo al panel
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/admin/citas', { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Conexión real con Supabase para iniciar sesión
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Correo o contraseña incorrectos.');
      setLoading(false);
    } else {
      // Login exitoso: directo al panel de citas
      navigate('/admin/citas');
    }
  };

  return (
    <div className="adm login-page">
      <div className="login-card adm-anim">
        <button type="button" onClick={() => navigate('/')} className="adm-modal-close" title="Volver al inicio" aria-label="Volver al inicio">
          <X size={18} />
        </button>

        <img src="/Logo.png" alt="Aragon Barber Studio" className="login-logo" draggable="false" />
        <p className="adm-eyebrow" style={{ textAlign: 'center', marginBottom: '0.4rem' }}>Acceso exclusivo</p>
        <h1 className="login-title">Panel del barbero</h1>

        {error && (
          <div className="login-error" role="alert">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="adm-form" style={{ gap: '1.1rem' }}>
          <label className="adm-field">
            <span className="adm-label">Correo electrónico</span>
            <span className="login-input-wrap">
              <Mail size={18} className="login-input-icon" />
              <input
                type="email"
                className="adm-input"
                placeholder="barbero@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </span>
          </label>

          <label className="adm-field">
            <span className="adm-label">Contraseña</span>
            <span className="login-input-wrap">
              <Lock size={18} className="login-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="adm-input"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-eye"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button type="submit" className="adm-btn adm-btn--primary adm-btn--block" disabled={loading} style={{ minHeight: '52px', marginTop: '0.6rem' }}>
            {loading ? 'Validando…' : <>Entrar al sistema <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>

      <style>{`
        .login-page {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background:
            radial-gradient(600px 400px at 50% 30%, rgba(245, 245, 220, 0.07), transparent 70%),
            #050505;
        }
        .login-card {
          position: relative;
          width: 100%;
          max-width: 420px;
          background: rgba(13, 13, 13, 0.85);
          border: 1px solid var(--adm-line-strong);
          border-radius: 24px;
          padding: 2.2rem clamp(1.4rem, 5vw, 2.4rem) 2.4rem;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.7);
        }
        .login-logo {
          display: block;
          width: 220px;
          max-width: 70%;
          margin: -1.2rem auto -0.6rem;
        }
        .login-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.9rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1.8rem;
        }
        .login-error {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.8rem 1rem;
          margin-bottom: 1.2rem;
          border-radius: 12px;
          background: var(--adm-red-soft);
          border: 1px solid rgba(255, 92, 92, 0.3);
          color: var(--adm-red);
          font-size: 0.86rem;
        }
        .login-input-wrap { position: relative; display: block; }
        .login-input-icon {
          position: absolute;
          left: 0.95rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--adm-dim);
          pointer-events: none;
        }
        .adm .login-input-wrap .adm-input { padding-left: 2.8rem; }
        .login-eye {
          position: absolute;
          right: 0.6rem;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: none;
          background: transparent;
          color: var(--adm-muted);
          cursor: pointer;
          border-radius: 50%;
        }
        .login-eye:hover { color: var(--adm-text); }
      `}</style>
    </div>
  );
}
