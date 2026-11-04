import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Nav from '../../components/layout/Navbar';

export default function GestionProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: ''
  });
  const [imagenFile, setImagenFile] = useState(null);

  // ─── ESTADOS PARA MODALES ───
  const [modalAlerta, setModalAlerta] = useState({ isOpen: false, mensaje: '', tipo: 'exito' }); 
  const [modalConfirmacion, setModalConfirmacion] = useState({ isOpen: false, id: null, imagenUrl: null });
  
  // ─── ESTADOS PARA EDICIÓN ───
  const [modalEditar, setModalEditar] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [imagenEditFile, setImagenEditFile] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin');
      } else {
        cargarProductos();
      }
    };
    checkUser();
  }, [navigate]);

  const cargarProductos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setProductos(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.precio) return;
    
    setGuardando(true);
    let imageUrl = null;

    if (imagenFile) {
      const fileExt = imagenFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, imagenFile);
        
      if (uploadError) {
        setModalAlerta({ isOpen: true, mensaje: 'Error al subir la foto: ' + uploadError.message, tipo: 'error' });
        setGuardando(false);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('productos').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('productos').insert([{
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio: parseInt(form.precio) || 0,
      imagen_url: imageUrl,
      stock: true
    }]);

    if (!error) {
      setForm({ nombre: '', descripcion: '', precio: '' });
      setImagenFile(null);
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = ""; 
      cargarProductos();
      setModalAlerta({ isOpen: true, mensaje: '¡Producto agregado con éxito!', tipo: 'exito' });
    } else {
      setModalAlerta({ isOpen: true, mensaje: 'Error al agregar el producto: ' + error.message, tipo: 'error' });
    }
    setGuardando(false);
  };

  const toggleStock = async (id, currentStock) => {
    await supabase.from('productos').update({ stock: !currentStock }).eq('id', id);
    cargarProductos();
  };

  const confirmarEliminacion = async () => {
    const { id, imagenUrl } = modalConfirmacion;
    
    if (imagenUrl) {
      const fileName = imagenUrl.split('/').pop();
      await supabase.storage.from('productos').remove([fileName]);
    }
    await supabase.from('productos').delete().eq('id', id);
    
    setModalConfirmacion({ isOpen: false, id: null, imagenUrl: null });
    cargarProductos();
    setModalAlerta({ isOpen: true, mensaje: 'Producto eliminado correctamente.', tipo: 'exito' });
  };

  // ─── LÓGICA DE EDICIÓN ───
  const abrirModalEdicion = (producto) => {
    setProductoEditando({ ...producto });
    setImagenEditFile(null);
    setModalEditar(true);
  };

  const handleEditarSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    let newImageUrl = productoEditando.imagen_url;

    if (imagenEditFile) {
      const fileExt = imagenEditFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, imagenEditFile);
        
      if (uploadError) {
        setModalAlerta({ isOpen: true, mensaje: 'Error al subir la nueva foto: ' + uploadError.message, tipo: 'error' });
        setGuardando(false);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('productos').getPublicUrl(fileName);
      newImageUrl = urlData.publicUrl;

      if (productoEditando.imagen_url) {
        const oldFileName = productoEditando.imagen_url.split('/').pop();
        await supabase.storage.from('productos').remove([oldFileName]);
      }
    }

    const { error } = await supabase.from('productos').update({
      nombre: productoEditando.nombre.trim(),
      descripcion: productoEditando.descripcion.trim(),
      precio: parseInt(productoEditando.precio) || 0,
      imagen_url: newImageUrl
    }).eq('id', productoEditando.id);

    setGuardando(false);

    if (!error) {
      setModalEditar(false);
      setProductoEditando(null);
      setImagenEditFile(null);
      cargarProductos();
      setModalAlerta({ isOpen: true, mensaje: '¡Producto actualizado correctamente!', tipo: 'exito' });
    } else {
      setModalAlerta({ isOpen: true, mensaje: 'Error al actualizar: ' + error.message, tipo: 'error' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: 'var(--cream)', paddingBottom: '4rem' }}>
      <Nav />

      <div style={{ padding: '2rem', paddingTop: '8rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ color: 'var(--gold)', textAlign: 'center', marginBottom: '2rem', fontFamily: "'Playfair Display', serif", fontSize: '2.5rem' }}>
          Minitienda
        </h2>
        
        {/* FORMULARIO AGREGAR PRODUCTO */}
        <section style={{ background: '#0a0a0a', padding: '2rem', borderRadius: '16px', border: '1px solid #222', marginBottom: '3rem' }}>
          <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Agregar Nuevo Producto</h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Nombre (ej. Cera Mate)" 
              value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})} 
              required 
              style={inputStyle} 
            />
            <input 
              type="number" 
              placeholder="Precio de venta (₡)" 
              value={form.precio} 
              onChange={e => setForm({...form, precio: e.target.value})} 
              required 
              min="0" 
              style={inputStyle} 
            />
            <input 
              type="text" 
              placeholder="Descripción corta" 
              value={form.descripcion} 
              onChange={e => setForm({...form, descripcion: e.target.value})} 
              required 
              style={{...inputStyle, gridColumn: '1 / -1'}} 
            />
            
            <div style={{ gridColumn: '1 / -1', background: '#151515', border: '1px solid #333', padding: '1rem', borderRadius: '8px' }}>
              <label style={{ display: 'block', color: 'var(--grey)', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📷 Foto del producto
              </label>
              <input 
                id="file-upload"
                type="file" 
                accept="image/*"
                onChange={e => setImagenFile(e.target.files[0])} 
                style={{ color: '#fff', width: '100%' }}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={guardando}
              style={{ gridColumn: '1 / -1', background: guardando ? '#555' : 'var(--gold)', color: '#000', padding: '1rem', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: guardando ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {guardando ? '⏳ Guardando y subiendo foto...' : '➕ Guardar Producto'}
            </button>
          </form>
        </section>

        {/* LISTA DE PRODUCTOS */}
        <section>
          <h3 style={{ color: 'var(--gold)', marginBottom: '1.5rem', fontSize: '1.5rem' }}>Inventario Activo</h3>
          
          {loading ? (
            <p style={{ color: 'var(--grey)' }}>Cargando inventario...</p>
          ) : productos.length === 0 ? (
            <div style={{ padding: '3rem', border: '1px dashed #333', textAlign: 'center', borderRadius: '12px', color: 'var(--grey)' }}>
              Aún no has agregado ningún producto a tu minitienda.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {productos.map(p => (
                <div key={p.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Foto con soporte para botellas alargadas */}
                  <div style={{ height: '260px', background: '#151515', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {p.imagen_url ? (
                      <>
                        <img 
                          src={p.imagen_url} 
                          alt="" 
                          aria-hidden="true"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px) brightness(0.35)', transform: 'scale(1.2)' }} 
                        />
                        <img 
                          src={p.imagen_url} 
                          alt={p.nombre} 
                          style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', objectFit: 'contain', padding: '12px', boxSizing: 'border-box' }} 
                        />
                      </>
                    ) : (
                      <span style={{ fontSize: '4rem' }}>💈</span>
                    )}
                    {!p.stock && (
                      <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4444', fontWeight: 'bold', fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Agotado
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ color: 'var(--gold)', margin: '0 0 0.5rem 0', fontFamily: "'Playfair Display', serif", fontSize: '1.3rem' }}>{p.nombre}</h3>
                    <p style={{ color: 'var(--grey)', fontSize: '0.85rem', marginBottom: '1rem', flex: 1 }}>{p.descripcion}</p>
                    <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1.5rem' }}>₡{p.precio}</p>
                    
                    {/* BOTONES DE ACCIÓN */}
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button 
                        onClick={() => toggleStock(p.id, p.stock)} 
                        style={{ flex: 1, padding: '0.8rem 0.5rem', border: 'none', borderRadius: '50px', background: p.stock ? '#ffb300' : '#00C851', color: '#000', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.7rem' }}
                      >
                        {p.stock ? 'Pausar' : 'Activar'}
                      </button>

                      <button 
                        onClick={() => abrirModalEdicion(p)} 
                        style={{ flex: 1, padding: '0.8rem 0.5rem', border: '1px solid var(--gold)', borderRadius: '50px', background: 'transparent', color: 'var(--gold)', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.7rem' }}
                      >
                        Editar
                      </button>
                      
                      <button 
                        onClick={() => setModalConfirmacion({ isOpen: true, id: p.id, imagenUrl: p.imagen_url })} 
                        style={{ padding: '0.8rem 1rem', border: '1px solid #ff4444', borderRadius: '50px', background: 'rgba(255,68,68,0.05)', color: '#ff4444', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.7rem' }}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── MODAL DE EDICIÓN ─── */}
        {modalEditar && productoEditando && (
          <div style={overlayStyle}>
            <div style={{ ...modalStyle, maxWidth: '500px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--gold)', marginBottom: '1.5rem', textAlign: 'center' }}>Editar Producto</h3>
              
              <form onSubmit={handleEditarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelModalStyle}>Nombre del Producto</label>
                  <input 
                    type="text" 
                    value={productoEditando.nombre} 
                    onChange={e => setProductoEditando({...productoEditando, nombre: e.target.value})} 
                    required 
                    style={inputStyle} 
                  />
                </div>
                
                <div>
                  <label style={labelModalStyle}>Precio (₡)</label>
                  <input 
                    type="number" 
                    value={productoEditando.precio} 
                    onChange={e => setProductoEditando({...productoEditando, precio: e.target.value})} 
                    required 
                    min="0" 
                    style={inputStyle} 
                  />
                </div>
                
                <div>
                  <label style={labelModalStyle}>Descripción</label>
                  <input 
                    type="text" 
                    value={productoEditando.descripcion} 
                    onChange={e => setProductoEditando({...productoEditando, descripcion: e.target.value})} 
                    required 
                    style={inputStyle} 
                  />
                </div>
                
                <div style={{ background: '#151515', border: '1px solid #333', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ ...labelModalStyle, marginBottom: '0.5rem' }}>📷 Reemplazar Foto (Opcional)</label>
                  <p style={{ color: 'var(--grey)', fontSize: '0.75rem', marginBottom: '0.8rem' }}>Si no seleccionas nada, se mantendrá la foto actual.</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setImagenEditFile(e.target.files[0])} 
                    style={{ color: '#fff', width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setModalEditar(false)} style={btnBack}>Cancelar</button>
                  <button type="submit" disabled={guardando} style={btnConfirmGold}>
                    {guardando ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL DE CONFIRMACIÓN (ELIMINAR) ─── */}
        {modalConfirmacion.isOpen && (
          <div style={overlayStyle}>
            <div style={{ ...modalStyle, border: '1px solid rgba(255, 68, 68, 0.3)' }}>
              <div style={iconWarningStyle}>⚠️</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>¿Eliminar producto?</h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                Esta acción borrará el producto de la tienda y su imagen definitivamente.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setModalConfirmacion({ isOpen: false, id: null, imagenUrl: null })} style={btnBack}>Cancelar</button>
                <button onClick={confirmarEliminacion} style={btnConfirmRed}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL DE ALERTA (ÉXITO O ERROR) ─── */}
        {modalAlerta.isOpen && (
          <div style={overlayStyle}>
            <div style={{ ...modalStyle, border: modalAlerta.tipo === 'exito' ? '1px solid rgba(0, 200, 81, 0.3)' : '1px solid rgba(255, 68, 68, 0.3)' }}>
              <div style={{
                ...iconAlertStyle, 
                color: modalAlerta.tipo === 'exito' ? '#00C851' : '#ff4444', 
                background: modalAlerta.tipo === 'exito' ? 'rgba(0, 200, 81, 0.1)' : 'rgba(255, 68, 68, 0.1)'
              }}>
                {modalAlerta.tipo === 'exito' ? '✓' : '!'}
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#fff', marginBottom: '1rem' }}>
                {modalAlerta.tipo === 'exito' ? '¡Listo!' : 'Atención'}
              </h3>
              <p style={{ color: 'var(--grey)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>{modalAlerta.mensaje}</p>
              <button 
                onClick={() => setModalAlerta({ isOpen: false, mensaje: '', tipo: 'exito' })} 
                style={modalAlerta.tipo === 'exito' ? btnConfirmGreen : btnConfirmGold}
              >
                Entendido
              </button>
            </div>
          </div>
        )}

      </div>
      
      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; margin: 0; 
        }
      `}</style>
    </div>
  );
}

// ─── ESTILOS REUTILIZABLES ───
const inputStyle = { background: '#151515', border: '1px solid #333', color: '#fff', padding: '0.9rem', borderRadius: '8px', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };
const labelModalStyle = { display: 'block', fontSize: '0.75rem', color: 'var(--grey)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: '#0a0a0a', border: '1px solid #222', padding: '2.5rem', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
const iconWarningStyle = { width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.8rem' };
const iconAlertStyle = { width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', fontWeight: 'bold' };
const btnBack = { flex: 1, background: 'transparent', border: '1px solid #444', color: 'var(--grey)', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmRed = { flex: 1, background: '#ff4444', border: 'none', color: '#fff', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmGold = { width: '100%', background: 'var(--gold)', border: 'none', color: '#000', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };
const btnConfirmGreen = { width: '100%', background: '#00C851', border: 'none', color: '#000', padding: '0.9rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' };