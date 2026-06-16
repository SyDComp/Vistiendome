import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import DataTable from '../../../components/organisms/DataTable';
import TableFilter from '../../../components/templates/TableFilter';
import Button from '../../../components/atoms/Button';
import Modal from '../../../components/molecules/Modal';
import { useNotification } from '../../../context/NotificationContext';
import './WorkshopAdmin.css';

export default function WorkshopList() {
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, postId: null });
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    const fetchPosts = async () => {
        try {
            const res = await api.get('/workshop/all');
            setPosts(res.data);
            setFilteredPosts(res.data);
        } catch (error) {
            console.error(error);
            showNotification('error', 'Error al cargar las publicaciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return;
        try {
            await api.delete(`/workshop/${id}`);
            showNotification('success', 'Publicación eliminada');
            fetchPosts();
        } catch (error) {
            console.error(error);
            showNotification('error', 'Error al eliminar la publicación');
        }
    };

    // Helper to get text preview from JSON blocks
    const getPreviewText = (content) => {
        // Fallback for empty/invalid content
        if (!content) return 'Sin contenido';
        // Handle case where content might be a string (markdown/html) instead of block object
        if (typeof content === 'string') {
            return content.replace(/<[^>]+>/g, '').substring(0, 100) + '...';
        }

        if (!content.blocks || !Array.isArray(content.blocks)) return 'Contenido inválido';

        // Extract text from paragraph blocks
        const textBlocks = content.blocks.filter(b => b.type === 'paragraph');
        if (textBlocks.length > 0 && textBlocks[0].data && textBlocks[0].data.text) {
            return textBlocks[0].data.text.replace(/<[^>]+>/g, '').substring(0, 100) + '...';
        }
        return '[Contenido Multimedia]';
    };

    const handleTogglePublish = async (post) => {
        try {
            await api.put(`/workshop/${post.id}`, { is_published: !post.is_published });
            showNotification('success', post.is_published ? 'Publicación ocultada' : 'Publicación visible');
            fetchPosts();
        } catch (error) {
            console.error('Error updating post:', error);
            showNotification('error', 'Error al actualizar el estado de la publicación');
        }
    };

    const columns = [
        {
            accessor: 'title',
            header: 'Título',
            cell: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {row.media && row.media.length > 0 && (
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', background: '#f0f0f0' }}>
                            {row.media[0].type === 'image' ? (
                                <img src={`${(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')}/static/${row.media[0].url}`} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.2rem' }}>🎥</span>
                            )}
                        </div>
                    )}
                    <div>
                        <span>{row.title}</span>
                        <div className="text-sm text-gray-500 truncate max-w-xs"
                            dangerouslySetInnerHTML={{ __html: getPreviewText(row.content) }} />
                    </div>
                </div>
            )
        },
        {
            accessor: 'created_at',
            header: 'Fecha',
            cell: (row) => new Date(row.created_at).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })
        },
        {
            accessor: 'is_published',
            header: 'Estado',
            cell: (row) => (
                <span
                    className={`status-badge status-${row.is_published ? 'completed' : 'cancelled'}`}
                    style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
                    onClick={() => handleTogglePublish(row)}
                    title="Clic para cambiar estado"
                >
                    {row.is_published ? 'Público' : 'Oculto'}
                </span>
            )
        },
        {
            header: 'Acciones',
            cell: (row) => (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn-action btn-edit" onClick={() => navigate(`/admin/taller/${row.id}`)}>
                        Editar
                    </button>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(row.id)}>
                        Eliminar
                    </button>
                </div>
            )
        }
    ];

    if (loading) return <div>Cargando publicaciones...</div>;

    return (
        <div className="admin-page">
            <div
                className="page-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '3rem',
                    marginBottom: '2rem',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                }}
            >
                <h2>Gestión de El Taller</h2>
                <Link to="/admin/taller/new">
                    <Button variant="primary">+ Nueva Publicación</Button>
                </Link>
            </div>

            <TableFilter
                searchPlaceholder="Buscar por título o contenido..."
                searchFields={['title']} // No easy way to search complex JSON content blocks without heavy recursion, title is safest
                quickFilters={[
                    { key: 'all', label: 'Todas' },
                    { key: 'public', label: 'Públicas', filterKey: 'is_published', filterValue: true },
                    { key: 'hidden', label: 'Ocultas', filterKey: 'is_published', filterValue: false }
                ]}
                defaultQuickFilter="all"
                data={posts}
                onFilterChange={setFilteredPosts}
            />

            <div style={{ marginTop: '2rem' }}>
                <DataTable
                    columns={columns}
                    data={filteredPosts}
                    emptyMessage="No hay publicaciones en El Taller."
                />
            </div>
        </div>
    );
}
