// api.js - Motor central para peticiones al backend de AulaHub

const API_BASE_URL = "http://localhost:8080/api";

/**
 * Función genérica para consumir los endpoints de Spring Boot.
 * Inyecta automáticamente el token JWT en los headers si existe.
 */
export async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Configuramos los headers por defecto
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    // Si tenemos un token guardado, lo inyectamos para la seguridad
    const token = localStorage.getItem("aulaHub_token");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, config);
        
        // Si el token expiró o es inválido, cerramos sesión por seguridad
        if (response.status === 401 && endpoint !== '/auth/login') {
            localStorage.removeItem("aulaHub_token");
            localStorage.removeItem("aulaHub_user");
            window.location.href = "index.html";
            throw new Error("Sesión expirada");
        }

        const data = await response.json();

        // Si la respuesta no es OK (ej. 404, 409), lanzamos el error del backend
        if (!response.ok) {
            throw new Error(data.message || "Error en la petición al servidor");
        }

        return data;
    } catch (error) {
        console.error(`Error en API (${endpoint}):`, error);
        throw error;
    }
}