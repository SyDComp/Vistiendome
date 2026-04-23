import React, { useState } from 'react';
import { useForm } from '../../../hooks/useForm';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

// Validaciones Puras y Agnosticas
const validateRegister = (values) => {
    const errors = {};
    if (!values.rut) {
        errors.rut = "El RUT es obligatorio";
    } else if (values.rut.length < 8) {
        errors.rut = "Formato de RUT no válido";
    }

    if (!values.nombres) errors.nombres = "El nombre es obligatorio";
    if (!values.apellidos) errors.apellidos = "Los apellidos son obligatorios";
    
    if (!values.email) {
        errors.email = "El correo es obligatorio";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
        errors.email = "El correo no es válido";
    }

    if (!values.password) {
        errors.password = "La contraseña es obligatoria";
    } else if (values.password.length < 6) {
        errors.password = "Debe tener al menos 6 caracteres";
    }

    return errors;
};

const RegisterForm = () => {
    const [statusMessage, setStatusMessage] = useState(null);

    const initialValues = {
        rut: '',
        nombres: '',
        apellidos: '',
        email: '',
        password: ''
    };

    const { 
        values, 
        errors, 
        isSubmitting, 
        handleChange, 
        handleSubmit, 
        resetForm,
        setErrors 
    } = useForm(initialValues, validateRegister);

    // Conexión Simlada/Real con el Backend IAM
    const submitToServer = async (formValues) => {
        setStatusMessage(null);
        
        try {
            const response = await fetch('http://localhost:8000/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });

            const data = await response.json();

            if (!response.ok) {
                // Caso: El backend detecta duplicidad de correo (400 Bad Request)
                if (data.detail && typeof data.detail === 'string') {
                    if (data.detail.toLowerCase().includes('correo')) {
                        setErrors({ email: data.detail });
                    } else {
                        setStatusMessage({ type: 'error', text: data.detail });
                    }
                }
                return;
            }

            setStatusMessage({ type: 'success', text: "¡Tu cuenta ha sido creada exitosamente!" });
            resetForm();

        } catch (error) {
            setStatusMessage({ type: 'error', text: "Error de red conectando con el servidor." });
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
            <h2>Únete a Vistiéndome 👋</h2>
            <p style={{ color: '#666', marginBottom: '30px' }}>Crea tu cuenta de cliente para guardar tus vestidos favoritos e historial real.</p>

            {statusMessage && (
                <div style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    backgroundColor: statusMessage.type === 'error' ? '#ffebee' : '#e8f5e9',
                    color: statusMessage.type === 'error' ? '#c62828' : '#2e7d32',
                    fontWeight: 500
                }}>
                    {statusMessage.text}
                </div>
            )}

            <form onSubmit={handleSubmit(submitToServer)}>
                <Input
                    label="RUT"
                    name="rut"
                    placeholder="12345678-9"
                    value={values.rut}
                    onChange={handleChange}
                    error={errors.rut}
                    required
                />

                <Input
                    label="Nombres"
                    name="nombres"
                    placeholder="Escriba su(s) nombre(s)"
                    value={values.nombres}
                    onChange={handleChange}
                    error={errors.nombres}
                    required
                />

                <Input
                    label="Apellidos"
                    name="apellidos"
                    placeholder="Escriba sus apellidos"
                    value={values.apellidos}
                    onChange={handleChange}
                    error={errors.apellidos}
                    required
                />

                <Input
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={values.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                />

                <Input
                    label="Contraseña Secura"
                    name="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={values.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                />

                <Button 
                    type="submit" 
                    className="w-100" 
                    style={{ width: '100%', marginTop: '10px' }}
                    isLoading={isSubmitting}
                >
                    Crear mi cuenta
                </Button>
            </form>
        </div>
    );
};

export default RegisterForm;
