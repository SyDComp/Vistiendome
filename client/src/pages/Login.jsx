import LoginForm from '../components/organisms/LoginForm';
import './Login.css';

export default function Login() {
    return (
        <div className="login-page">
            <div className="login-page__content">
                <LoginForm />
            </div>
        </div>
    );
}
