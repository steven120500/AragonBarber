import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Trash2, Star, Check, AlertTriangle, MessageSquareQuote, Quote } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminModal from '../../components/admin/AdminModal';

export default function GestionResenas() {
  const [nombre, setNombre] = useState('');
  const [comentario, setComentario] = useState('');
  const [estrellas, setEstrellas] = useState(5);
  const [resenasActivas, setResenasActivas] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Modal de Alertas Personalizado
  const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '', tipo: 'success' });

  const cargarResenas = async () => {
    const { data } = await supabase
      .from('resenas')
      .select('*')
      .order('id', { ascending: false });
    setResenasActivas(data || []);
  };

  // Solo el barbero con sesión iniciada puede entrar aquí
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/admin');
      else cargarResenas();
    };
    checkUser();
  }, [navigate]);

  const guardarResena = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('resenas').insert([
      { cliente_nombre: nombre, comentario, estrellas, publicado: true }
    ]);

    setLoading(false);

    if (error) {
      setModalAlerta({ isOpen: true, titulo: 'Error', mensaje: 'No se pudo publicar la reseña.', tipo: 'error' });
    } else {
      setModalAlerta({ isOpen: true, titulo: '¡Publicada!', mensaje: 'La reseña ya es visible en la página principal.', tipo: 'success' });
      setNombre('');
      setComentario('');
      setEstrellas(5);
      cargarResenas();
    }
  };

  // Confirmación antes de quitar una reseña
  const [resenaAQuitar, setResenaAQuitar] = useState(null);

  const eliminarResena = async () => {
    if (!resenaAQuitar) return;
    const { error } = await supabase.from('resenas').delete().eq('id', resenaAQuitar.id);
    setResenaAQuitar(null);
    if (error) {
      setModalAlerta({ isOpen: true, titulo: 'Error', mensaje: 'No se pudo quitar la reseña: ' + error.message, tipo: 'error' });
      return;
    }
    cargarResenas();
  };

  const promedio = resenasActivas.length
    ? (resenasActivas.reduce((t, r) => t + (r.estrellas || 0), 0) / resenasActivas.length).toFixed(1)
    : '—';
  const cincoEstrellas = resenasActivas.filter(r => r.estrellas === 5).length;
  const resumen = [
    { label: 'Publicadas', value: resenasActivas.length },
    { label: 'Promedio', value: promedio === '—' ? '—' : `★ ${promedio}`, tone: promedio === '—' ? undefined : 'amber' },
    { label: '5 estrellas', value: cincoEstrellas },
  ];

  return (
    <AdminLayout
      title="Reseñas"
      subtitle="Publica los testimonios de tus clientes. Aparecen en la página principal al instante."
      summary={resumen}
    >
      <div className="adm-grid-2 adm-anim">
        {/* CREAR RESEÑA */}
        <div className="adm-card" style={{ position: 'sticky', top: '7rem' }}>
          <div className="adm-card-head" style={{ marginBottom: '1.1rem' }}>
            <div>
              <h2 className="adm-card-title">Nuevo testimonio</h2>
              <p className="adm-card-sub">Lo que dijo un cliente satisfecho.</p>
            </div>
          </div>

          <form onSubmit={guardarResena} className="adm-form">
            <label className="adm-field">
              <span className="adm-label">Nombre del cliente</span>
              <input type="text" className="adm-input" placeholder="Ej. Carlos Mora" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>

            <div className="adm-field">
              <span className="adm-label">Calificación</span>
              <div className="rs-stars" role="radiogroup" aria-label="Calificación">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    role="radio"
                    aria-checked={num === estrellas}
                    aria-label={`${num} estrella${num > 1 ? 's' : ''}`}
                    onClick={() => setEstrellas(num)}
                    className={num <= estrellas ? 'on' : ''}
                  >
                    <Star size={26} />
                  </button>
                ))}
                <span className="rs-stars-label">{estrellas}/5</span>
              </div>
            </div>

            <label className="adm-field">
              <span className="adm-label">Comentario</span>
              <textarea className="adm-input" placeholder="Escribe lo que dijo el cliente..." value={comentario} onChange={(e) => setComentario(e.target.value)} required />
            </label>

            <button type="submit" disabled={loading} className="adm-btn adm-btn--primary adm-btn--block" style={{ minHeight: '50px', marginTop: '0.3rem' }}>
              {loading ? 'Publicando…' : 'Publicar reseña'}
            </button>
          </form>
        </div>

        {/* LISTA DE RESEÑAS */}
        <div>
          <div className="adm-card-head">
            <h2 className="adm-card-title">
              Publicadas <span className="adm-count">{resenasActivas.length}</span>
            </h2>
          </div>

          {resenasActivas.length === 0 ? (
            <div className="adm-empty">
              <div className="adm-empty-icon"><MessageSquareQuote size={22} /></div>
              <strong>Aún no hay reseñas</strong>
              Agrega la primera con el formulario.
            </div>
          ) : (
            <div className="adm-list" style={{ gap: '0.9rem' }}>
              {resenasActivas.map((resena) => (
                <article key={resena.id} className="rs-item">
                  <Quote size={56} className="rs-quote" aria-hidden="true" />
                  <div className="rs-mini-stars" aria-label={`${resena.estrellas} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={15} className={i <= resena.estrellas ? 'on' : ''} />
                    ))}
                  </div>
                  <p className="rs-text">{resena.comentario}</p>
                  <div className="rs-foot">
                    <div className="rs-avatar">{(resena.cliente_nombre || '?').trim().charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="adm-row-title">{resena.cliente_nombre}</h3>
                      <span className="adm-row-meta">Visible en la página principal</span>
                    </div>
                    <button onClick={() => setResenaAQuitar(resena)} className="adm-btn adm-btn--danger-ghost adm-btn--icon" title="Quitar reseña" aria-label={`Quitar reseña de ${resena.cliente_nombre}`} style={{ width: '38px', minHeight: '38px' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CONFIRMAR QUITAR */}
      <AdminModal open={!!resenaAQuitar} center icon={<Trash2 size={24} />} iconTone="red" title="¿Quitar reseña?">
        <p className="adm-modal-text">
          La reseña de <b>{resenaAQuitar?.cliente_nombre}</b> dejará de mostrarse en la página principal.
        </p>
        <div className="adm-modal-actions" style={{ marginTop: 0 }}>
          <button onClick={() => setResenaAQuitar(null)} className="adm-btn adm-btn--ghost">Cancelar</button>
          <button onClick={eliminarResena} className="adm-btn adm-btn--danger">Sí, quitar</button>
        </div>
      </AdminModal>

      {/* MODAL DE ALERTA */}
      <AdminModal
        open={modalAlerta.isOpen}
        center
        icon={modalAlerta.tipo === 'error' ? <AlertTriangle size={24} /> : <Check size={26} />}
        iconTone={modalAlerta.tipo === 'error' ? 'red' : 'green'}
        title={modalAlerta.titulo}
      >
        <p className="adm-modal-text">{modalAlerta.mensaje}</p>
        <button
          onClick={() => setModalAlerta({ isOpen: false, titulo: '', mensaje: '', tipo: 'success' })}
          className={`adm-btn adm-btn--block ${modalAlerta.tipo === 'error' ? 'adm-btn--danger' : 'adm-btn--primary'}`}
        >
          Continuar
        </button>
      </AdminModal>

      <style>{`
        .rs-stars {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.55rem 0.8rem;
          background: var(--adm-surface-2);
          border: 1px solid var(--adm-line-strong);
          border-radius: 12px;
        }
        .rs-stars button {
          background: none;
          border: none;
          padding: 0.2rem;
          cursor: pointer;
          color: var(--adm-dim);
          display: grid;
          transition: transform 0.15s ease, color 0.15s ease;
        }
        .rs-stars button:hover { transform: scale(1.12); }
        .rs-stars button.on { color: var(--adm-amber); }
        .rs-stars button.on svg { fill: currentColor; }
        .rs-stars-label { margin-left: auto; font-size: 0.8rem; color: var(--adm-muted); font-variant-numeric: tabular-nums; }
        .rs-item {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          padding: 1.4rem 1.4rem 1.2rem;
          border-radius: 20px;
          border: 1px solid var(--adm-line);
          background:
            radial-gradient(90% 80% at 100% 0%, rgba(255, 181, 71, 0.06) 0%, transparent 60%),
            linear-gradient(180deg, #121211 0%, var(--adm-surface) 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: border-color 0.25s ease, transform 0.25s ease;
        }
        .rs-item:hover { border-color: var(--adm-line-strong); transform: translateY(-2px); }
        .rs-quote { position: absolute; z-index: -1; top: 0.6rem; right: 0.9rem; color: rgba(245, 245, 220, 0.06); fill: currentColor; }
        .rs-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #2a2a24, #161614);
          border: 1px solid var(--adm-line-strong);
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 1.05rem;
        }
        .rs-mini-stars { display: flex; gap: 3px; color: var(--adm-dim); margin-bottom: 0.8rem; }
        .rs-mini-stars .on { color: var(--adm-amber); fill: currentColor; }
        .rs-text { font-family: 'Playfair Display', serif; font-style: italic; color: #deded0; font-size: 1.05rem; line-height: 1.6; margin-bottom: 1.1rem; }
        .rs-foot { display: flex; align-items: center; gap: 0.8rem; padding-top: 1rem; border-top: 1px solid var(--adm-line); }
        @media (max-width: 860px) { .adm-grid-2 > .adm-card { position: static !important; } }
      `}</style>
    </AdminLayout>
  );
}
