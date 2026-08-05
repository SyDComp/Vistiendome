import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/styles.css'
import App from './App.jsx'

// Interceptar fetch globalmente para inyectar admin_token a las peticiones del admin
const originalFetch = window.fetch;
window.fetch = async function () {
  const args = Array.from(arguments);
  let [resource, config] = args;
  let url = typeof resource === 'string' ? resource : resource?.url;

  if (url && url.includes('/api/')) {
    const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('access_token');
    if (adminToken) {
      config = config || {};
      config.headers = config.headers || {};
      
      if (config.headers instanceof Headers) {
        if (!config.headers.has('Authorization')) {
          config.headers.append('Authorization', `Bearer ${adminToken}`);
        }
      } else {
        if (!config.headers['Authorization'] && !config.headers['authorization']) {
          config.headers['Authorization'] = `Bearer ${adminToken}`;
        }
      }
      args[1] = config;
    }
  }

  const response = await originalFetch.apply(this, args);
  
  // Si la petición devuelve 401 (No autorizado) y no es el endpoint de login
  if (response.status === 401 && url && url.includes('/api/v1/') && !url.includes('/auth/login')) {
    const currentPath = window.location.pathname;
    // Si estamos en la zona de administración pero no en el login
    if (currentPath.startsWith('/admin') && currentPath !== '/admin/login') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('access_token');
      window.location.href = '/admin/login?expired=true';
    }
  }

  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
