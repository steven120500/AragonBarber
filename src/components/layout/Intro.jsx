import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INTRO_STORAGE_KEY } from './introStorage';
import './intro.css';

const DURACION_MS = 2600;
const NOMBRE = 'EL ESTILO SIEMPRE PRIMERO';

export default function Intro({ onFinish }) {
  const [visible, setVisible] = useState(true);
  const [progreso, setProgreso] = useState(0);

  // Contador 0 → 100 sincronizado con la duración
  useEffect(() => {
    const inicio = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - inicio) / DURACION_MS);
      setProgreso(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = setTimeout(() => setVisible(false), DURACION_MS + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  // Bloquea el scroll mientras la intro está en pantalla
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const terminar = () => {
    try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1'); } catch { /* modo privado */ }
    document.body.style.overflow = '';
    onFinish?.();
  };

  const ease = [0.76, 0, 0.24, 1];

  return (
    <AnimatePresence onExitComplete={terminar}>
      {visible && (
        <motion.div
          className="intro"
          onClick={() => setVisible(false)}
          role="presentation"
          aria-hidden="true"
          exit={{ pointerEvents: 'none' }}
          transition={{ duration: 1 }}
        >
          {/* Cortinas que se abren al salir */}
          <motion.div className="intro-curtain intro-curtain--top" exit={{ y: '-100%' }} transition={{ duration: 0.9, ease }} />
          <motion.div className="intro-curtain intro-curtain--bottom" exit={{ y: '100%' }} transition={{ duration: 0.9, ease }} />

          <motion.div
            className="intro-center"
            exit={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: 'easeIn' }}
          >
            <motion.div
              className="intro-glow"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
            />

            <motion.img
              src="/Logo.png"
              alt=""
              className="intro-logo"
              draggable="false"
              initial={{ opacity: 0, scale: 0.82, filter: 'blur(14px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />

            <motion.div
              className="intro-line"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.7, ease }}
            />

            <div className="intro-name">
              {NOMBRE.split('').map((letra, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 + i * 0.035, ease: 'easeOut' }}
                >
                  {letra === ' ' ? ' ' : letra}
                </motion.span>
              ))}
            </div>
          </motion.div>

          <motion.div className="intro-footer" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <span className="intro-hint">Toca para entrar</span>
            <span className="intro-count">{String(progreso).padStart(3, '0')}</span>
          </motion.div>

          <motion.div className="intro-bar" style={{ scaleX: progreso / 100 }} exit={{ opacity: 0 }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
