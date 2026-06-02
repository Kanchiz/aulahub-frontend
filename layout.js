// layout.js - Navegación y Notificaciones con Spring Boot
import { fetchAPI } from "./api.js";

// Variable global para no hacer la petición del ID muchas veces
let cachedUserId = null;

export function cargarHeader() {
    cargarFavicon();

    const headerElement = document.querySelector('header');
    if (!headerElement) return;

    headerElement.innerHTML = `
        <nav>
            <ul>
                <li class="abrirmenu">
                    <a href="#">
                        <span class="material-symbols-outlined">menu_open</span>
                    </a>
                    <div class="submenu">
                        <ul id="menu-lista">
                            <li><a href="#">Cargando menú...</a></li> 
                        </ul>
                    </div>
                </li>
            </ul>
        </nav>
        <nav>
            <ul>
                <li>
                    <div class="notificacion" id="btnNotificacion">
                        <span class="material-symbols-outlined">notifications</span>
                    </div>
                    <div class="notificaciones-menu" id="menuNotificaciones">
                        <div class="noti-header">Notificaciones</div>
                        <ul class="noti-list" id="listaNotificaciones">
                            <li class="noti-vacio">Cargando...</li>
                        </ul>
                    </div>
                </li>
                <li class="usuario">
                    <a href="#">
                        <img src="img/usuario.png" id="preview" alt="avatar">
                    </a>
                    <div class="subusuario">
                        <ul>
                            <li><div id="userinfo">Cargando...</div></li>
                            <input type="file" id="fileInput" accept="image/*" style="display:none;">
                            <li><button id="btnSubirFoto">Subir Foto</button></li>
                            <li><button id="btnBorrarFoto">Borrar Foto</button></li>
                        </ul>
                    </div>
                </li>
            </ul>
        </nav>
    `;

    inicializarEventosHeader();
}

// Función helper para obtener el ID numérico del usuario actual desde el backend
async function getCurrentUserId() {
    if (cachedUserId) return cachedUserId;
    const email = localStorage.getItem("aulaHub_user");
    if (!email) return null;
    
    try {
        const usuarios = await fetchAPI("/usuarios");
        const user = usuarios.find(u => u.email === email);
        if (user) {
            cachedUserId = user.id;
            return user.id;
        }
    } catch(e) {
        console.error("Error obteniendo el usuario:", e);
    }
    return null;
}

async function cargarYMostrarNotificaciones() {
    const lista = document.getElementById('listaNotificaciones');
    if(!lista) return;

    lista.innerHTML = '<li class="noti-vacio">Cargando...</li>';

    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            lista.innerHTML = '<li class="noti-vacio">Error al identificar usuario</li>';
            return;
        }

        const notificaciones = await fetchAPI(`/notificaciones/usuario/${userId}`);

        if (!notificaciones || notificaciones.length === 0) {
            lista.innerHTML = '<li class="noti-vacio">Sin notificaciones recientes</li>';
            return;
        }

        let html = '';
        notificaciones.forEach(noti => {
            const fecha = new Date(noti.createdAt).toLocaleDateString();
            const claseNoLeido = !noti.leida ? 'sin-leer' : '';

            html += `
            <li class="noti-item ${claseNoLeido}" onclick="marcarNotificacionLeida(${noti.id}, this)">
                <span class="noti-titulo">${noti.titulo}</span>
                <span class="noti-mensaje">${noti.mensaje}</span>
                <span class="noti-fecha">${fecha}</span>
            </li>`;
        });

        lista.innerHTML = html;
        document.getElementById('btnNotificacion').classList.remove('con-novedades');

    } catch (error) {
        console.error("Error cargando notificaciones:", error);
        lista.innerHTML = '<li class="noti-vacio">Error al cargar notificaciones.</li>';
    }
}

// Exponemos la función al scope global para que el onclick del HTML la encuentre
window.marcarNotificacionLeida = async function(id, elemento) {
    if(elemento.classList.contains('sin-leer')) {
        try {
            await fetchAPI(`/notificaciones/${id}/leer`, { method: "PUT" });
            elemento.classList.remove('sin-leer');
        } catch(e) {
            console.error("Error al marcar como leída:", e);
        }
    }
}

