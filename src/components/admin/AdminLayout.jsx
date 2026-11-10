import { NavLink } from 'react-router-dom';
import { CalendarDays, Wallet, ShoppingBag, Star } from 'lucide-react';
import Nav from '../layout/Navbar';
import './admin.css';

const secciones = [
  { to: '/admin/citas', label: 'Citas', Icon: CalendarDays },
  { to: '/admin/finanzas', label: 'Finanzas', Icon: Wallet },
  { to: '/admin/productos', label: 'Productos', Icon: ShoppingBag },
  { to: '/admin/resenas', label: 'Reseñas', Icon: Star },
];

const fechaHoy = () => {
  const texto = new Date().toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Costa_Rica',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/**
 * summary: lista opcional de indicadores bajo el título
 *   [{ label: 'Hoy', value: 3, hint: 'citas', tone: 'green' }]
 */
export default function AdminLayout({ title, subtitle, actions, summary, children }) {
  return (
    <div className="adm">
      <Nav />
      <div className="adm-shell">
        <nav className="adm-tabs" aria-label="Secciones del panel">
          {secciones.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `adm-tab ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <header className="adm-hero adm-anim">
          <div className="adm-hero-main">
            <div>
              <span className="adm-hero-date"><i aria-hidden="true" /> {fechaHoy()}</span>
              <h1 className="adm-title">{title}</h1>
              {subtitle && <p className="adm-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="adm-head-actions">{actions}</div>}
          </div>

          {summary?.length > 0 && (
            <div className="adm-hero-summary">
              {summary.map((item) => (
                <div key={item.label} className="adm-kpi">
                  <span>{item.label}</span>
                  <strong className={item.tone ? `tone-${item.tone}` : ''}>{item.value}</strong>
                  {item.hint && <small>{item.hint}</small>}
                </div>
              ))}
            </div>
          )}
        </header>

        {children}
      </div>
    </div>
  );
}
