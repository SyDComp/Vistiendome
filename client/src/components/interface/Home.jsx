import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../layout/navbar/Navbar';
import Footer from '../layout/footer/Footer';
import { navLinks } from '../../constants/pruebas';
import ProductDetailView from '../../features/productDetail/components/ProductDetailView';
import CartDrawer from './cart/CartDrawer';
import WelcomeModal from './WelcomeModal';
import TopBanner from './TopBanner';
import WhatsAppFAB from './WhatsAppFAB';

const Home = ({ isModalView = false }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determinar si debemos mostrar el Navbar (se oculta en colecciones porque tienen su propio header hero)
    const hideNavbar = location.pathname.startsWith('/coleccion/');

    // Gestión dinámica de estilos globales: Solo aplicar padding si el Navbar es visible
    useEffect(() => {
        if (isModalView) return; // El modal no debe interferir con las clases globales de layout

        if (!hideNavbar) {
            document.body.classList.add('has-fixed-navbar');
        } else {
            document.body.classList.remove('has-fixed-navbar');
        }
        
        return () => {
            document.body.classList.remove('has-fixed-navbar');
        };
    }, [hideNavbar, isModalView]);

    // Si es vista de modal, renderizamos solo el componente de detalle
    if (isModalView) {
        return <ProductDetailView isModal={true} />;
    }

    return (
        <>
            <TopBanner />
            {!hideNavbar && (
                <Navbar
                    links={navLinks}
                    vistaActual={location.pathname === '/' ? 'inicio' : location.pathname.slice(1)}
                />
            )}

            <div className="home-layout">
                <main className="content">
                    {/* El Outlet renderiza el componente según la URL (Inicio, Catalogo, etc.) */}
                    <div className="views-container">
                        <Outlet />
                    </div>
                </main>
                
                <Footer onNavigate={(destino, seccion) => {
                    const path = destino === 'inicio' ? '/' : `/${destino}`;
                    
                    // Si ya estamos en la misma ruta, forzamos scroll arriba
                    if (location.pathname === path) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }

                    // Navegamos pasando la sección elegida en el estado
                    // El timestamp 't' asegura que el estado sea "nuevo" para React incluso si repetimos sección
                    navigate(path, { 
                        state: { 
                            section: seccion,
                            t: Date.now() 
                        } 
                    });
                }} />
            </div>

            <CartDrawer />
            <WelcomeModal />
            <WhatsAppFAB />
        </>
    );
};

export default Home;
