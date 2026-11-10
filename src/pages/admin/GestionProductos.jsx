import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Pencil, Trash2, Eye, EyeOff, ImagePlus, ShoppingBag, Check, AlertTriangle, Banknote } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminModal from '../../components/admin/AdminModal';
import { formatearPrecio, hoyCR } from '../../utils/formato';
import { esTablaFaltante, MENSAJE_TABLA_VENTAS } from '../../utils/supabaseErrores';

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
  const [previewNueva, setPreviewNueva] = useState(null);

  // ─── ESTADOS PARA MODALES ───
  const [modalAlerta, setModalAlerta] = useState({ isOpen: false, mensaje: '', tipo: 'exito' }); 
  const [modalConfirmacion, setModalConfirmacion] = useState({ isOpen: false, id: null, imagenUrl: null });
  
  // ─── ESTADOS PARA EDICIÓN ───
  const [modalEditar, setModalEditar] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [imagenEditFile, setImagenEditFile] = useState(null);
  const [previewEditUrl, setPreviewEditUrl] = useState(null);

  const cargarProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setModalAlerta({ isOpen: true, mensaje: 'No se pudo cargar el inventario: ' + error.message, tipo: 'error' });
    } else if (data) {
      setProductos(data);
    }
    setLoading(false);
  };

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

  // Libera la memoria de las vistas previas locales cuando cambian
  useEffect(() => {
    return () => {
      if (previewNueva) URL.revokeObjectURL(previewNueva);
    };
  }, [previewNueva]);

  const handleSeleccionarImagenNueva = (e) => {
    const file = e.target.files[0] || null;
    setImagenFile(file);
    setPreviewNueva(file ? URL.createObjectURL(file) : null);
  };

  useEffect(() => {
    return () => {
      if (previewEditUrl?.startsWith('blob:')) URL.revokeObjectURL(previewEditUrl);
    };
  }, [previewEditUrl]);

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
      setPreviewNueva(null);
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
    const { error } = await supabase.from('productos').update({ stock: !currentStock }).eq('id', id);
    if (error) {
      setModalAlerta({ isOpen: true, mensaje: 'No se pudo cambiar el estado: ' + error.message, tipo: 'error' });
      return;
    }
    cargarProductos();
  };

  const confirmarEliminacion = async () => {
    const { id, imagenUrl } = modalConfirmacion;
    setModalConfirmacion({ isOpen: false, id: null, imagenUrl: null });

    // Primero se borra el producto; la foto solo se borra si eso salió bien
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) {
      setModalAlerta({ isOpen: true, mensaje: 'No se pudo eliminar el producto: ' + error.message, tipo: 'error' });
      return;
    }

    if (imagenUrl) {
      const fileName = imagenUrl.split('/').pop();
      await supabase.storage.from('productos').remove([fileName]);
    }

    cargarProductos();
    setModalAlerta({ isOpen: true, mensaje: 'Producto eliminado correctamente.', tipo: 'exito' });
  };

  // ─── REGISTRAR VENTA (se refleja en Finanzas como ingreso) ───
  const [venta, setVenta] = useState(null); // { producto, cantidad, precio, fecha }
  const [guardandoVenta, setGuardandoVenta] = useState(false);

  const abrirVenta = (producto) => {
    setVenta({ producto, cantidad: 1, precio: String(producto.precio ?? 0), fecha: hoyCR() });
  };

  const totalVenta = venta ? (parseInt(venta.cantidad) || 0) * (parseInt(venta.precio) || 0) : 0;

  const registrarVenta = async (e) => {
    e.preventDefault();
    const cantidad = parseInt(venta.cantidad) || 0;
    const precioUnitario = parseInt(venta.precio);
    if (cantidad < 1 || Number.isNaN(precioUnitario) || precioUnitario < 0) {
      setModalAlerta({ isOpen: true, mensaje: 'Revisa la cantidad y el precio de la venta.', tipo: 'error' });
      return;
    }

    setGuardandoVenta(true);
    const { error } = await supabase.from('ventas_productos').insert([{
      producto_id: String(venta.producto.id),
      producto_nombre: venta.producto.nombre,
      cantidad,
      precio_unitario: precioUnitario,
      total: cantidad * precioUnitario,
      fecha: venta.fecha || hoyCR(),
    }]);
    setGuardandoVenta(false);

    if (error) {
      setModalAlerta({ isOpen: true, mensaje: esTablaFaltante(error) ? MENSAJE_TABLA_VENTAS : 'No se pudo registrar la venta: ' + error.message, tipo: 'error' });
      return;
    }

    const nombre = venta.producto.nombre;
    setVenta(null);
    setModalAlerta({ isOpen: true, mensaje: `Venta registrada: ${cantidad} × ${nombre} por ${formatearPrecio(cantidad * precioUnitario)}. Ya aparece en Finanzas.`, tipo: 'exito' });
  };

  // ─── LÓGICA DE EDICIÓN ───
  const abrirModalEdicion = (producto) => {
    setProductoEditando({ ...producto });
    setImagenEditFile(null);
    setPreviewEditUrl(producto.imagen_url || null);
    setModalEditar(true);
  };

  const handleSeleccionarImagenEdit = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagenEditFile(file);
      setPreviewEditUrl(URL.createObjectURL(file));
    }
  };

  const handleEditarSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    let newImageUrl = productoEditando.imagen_url;
    let nuevaFotoSubida = null;

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
      nuevaFotoSubida = fileName;
    }

    const { error } = await supabase.from('productos').update({
      nombre: productoEditando.nombre.trim(),
      descripcion: (productoEditando.descripcion || '').trim(),
      precio: parseInt(productoEditando.precio) || 0,
      imagen_url: newImageUrl
    }).eq('id', productoEditando.id);

    setGuardando(false);

    if (!error) {
      // Ya guardado: ahora sí se puede borrar la foto anterior
      if (nuevaFotoSubida && productoEditando.imagen_url) {
        const oldFileName = productoEditando.imagen_url.split('/').pop();
        await supabase.storage.from('productos').remove([oldFileName]);
      }
      setModalEditar(false);
      setProductoEditando(null);
      setImagenEditFile(null);
      setPreviewEditUrl(null);
      cargarProductos();
      setModalAlerta({ isOpen: true, mensaje: '¡Producto actualizado correctamente!', tipo: 'exito' });
    } else {
      // Falló el guardado: se borra la foto nueva para no dejarla huérfana; la anterior queda intacta
      if (nuevaFotoSubida) await supabase.storage.from('productos').remove([nuevaFotoSubida]);
      setModalAlerta({ isOpen: true, mensaje: 'Error al actualizar: ' + error.message, tipo: 'error' });
    }
  };

  const activos = productos.filter((p) => p.stock).length;
  const precioPromedio = productos.length ? Math.round(productos.reduce((t, p) => t + (Number(p.precio) || 0), 0) / productos.length) : 0;
  const resumen = loading ? [] : [
    { label: 'Productos', value: productos.length },
    { label: 'En la tienda', value: activos, tone: activos > 0 ? 'green' : undefined },
    { label: 'Pausados', value: productos.length - activos, tone: productos.length - activos > 0 ? 'amber' : undefined },
    { label: 'Precio promedio', value: formatearPrecio(precioPromedio) },
  ];

  return (
    <AdminLayout
      title="Minitienda"
      subtitle="Los productos activos aparecen en el carrusel de la página principal."
      summary={resumen}
    >
      <div className="adm-grid-2 adm-anim">
        {/* FORMULARIO AGREGAR PRODUCTO */}
        <div className="adm-card pr-sticky">
          <div className="adm-card-head" style={{ marginBottom: '1.1rem' }}>
            <div>
              <h2 className="adm-card-title">Nuevo producto</h2>
              <p className="adm-card-sub">Se publica activo en la tienda.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="adm-form">
            <label className="adm-field">
              <span className="adm-label">Nombre</span>
              <input type="text" className="adm-input" placeholder="Ej. Cera Mate" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label className="adm-field">
              <span className="adm-label">Precio de venta (₡)</span>
              <input type="number" className="adm-input" placeholder="5000" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} required min="0" inputMode="numeric" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Descripción corta</span>
              <input type="text" className="adm-input" placeholder="Fijación fuerte, acabado natural" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
            </label>

            <div className="adm-field">
              <span className="adm-label">Foto del producto</span>
              <label className="adm-drop">
                <span className="adm-drop-thumb">
                  {previewNueva ? <img src={previewNueva} alt="" /> : <ImagePlus size={22} />}
                </span>
                <span>
                  <span className="adm-drop-text" style={{ display: 'block' }}>{imagenFile ? imagenFile.name : 'Elegir imagen'}</span>
                  <span className="adm-drop-hint">PNG con fondo transparente se ve mejor</span>
                </span>
                <input id="file-upload" type="file" accept="image/*" onChange={handleSeleccionarImagenNueva} />
              </label>
            </div>

            <button type="submit" disabled={guardando} className="adm-btn adm-btn--primary adm-btn--block" style={{ minHeight: '50px', marginTop: '0.3rem' }}>
              {guardando ? 'Guardando y subiendo foto…' : <><Plus size={18} /> Guardar producto</>}
            </button>
          </form>
        </div>

        {/* INVENTARIO */}
        <div>
          <div className="adm-card-head">
            <h2 className="adm-card-title">Inventario <span className="adm-count">{productos.length}</span></h2>
          </div>

          {loading ? (
            <div className="pr-grid">
              {[0, 1, 2, 3].map((i) => <div key={i} className="adm-skel" style={{ height: '360px' }} />)}
            </div>
          ) : productos.length === 0 ? (
            <div className="adm-empty">
              <div className="adm-empty-icon"><ShoppingBag size={22} /></div>
              <strong>Tu minitienda está vacía</strong>
              Agrega tu primer producto con el formulario.
            </div>
          ) : (
            <div className="pr-grid">
              {productos.map(p => (
                <article key={p.id} className={`pr-card ${p.stock ? '' : 'is-off'}`}>
                  <div className="pr-media">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} loading="lazy" />
                    ) : (
                      <span style={{ fontSize: '3.5rem' }}>💈</span>
                    )}
                    <span className={`adm-chip pr-status ${p.stock ? 'bg-green' : 'bg-amber'}`}>
                      <span className="pr-dot" /> {p.stock ? 'En tienda' : 'Pausado'}
                    </span>
                    <span className="pr-price-tag">{formatearPrecio(p.precio)}</span>
                  </div>

                  <div className="pr-body">
                    <h3 className="pr-name">{p.nombre}</h3>
                    <p className="pr-desc">{p.descripcion}</p>

                    <button onClick={() => abrirVenta(p)} className="adm-btn adm-btn--primary adm-btn--sm adm-btn--block" style={{ marginBottom: '0.5rem' }}>
                      <Banknote size={15} /> Registrar venta
                    </button>
                    <div className="pr-actions">
                      <button onClick={() => toggleStock(p.id, p.stock)} className={`adm-btn adm-btn--sm ${p.stock ? 'adm-btn--subtle' : 'adm-btn--green'}`} title={p.stock ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}>
                        {p.stock ? <><EyeOff size={14} /> Pausar</> : <><Eye size={14} /> Activar</>}
                      </button>
                      <button onClick={() => abrirModalEdicion(p)} className="adm-btn adm-btn--ghost adm-btn--sm">
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        onClick={() => setModalConfirmacion({ isOpen: true, id: p.id, imagenUrl: p.imagen_url })}
                        className="adm-btn adm-btn--danger-ghost adm-btn--icon"
                        title="Eliminar"
                        aria-label={`Eliminar ${p.nombre}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL DE EDICIÓN ─── */}
      <AdminModal
        open={modalEditar && !!productoEditando}
        onClose={() => { setModalEditar(false); setPreviewEditUrl(null); setImagenEditFile(null); }}
        title="Editar producto"
        width="480px"
      >
        {productoEditando && (
          <form onSubmit={handleEditarSubmit} className="adm-form" style={{ marginTop: '1rem' }}>
            <label className="adm-field">
              <span className="adm-label">Nombre</span>
              <input type="text" className="adm-input" value={productoEditando.nombre} onChange={e => setProductoEditando({ ...productoEditando, nombre: e.target.value })} required />
            </label>
            <label className="adm-field">
              <span className="adm-label">Precio (₡)</span>
              <input type="number" className="adm-input" value={productoEditando.precio} onChange={e => setProductoEditando({ ...productoEditando, precio: e.target.value })} required min="0" inputMode="numeric" />
            </label>
            <label className="adm-field">
              <span className="adm-label">Descripción</span>
              <input type="text" className="adm-input" value={productoEditando.descripcion || ''} onChange={e => setProductoEditando({ ...productoEditando, descripcion: e.target.value })} required />
            </label>

            <div className="adm-field">
              <span className="adm-label">Foto</span>
              <label className="adm-drop">
                <span className="adm-drop-thumb" style={{ width: '84px', height: '84px' }}>
                  {previewEditUrl ? <img src={previewEditUrl} alt="Vista previa" /> : <ImagePlus size={22} />}
                </span>
                <span>
                  <span className="adm-drop-text" style={{ display: 'block' }}>{imagenEditFile ? imagenEditFile.name : 'Reemplazar foto (opcional)'}</span>
                  <span className="adm-drop-hint">Si no eliges nada, se mantiene la actual.</span>
                </span>
                <input type="file" accept="image/*" onChange={handleSeleccionarImagenEdit} />
              </label>
            </div>

            <div className="adm-modal-actions">
              <button type="button" onClick={() => { setModalEditar(false); setPreviewEditUrl(null); setImagenEditFile(null); }} className="adm-btn adm-btn--ghost">Cancelar</button>
              <button type="submit" disabled={guardando} className="adm-btn adm-btn--primary">
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>

      {/* ─── MODAL: REGISTRAR VENTA ─── */}
      <AdminModal open={!!venta} onClose={() => setVenta(null)} title="Registrar venta" width="440px">
        {venta && (
          <form onSubmit={registrarVenta} className="adm-form" style={{ marginTop: '0.4rem' }}>
            <div className="vt-product">
              <span className="vt-thumb">
                {venta.producto.imagen_url ? <img src={venta.producto.imagen_url} alt="" /> : <span>💈</span>}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="adm-row-title">{venta.producto.nombre}</div>
                <div className="adm-row-meta">Precio de lista {formatearPrecio(venta.producto.precio)}</div>
              </div>
            </div>

            <div className="adm-field-row">
              <div className="adm-field">
                <span className="adm-label">Cantidad</span>
                <div className="vt-stepper">
                  <button type="button" aria-label="Menos" onClick={() => setVenta({ ...venta, cantidad: Math.max(1, (parseInt(venta.cantidad) || 1) - 1) })}><Minus size={16} /></button>
                  <input type="number" min="1" inputMode="numeric" value={venta.cantidad} onChange={e => setVenta({ ...venta, cantidad: e.target.value })} aria-label="Cantidad" required />
                  <button type="button" aria-label="Más" onClick={() => setVenta({ ...venta, cantidad: (parseInt(venta.cantidad) || 0) + 1 })}><Plus size={16} /></button>
                </div>
              </div>
              <label className="adm-field">
                <span className="adm-label">Precio unitario (₡)</span>
                <input type="number" className="adm-input" min="0" inputMode="numeric" value={venta.precio} onChange={e => setVenta({ ...venta, precio: e.target.value })} required />
              </label>
            </div>

            <label className="adm-field">
              <span className="adm-label">Fecha de la venta</span>
              <input type="date" className="adm-input" value={venta.fecha} max={hoyCR()} onChange={e => setVenta({ ...venta, fecha: e.target.value })} required />
            </label>

            <div className="vt-total">
              <span className="adm-label">Total</span>
              <strong>{formatearPrecio(totalVenta)}</strong>
            </div>

            <div className="adm-modal-actions" style={{ marginTop: '0.4rem' }}>
              <button type="button" onClick={() => setVenta(null)} className="adm-btn adm-btn--ghost">Cancelar</button>
              <button type="submit" disabled={guardandoVenta} className="adm-btn adm-btn--green">
                {guardandoVenta ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>

      {/* ─── MODAL DE CONFIRMACIÓN (ELIMINAR) ─── */}
      <AdminModal open={modalConfirmacion.isOpen} center icon={<Trash2 size={24} />} iconTone="red" title="¿Eliminar producto?">
        <p className="adm-modal-text">Se borrará de la tienda junto con su foto. Esta acción no se puede deshacer.</p>
        <div className="adm-modal-actions" style={{ marginTop: 0 }}>
          <button onClick={() => setModalConfirmacion({ isOpen: false, id: null, imagenUrl: null })} className="adm-btn adm-btn--ghost">Cancelar</button>
          <button onClick={confirmarEliminacion} className="adm-btn adm-btn--danger">Sí, eliminar</button>
        </div>
      </AdminModal>

      {/* ─── MODAL DE ALERTA (ÉXITO O ERROR) ─── */}
      <AdminModal
        open={modalAlerta.isOpen}
        center
        icon={modalAlerta.tipo === 'exito' ? <Check size={26} /> : <AlertTriangle size={24} />}
        iconTone={modalAlerta.tipo === 'exito' ? 'green' : 'red'}
        title={modalAlerta.tipo === 'exito' ? '¡Listo!' : 'Atención'}
      >
        <p className="adm-modal-text">{modalAlerta.mensaje}</p>
        <button
          onClick={() => setModalAlerta({ isOpen: false, mensaje: '', tipo: 'exito' })}
          className={`adm-btn adm-btn--block ${modalAlerta.tipo === 'exito' ? 'adm-btn--primary' : 'adm-btn--danger'}`}
        >
          Entendido
        </button>
      </AdminModal>

      <style>{`
        .pr-sticky { position: sticky; top: 7rem; }
        @media (max-width: 860px) { .pr-sticky { position: static; } }
        .pr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1rem; }
        .pr-card {
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #121211 0%, var(--adm-surface) 100%);
          border: 1px solid var(--adm-line);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }
        .pr-card:hover { border-color: var(--adm-line-strong); transform: translateY(-3px); box-shadow: 0 22px 40px -22px rgba(0, 0, 0, 0.9); }
        .pr-media {
          position: relative;
          height: 220px;
          margin: 0.5rem 0.5rem 0;
          border-radius: 14px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 50% 40%, #2c2c27 0%, #151514 70%),
            #151514;
          box-shadow: inset 0 0 0 1px var(--adm-line);
        }
        .pr-media::after {
          content: '';
          position: absolute;
          inset: auto 0 0 0;
          height: 45%;
          background: linear-gradient(0deg, rgba(0, 0, 0, 0.55), transparent);
          pointer-events: none;
        }
        .pr-media img { width: 100%; height: 100%; object-fit: contain; padding: 18px; box-sizing: border-box; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease, opacity 0.2s ease; }
        .pr-card:hover .pr-media img { transform: scale(1.06); }
        .pr-card.is-off .pr-media img { filter: grayscale(1); opacity: 0.4; }
        .pr-status { position: absolute; z-index: 1; top: 0.7rem; left: 0.7rem; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .pr-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .pr-price-tag {
          position: absolute;
          z-index: 1;
          right: 0.7rem;
          bottom: 0.7rem;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          background: var(--adm-text);
          color: #000;
          font-size: 0.9rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }
        .pr-body { display: flex; flex-direction: column; flex: 1; padding: 1rem 1.1rem 1.1rem; }
        .pr-name { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.3rem; }
        .pr-desc {
          color: var(--adm-muted);
          font-size: 0.82rem;
          line-height: 1.45;
          flex: 1;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pr-actions { display: flex; gap: 0.45rem; }
        .pr-actions .adm-btn:not(.adm-btn--icon) { flex: 1; padding: 0 0.6rem; }
        .vt-product { display: flex; align-items: center; gap: 0.9rem; padding: 0.7rem; border-radius: 14px; background: var(--adm-surface); border: 1px solid var(--adm-line); }
        .vt-thumb { width: 52px; height: 52px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; overflow: hidden; background: radial-gradient(circle, #2a2a26, #141413); font-size: 1.5rem; }
        .vt-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
        .vt-stepper { display: flex; align-items: center; height: 46px; border-radius: 12px; border: 1px solid var(--adm-line-strong); background: var(--adm-surface-2); overflow: hidden; }
        .vt-stepper button { width: 42px; height: 100%; flex-shrink: 0; display: grid; place-items: center; border: none; background: transparent; color: var(--adm-text); cursor: pointer; }
        .vt-stepper button:hover { background: var(--adm-surface-3); }
        .adm .vt-stepper input { flex: 1; min-width: 0; height: 100%; padding: 0; border: none; border-radius: 0; background: transparent; color: var(--adm-text); text-align: center; font-size: 1.05rem; font-weight: 700; font-family: 'DM Sans', sans-serif; outline: none; }
        .vt-total { display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1rem; border-radius: 14px; background: var(--adm-green-soft); border: 1px solid rgba(61, 220, 132, 0.25); }
        .vt-total strong { font-size: 1.5rem; color: var(--adm-green); font-variant-numeric: tabular-nums; }
      `}</style>
    </AdminLayout>
  );
}
