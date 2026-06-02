// api.js - Motor central para peticiones al backend de AulaHub

const API_BASE_URL = "http://localhost:8080/api";

// ⚠️ MODO SIMULADOR: Cambia a 'false' cuando el backend esté listo
const USE_MOCK = true; 

export async function fetchAPI(endpoint, options = {}) {
    // Si el simulador está activo, interceptamos la petición
    if (USE_MOCK) {
        console.warn(`[SIMULADOR] Petición interceptada a: ${endpoint}`);
        return simulateResponse(endpoint, options);
    }

    // --- LÓGICA REAL (Se ejecutará cuando USE_MOCK sea false) ---
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    const token = localStorage.getItem("aulaHub_token");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401 && endpoint !== '/auth/login') {
            localStorage.removeItem("aulaHub_token");
            localStorage.removeItem("aulaHub_user");
            window.location.href = "index.html";
            throw new Error("Sesión expirada");
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Error en el servidor");
        return data;
    } catch (error) {
        console.error(`Error API (${endpoint}):`, error);
        throw error;
    }
}

// --- DATOS FALSOS PARA PODER TRABAJAR EL FRONTEND ---
async function simulateResponse(endpoint, options) {
    // Retraso artificial de 300ms para que se sienta como una red real
    await new Promise(resolve => setTimeout(resolve, 300));

    // 1. Simular Login
    if (endpoint === '/auth/login') {
        const body = JSON.parse(options.body);
        // Validamos que al menos escriba algo
        if(body.email && body.password) {
            return { accessToken: "token-falso-super-seguro", tokenType: "Bearer" };
        }
        throw new Error("Credenciales inválidas");
    }

    // 2. Simular lista de usuarios (Para que el layout encuentre tu ID)
    if (endpoint === '/usuarios') {
        return [
            { id: 1, email: "admin@uas.edu.mx", nombre: "Admin FIC" },
            { id: 2, email: "profe@uas.edu.mx", nombre: "Profe FIC" }
        ];
    }

    // 3. Simular roles (El usuario 1 es ADMIN, el 2 es PROFESOR)
    if (endpoint === '/roles') {
        return [
            { id: 1, usuarioId: 1, tipo: "ADMIN" },
            { id: 2, usuarioId: 2, tipo: "PROFESOR" }
        ];
    }

    // 4. Simular notificaciones
    if (endpoint.startsWith('/notificaciones/usuario/')) {
        return [
            { id: 101, titulo: "Bienvenido a AulaHub", mensaje: "Tu sesión de prueba inició correctamente.", leida: false, createdAt: new Date().toISOString() },
            { id: 102, titulo: "Simulador Activo", mensaje: "Estás viendo datos generados por el mock en api.js.", leida: false, createdAt: new Date(Date.now() - 86400000).toISOString() }
        ];
    }

    // 5. Simular marcar notificación como leída
    if (endpoint.includes('/leer')) {
        return { success: true };
    }
    // 6. Simular Materias
    if (endpoint === '/materias') {
        return [
            { id: 1, nombre: "Programación Web", codigo: "FIC-101", activa: true },
            { id: 2, nombre: "Bases de Datos", codigo: "FIC-102", activa: true },
            { id: 3, nombre: "Ingeniería de Software", codigo: "FIC-103", activa: true }
        ];
    }

    // 7. Simular Reservas para el calendario
    if (endpoint.startsWith('/reservas')) {
        // Si el front hace un POST para crear una reserva
        if (options.method === 'POST') {
            return { id: 99, estado: "PENDIENTE" };
        }
        
        // Si el front hace un GET para llenar la tabla
        // Generamos una reserva falsa para hoy a las 10:00 AM
        const hoy = new Date().toISOString().split('T')[0];
        return [
            { 
                id: 1, 
                usuarioId: 2, 
                aulaId: 1, 
                fecha: hoy, 
                horaInicio: "10:00",
                horaFin: "11:00",
                estado: "ACEPTADA", 
                profesorName: "Profe FIC" 
            }
        ];
    }

    console.log(`[SIMULADOR] No hay datos falsos configurados para: ${endpoint}`);
    return [];
}