function inicializarEventosHeader() {
    const subMenu = document.querySelector('.submenu');
    const openSubMenu = document.querySelector('.abrirmenu');

    if (openSubMenu && subMenu) {
        openSubMenu.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            subMenu.classList.toggle('show'); 
            document.getElementById('menuNotificaciones')?.classList.remove('show');
            document.querySelector('.subusuario')?.classList.remove('show');
            
            // Actualizamos el menú dinámicamente al abrirlo
            if (subMenu.classList.contains('show')) actualizarMenu();
        });
    }

    const menuUsuario = document.querySelector('.subusuario');
    const abrirUsuario = document.querySelector('.usuario');
    if (abrirUsuario && menuUsuario) {
        abrirUsuario.addEventListener('click', (e) => {
            e.stopPropagation(); 
            menuUsuario.classList.toggle('show');
            subMenu?.classList.remove('show');
            document.getElementById('menuNotificaciones')?.classList.remove('show');
        });
    }

    const btnNoti = document.getElementById('btnNotificacion');
    const menuNoti = document.getElementById('menuNotificaciones');

    if(btnNoti && menuNoti) {
        btnNoti.addEventListener('click', (e) => {
            e.stopPropagation();
            const estaAbierto = menuNoti.classList.contains('show');

            subMenu?.classList.remove('show');
            menuUsuario?.classList.remove('show');

            if (estaAbierto) {
                menuNoti.classList.remove('show');
            } else {
                menuNoti.classList.add('show');
                cargarYMostrarNotificaciones();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if(subMenu && !subMenu.contains(e.target) && !openSubMenu.contains(e.target)) subMenu.classList.remove('show');
        if(menuUsuario && !menuUsuario.contains(e.target) && !abrirUsuario.contains(e.target)) menuUsuario.classList.remove('show');
        if(menuNoti && !menuNoti.contains(e.target) && !btnNoti.contains(e.target)) menuNoti.classList.remove('show');
    });
}

function cargarFavicon() {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = 'img/logofic.png';
    link.type = 'image/png';
}

export async function actualizarMenu() {
    const menuLista = document.getElementById('menu-lista');
    if (!menuLista) return;

    let esAdmin = false;
    try {
        const userId = await getCurrentUserId();
        if (userId) {
            // Consultamos los roles del sistema
            const roles = await fetchAPI(`/roles`);
            // Verificamos si este usuario tiene rol de ADMIN o SUPER_ADMIN
            const misRoles = roles.filter(r => r.usuarioId === userId);
            esAdmin = misRoles.some(r => r.tipo === 'ADMIN' || r.tipo === 'SUPER_ADMIN');
        }
    } catch (e) {
        console.error("Error verificando roles para el menú", e);
    }

    let html = `<li><a href="aulas.html">Menu Principal</a></li>
                <li><a href="configuraciones.html">Configuraciones</a></li>`;
    
    if (esAdmin) {
        html += `<li><a href="solicitudes.html" style="color: #164B8A; font-weight: bold;">Solicitudes (Admin)</a></li>
                 <li><a href="misReservas.html">Historial de Reservas</a></li>
                 <li><a href="reglamento.html">Reglamento</a></li>`;
    } else {
        html += `<li><a href="misReservas.html">Mis reservas</a></li>
                 <li><a href="ayuda.html">Ayuda</a></li>
                 <li><a href="reglamento.html">Reglamento</a></li>`;
    }
    html += `<li><a href="#" id="logout-menu">Cerrar sesión</a></li>`;
    
    menuLista.innerHTML = html;

    // Lógica para cerrar sesión desde el menú dinámico
    const btnLogout = document.getElementById("logout-menu");
    if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("aulaHub_token");
            localStorage.removeItem("aulaHub_user");
            window.location.href = "index.html";
        });
    }
}

export function cargarFooter() {
    const footerElement = document.querySelector('footer');
    if (footerElement) {
        const currentYear = new Date().getFullYear();
        footerElement.innerHTML = `Facultad de Informática Culiacán - ${currentYear}`;
    }
}

export function mostrarToast(mensaje) {
    let contenedor = document.querySelector('.toasts');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.classList.add('toasts');
        document.body.appendChild(contenedor);
    }
    const noti = document.createElement('div');
    noti.classList.add('toast');
    noti.innerText = mensaje;
    contenedor.appendChild(noti);
    setTimeout(() => {
        noti.style.opacity = '0';
        noti.style.transform = 'translateX(100%)';
        setTimeout(() => noti.remove(), 300);
    }, 3000);
}

// Mantenemos esta función vacía exportada por si algún otro archivo viejo la llama, para que no truene.
export function iniciarEscuchaNotificaciones() { }