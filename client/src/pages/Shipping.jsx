import { useConfig } from '../context/ConfigContext';
import './PolicyPage.css';

const Shipping = () => {
    const { configs, loading } = useConfig();
    const content = configs.shipping_policy || '<p>Información de envíos próximamente.</p>';

    return (
        <div className="policy-content-wrapper">
            {loading ? (
                <div className="loading-spinner">Cargando...</div>
            ) : (
                <div className="policy-body" dangerouslySetInnerHTML={{ __html: content }} />
            )}
        </div>
    );
};

export default Shipping;
