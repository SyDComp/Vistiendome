import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import './styles/App.css'
import Home from './components/interface/Home'
import { WebSocketProvider } from './context/WebSocketContext'
import { NotificationProvider } from './context/NotificationContext'
import { CartProvider } from './context/CartContext'

// Importaciones del Panel de Administración (Futuras)
import SuperSetup from './components/interface/admin/SuperSetup'
import AdminLogin from './components/interface/admin/AdminLogin'
import DashboardLayout from './components/interface/admin/DashboardLayout'

// Vistas Públicas
import Inicio from './components/interface/vistas/Inicio'
import Catalogo from './components/interface/vistas/Catalogo'
import Nosotros from './components/interface/vistas/Nosotros'
import Contacto from './components/interface/vistas/Contacto'
import AtencionCliente from './components/interface/vistas/AtencionCliente'
import DetalleProducto from './components/interface/vistas/DetalleProducto'

function App() {
  const location = useLocation();
  const state = location.state;
  const isModalOpen = !!state?.backgroundLocation;

  // Bloqueo de scroll centralizado
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      // Refuerzo adicional por si acaso
      document.body.classList.add('no-scroll');
      document.documentElement.classList.add('no-scroll');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    }
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    };
  }, [isModalOpen]);

  // Scroll to Top Global
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <WebSocketProvider>
      <NotificationProvider>
        <CartProvider>
          {/* Rutas Principales */}
          <Routes location={state?.backgroundLocation || location}>
            <Route path="/" element={<Home />}>
               <Route index element={<Inicio />} />
               <Route path="catalogo" element={<Catalogo />} />
               <Route path="nosotros" element={<Nosotros />} />
               <Route path="contacto" element={<Contacto />} />
               <Route path="ayuda" element={<AtencionCliente />} />
               <Route path="producto/:slug/:sku?/:imgIndex?" element={<DetalleProducto />} />
            </Route>
            
            <Route path="/admin/bootstrap" element={<SuperSetup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard/*" element={<DashboardLayout />} />
          </Routes>

          {/* Ruta para el Modal (Capa Superior) */}
          {state?.backgroundLocation && (
            <Routes>
              <Route path="/producto/:slug/:sku?/:imgIndex?" element={
                <div className="modal-routing-overlay fade-in">
                   <div className="modal-routing-content">
                      <Home isModalView={true} />
                   </div>
                </div>
              } />
            </Routes>
          )}
        </CartProvider>
      </NotificationProvider>
    </WebSocketProvider>
  )
}

export default App
