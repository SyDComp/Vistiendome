import React, { Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import Home from './components/interface/Home'
import { WebSocketProvider } from './context/WebSocketContext'
import { NotificationProvider } from './context/NotificationContext'
import { CartProvider } from './context/CartContext'
import { SettingsProvider } from './context/SettingsContext'
import { useScrollLock } from './hooks/useScrollLock'
import SuspenseFallback from './components/ui/SuspenseFallback'

// Rutas críticas (cargadas estáticamente)
import Inicio from './components/interface/vistas/Inicio'
import CatalogView from './features/catalog/components/CatalogView'
import ColeccionesIndex from './components/interface/vistas/ColeccionesIndex'
import ProductDetailView from './features/productDetail/components/ProductDetailView'

// Rutas lazy-loadadas (pesadas o secundarias)
const SuperSetup = React.lazy(() => import('./components/interface/admin/SuperSetup'))
const AdminLogin = React.lazy(() => import('./components/interface/admin/AdminLogin'))
const DashboardLayout = React.lazy(() => import('./components/interface/admin/DashboardLayout'))
const PrintLabel = React.lazy(() => import('./components/interface/admin/crm/PrintLabel'))

const Nosotros = React.lazy(() => import('./components/interface/vistas/Nosotros'))
const Contacto = React.lazy(() => import('./components/interface/vistas/Contacto'))
const AtencionCliente = React.lazy(() => import('./components/interface/vistas/AtencionCliente'))
const Search = React.lazy(() => import('./components/interface/vistas/Search'))
const DetalleColeccion = React.lazy(() => import('./components/interface/vistas/DetalleColeccion'))

function App() {
  const location = useLocation();
  const state = location.state;
  const isModalOpen = !!state?.backgroundLocation;

  const isAdminRoute = location.pathname.startsWith('/admin');
  const shouldScrollLock = isModalOpen || isAdminRoute;

  // Scroll lock centralizado via hook
  useScrollLock(shouldScrollLock);

  // Scroll to Top Global
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <WebSocketProvider>
      <NotificationProvider>
        <SettingsProvider>
          <CartProvider>
            <Suspense fallback={<SuspenseFallback />}>
              {/* Rutas Principales */}
              <Routes location={state?.backgroundLocation || location}>
                <Route path="/" element={<Home />}>
                   <Route index element={<Inicio />} />
                   <Route path="catalogo" element={<CatalogView />} />
                   <Route path="colecciones" element={<ColeccionesIndex />} />
                   <Route path="nosotros" element={<Nosotros />} />
                   <Route path="contacto" element={<Contacto />} />
                   <Route path="ayuda" element={<AtencionCliente />} />
                   <Route path="search" element={<Search />} />
                   <Route path="producto/:slug/:sku?/:imgIndex?" element={<ProductDetailView />} />
                   <Route path="catalogo/producto/:slug/:sku?/:imgIndex?" element={<ProductDetailView />} />
                   <Route path="coleccion/:slug" element={<DetalleColeccion />} />
                   <Route path="coleccion/:collectionSlug/producto/:slug/:sku?/:imgIndex?" element={<ProductDetailView />} />
                </Route>
                
                <Route path="/admin/bootstrap" element={<SuperSetup />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard/*" element={<DashboardLayout />} />
                <Route path="/admin/print/cotizacion/:id" element={<PrintLabel />} />
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
                  <Route path="/catalogo/producto/:slug/:sku?/:imgIndex?" element={
                    <div className="modal-routing-overlay fade-in">
                       <div className="modal-routing-content">
                          <Home isModalView={true} />
                       </div>
                    </div>
                  } />
                </Routes>
              )}
            </Suspense>
          </CartProvider>
        </SettingsProvider>
      </NotificationProvider>
    </WebSocketProvider>
  )
}

export default App
