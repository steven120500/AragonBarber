import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient'; // Ajusta la ruta si es diferente

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Conexión real con Supabase para iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Correo o contraseña incorrectos.');
      setLoading(false);
    } else {
      // Si el login es exitoso, lo enviamos a la Landing Page (Modo Dios)
      navigate('/');
    }
  };

  return (
    <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--black)', padding: '2rem' }}>
      <div className="booking-form-elegant" style={{ width: '100%', maxWidth: '400px', margin: '0' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="nav-logo" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>
            ARAGON<span> ADMIN</span>
          </h1>
          <p className="section-tag" style={{ margin: 0 }}>Acceso exclusivo</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,0,0,0.1)', color: '#ff4444', padding: '1rem', border: '1px solid #ff4444', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group" style={{ gap: '0.5rem' }}>
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="barbero@aragon.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ gap: '0.5rem' }}>
            <label>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Validando...' : 'Entrar al Sistema'}
          </button>
        </form>
        
      </div>
    </div>
  );
}