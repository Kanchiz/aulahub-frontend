// solicitudes.js - Conectado a Spring Boot (Nombres Corregidos)
import { fetchAPI } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
    const filterSelect = document.getElementById("statusFilter");
    if(filterSelect) {
        filterSelect.addEventListener("change", () => {
            cargarSolicitudes(filterSelect.value);
        });
    }

    await verificarAdminYCargar();
});

async function verificarAdminYCargar() {
    const emailLocal = localStorage.getItem("aulaHub_user");
    if(!emailLocal) {
        window.location.href = "index.html";
        return;
    }

    try {
        const usuarios = await fetchAPI("/usuarios");
        const userObj = usuarios.find(u => u.email === emailLocal);
        
        if (userObj) {
            const roles = await fetchAPI('/roles');
            const misRoles = roles.filter(r => r.usuarioId === userObj.id);
            const isAdmin = misRoles.some(r => r.tipo === 'ADMIN' || r.tipo === 'SUPER_ADMIN');

            if (isAdmin) {
                cargarSolicitudes("Pendiente");
            } else {
                alert("Acceso denegado. No tienes permisos de administrador.");
                window.location.href = "aulas.html";
            }
        }
    } catch (e) { 
        console.error("Error verificando permisos:", e); 
    }
}

function getNombreAula(codigo) {
    const str = String(codigo).toLowerCase();
    if (str === "1" || str === "laba") return "Laboratorio de Cómputo A";
    if (str === "2" || str === "labb") return "Laboratorio de Cómputo B";
    if (str === "3" || str === "centro") return "Centro de Cómputo";
    if (str === "4" || str === "auditorio") return "Auditorio FIC";
    if (str === "5" || str === "labcd") return "Laboratorio de Ciencia de Datos";
    if (str === "6" || str === "labp") return "Laboratorio de Posgrado";
    return codigo ? `Laboratorio ${codigo}` : "Aula desconocida";
}

async function cargarSolicitudes(statusFilter) {
    const container = document.getElementById('solicitudes-container');
    const loading = document.getElementById('loading');
    const emptyMsg = document.getElementById('empty-message');
    
    if(container) container.innerHTML = "";
    if(emptyMsg) emptyMsg.style.display = 'none';
    if(loading) loading.style.display = 'block';

    try {
        const todasLasReservas = await fetchAPI('/reservas');
        if(loading) loading.style.display = 'none';

        const filtradas = todasLasReservas.filter(r => {
            const est = (r.estado || "PENDIENTE").toUpperCase();
            return est === statusFilter.toUpperCase();
        });

        if (filtradas.length === 0) {
            if(emptyMsg) emptyMsg.style.display = 'block';
            return;
        }

        let html = "";
        filtradas.forEach(r => {
            const id = r.id;
            const nombreAulaCompleto = getNombreAula(r.aulaId || r.aula);
            const icono = nombreAulaCompleto.toLowerCase().includes("auditorio") ? "podium" : "computer";
            const nombreMostrar = r.profesorName || "Profesor";

            let botonesHtml = "";
            if (statusFilter === "Pendiente") {
                botonesHtml = `
                <div class="solicitud-actions">
                    <button onclick="responderSolicitud('${id}', 'RECHAZADA')" class="btn-rechazar">Rechazar</button>
                    <button onclick="responderSolicitud('${id}', 'ACEPTADA')" class="btn-aceptar">Aceptar</button>
                </div>`;
            } else {
                let colorClass = statusFilter === "Aceptada" ? "text-green" : "text-red";
                botonesHtml = `<div class="solicitud-actions"><span class="${colorClass}" style="font-weight:bold;">Estado: ${statusFilter}</span></div>`;
            }

            html += `
            <div class="card solicitud-card" id="card-${id}">
                <div class="solicitud-header">
                    <div class="aula-icon-small"><span class="material-symbols-outlined">${icono}</span></div>
                    <div class="solicitud-info">
                        <h3>${r.materia || "Sin materia"}</h3>
                        <span class="profesor-name">${nombreMostrar}</span>
                    </div>
                </div>
                <div class="solicitud-body">
                    <p><strong>Aula:</strong> ${nombreAulaCompleto}</p>
                    <p><strong>Grupo:</strong> ${r.grupo || "N/A"}</p>
                    <p><strong>Horario:</strong> ${r.horaInicio || ""} - ${r.horaFin || ""}</p>
                    <p><strong>Fecha:</strong> ${r.fecha || "N/A"}</p>
                </div>
                ${botonesHtml}
            </div>`;
        });
        
        if(container) container.innerHTML = html;

    } catch (error) { 
        console.error("Error cargando solicitudes:", error); 
        if(loading) loading.innerText = "Error de conexión.";
    }
}

window.responderSolicitud = async (id, nuevoStatus) => {
    const card = document.getElementById(`card-${id}`);
    
    if(card) { 
        card.style.opacity = "0.5"; 
        card.style.pointerEvents = "none"; 
    }

    try {
        await fetchAPI(`/reservas/${id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: nuevoStatus })
        });
        
        const filterSelect = document.getElementById("statusFilter");
        cargarSolicitudes(filterSelect ? filterSelect.value : "Pendiente");

    } catch (e) {
        console.error("Error al responder:", e);
        alert("Hubo un error al procesar la solicitud.");
        if(card) { 
            card.style.opacity = "1"; 
            card.style.pointerEvents = "all"; 
        }
    }
};