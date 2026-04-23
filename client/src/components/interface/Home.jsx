import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../layout/navbar/Navbar';
import Footer from '../layout/footer/Footer';
import { navLinks } from '../../constants/pruebas';
import DetalleProducto from './vistas/DetalleProducto';
import CartDrawer from './cart/CartDrawer';

const Home = ({ isModalView = false }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Gestión dinámica de estilos globales
    useEffect(() => {
        document.body.classList.add('has-fixed-navbar');
        return () => {
            document.body.classList.remove('has-fixed-navbar');
        };
    }, []);

    // Si es vista de modal, renderizamos solo el componente de detalle
    if (isModalView) {
        return <DetalleProducto isModal={true} />;
    }

    return (
        <>
            <Navbar
                links={navLinks}
                vistaActual={location.pathname === '/' ? 'inicio' : location.pathname.slice(1)}
            />

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
        </>
    );
};

export default Home;
