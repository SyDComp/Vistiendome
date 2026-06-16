import { useConfig } from '../context/ConfigContext';
import './PolicyPage.css';

const Terms = () => {
    const { configs, loading } = useConfig();
    const content = configs.terms_conditions || '<p>Términos y condiciones próximamente.</p>';

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

export default Terms;
