import { useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar cualquier formulario en React.
 * Agnostico a herramientas externas, usa funciones puras para validación.
 * 
 * @param {Object} initialValues - Estado inicial del formulario.
 * @param {Function} validateFn - Función pura que recibe (values) y retorna objeto de { field: "Error" }.
 */
export const useForm = (initialValues = {}, validateFn = () => ({})) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Manejador centralizado inmutable (para onChange)
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        
        setValues((prev) => ({
            ...prev,
            [name]: val
        }));

        // Limpiar el error visual si el usuario comienza a tipear de nuevo
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    }, [errors]);

    // Setter manual (por si se necesita setear un valor complejo programáticamente como un Dropdown)
    const setFieldValue = useCallback((field, value) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    }, [errors]);

    // Resetea el formulario por completo
    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setIsSubmitting(false);
    }, [initialValues]);

    // Función de envío interceptada
    const handleSubmit = (onSubmitFn) => async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        setIsSubmitting(true);
        const validationErrors = validateFn(values);
        
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setIsSubmitting(false);
            return;
        }

        try {
            await onSubmitFn(values);
        } catch (error) {
            console.error("Form Exception:", error);
            // Optionally we can set global errors here
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        values,
        errors,
        isSubmitting,
        handleChange,
        setFieldValue,
        setValues,
        setErrors, // Solo en casos Edge, si el Backend manda un 400 con los keys del error
        handleSubmit,
        resetForm
    };
};
