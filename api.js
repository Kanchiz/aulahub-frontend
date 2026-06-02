// api.js - Motor central para peticiones al backend de AulaHub

const API_BASE_URL = "http://localhost:8080/api";

// =======================================================
// CONFIGURACIÓN DE ENTORNO (Atención Backend)
// Cambiar USE_MOCK a 'false' y colocar la URL de Spring Boot
// =======================================================
export const BASE_URL = 'http://localhost:8080/api';
export const USE_MOCK = true;

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

// --- SISTEMA DE NOTIFICACIONES GLOBALES ---
export function mostrarNotificacion(mensaje, tipo = "exito") {
    const contenedor = document.querySelector(".toasts");
    if (!contenedor) return;

    // Seleccionamos el ícono adecuado
    let icono = "info";
    if (tipo === "exito") icono = "check_circle";
    if (tipo === "error") icono = "error";

    // Construimos la alerta
    const notificacion = document.createElement("div");
    notificacion.className = `toast-mensaje toast-${tipo}`;
    notificacion.innerHTML = `
        <span class="material-symbols-outlined">${icono}</span>
        <p>${mensaje}</p>
    `;

    // La agregamos a la pantalla
    contenedor.appendChild(notificacion);

    // Activamos la animación de entrada
    setTimeout(() => {
        notificacion.classList.add("show");
    }, 10);

    // La destruimos sola después de 3.5 segundos
    setTimeout(() => {
        notificacion.classList.remove("show");
        // Esperamos a que termine la animación de salida para borrarla del HTML
        setTimeout(() => notificacion.remove(), 400); 
    }, 3500);
}

// --- SECUESTRO DEL ALERT NATIVO ---
window.originalAlert = window.alert; // Guardamos el feo por si acaso

window.alert = function(mensaje) {
    let tipo = "info"; // Por defecto lo pintamos azul
    
    // Un poco de magia: leemos el mensaje para adivinar el color
    const msg = String(mensaje).toLowerCase();
    
    if (msg.includes("éxito") || msg.includes("exito") || msg.includes("actualizada") || msg.includes("aceptada")) {
        tipo = "exito"; // Lo pintamos verde
    } else if (msg.includes("error") || msg.includes("denegado") || msg.includes("rechazada") || msg.includes("pasó")) {
        tipo = "error"; // Lo pintamos rojo
    }

    // Disparamos nuestra alerta bonita en lugar de la del navegador
    mostrarNotificacion(mensaje, tipo);
};
// --- SISTEMA DE CONFIRMACIÓN CUSTOM ---
export function confirmarAccion(mensaje) {
    return new Promise((resolve) => {
        // 1. Creamos el fondo y la tarjeta
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-card">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #ef4444; margin-bottom: 15px;">help</span>
                <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">Confirmación</h3>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">${mensaje}</p>
                <div class="confirm-btns">
                    <button class="btn-cancelar-conf" id="btn-cancel-conf">Cancelar</button>
                    <button class="btn-aceptar-conf" id="btn-ok-conf">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 2. Lo mostramos con animación
        setTimeout(() => overlay.classList.add('show'), 10);

        // 3. Función para cerrar y responder
        const cerrar = (resultado) => {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                resolve(resultado); // Aquí le decimos al código principal si fue True o False
            }, 300);
        };

        // 4. Escuchamos los clics
        document.getElementById('btn-cancel-conf').onclick = () => cerrar(false);
        document.getElementById('btn-ok-conf').onclick = () => cerrar(true);

        // Cerrar dando clic en el fondo oscuro
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cerrar(false);
        });
    });
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

// 7. Simular Reservas 
    if (endpoint.startsWith('/reservas') && !endpoint.includes('/estado')) {
        if (options.method === 'POST') return { id: 99, estado: "PENDIENTE" };
        
        const hoy = new Date().toISOString().split('T')[0];
        return [
            { id: 1, usuarioId: 2, aulaId: 1, fecha: hoy, horaInicio: "10:00", horaFin: "11:00", estado: "PENDIENTE", profesorName: "Profe FIC", materia: "Programación Web", grupo: "101" },
            { id: 2, usuarioId: 2, aulaId: 2, fecha: hoy, horaInicio: "11:00", horaFin: "12:00", estado: "ACEPTADA", profesorName: "Profe FIC", materia: "Bases de Datos", grupo: "102" },
            { id: 3, usuarioId: 2, aulaId: 3, fecha: hoy, horaInicio: "12:00", horaFin: "13:00", estado: "RECHAZADA", profesorName: "Profe FIC", materia: "Ingeniería de Software", grupo: "103" }
        ];
    }

    // 8. Simular la respuesta del administrador (PUT)
    if (endpoint.includes('/estado') && options.method === 'PUT') {
        return { success: true, message: "Estado actualizado y notificaciones enviadas por el backend" };
    }
    // 9. Simular recuperación de contraseña
    if (endpoint === '/reset-password' && options.method === 'POST') {
        return { success: true, message: "Instrucciones enviadas al correo" };
    }
    // 10. Simular subida y borrado de foto de perfil
    if (endpoint === '/usuarios/foto') {
        if (options.method === 'POST') {
            return { success: true, message: "Imagen recibida y guardada" };
        }
        if (options.method === 'DELETE') {
            return { success: true, message: "Imagen eliminada del servidor" };
        }
    }

    console.log(`[SIMULADOR] No hay datos falsos configurados para: ${endpoint}`);
    return [];
}