import { useConfig } from '../context/ConfigContext';
import './PolicyPage.css';

const About = () => {
    const { configs, loading } = useConfig();
    const content = configs.about_us || '<p>Información sobre nosotros próximamente.</p>';

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

export default About;
