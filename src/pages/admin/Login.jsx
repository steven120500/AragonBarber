import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Eye, EyeOff, X } from 'lucide-react'; // Importamos los íconos necesarios

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Nuevo estado para controlar la visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false); 
  
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
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', padding: '2rem', boxSizing: 'border-box', position: 'absolute', top: 0, left: 0 }}>
      {/* Añadimos position: 'relative' al contenedor principal para ubicar la X */}
      <div className="booking-form-elegant" style={{ width: '100%', maxWidth: '400px', margin: '0', position: 'relative' }}>
        
        {/* Botón X para cerrar y regresar al inicio */}
        <button 
          onClick={() => navigate('/')}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', transition: 'color 0.2s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
          title="Volver al inicio"
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="nav-logo" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>
            <br/>
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
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="barbero@gmail.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '12px', borderRadius: '6px' }}
            />
          </div>

          <div className="form-group" style={{ gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>Contraseña</label>
            
            {/* Contenedor relativo para el input de contraseña y el botón del ojo */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '12px', borderRadius: '6px', width: '100%', paddingRight: '2.5rem' }}
              />
              
              {/* Botón del ojo */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.8rem', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Validando...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
        
      </div>
    </div>
  );
}