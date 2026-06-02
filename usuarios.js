// usuarios.js - Lógica de sesión consumiendo Spring Boot
import { fetchAPI } from "./api.js";
import { actualizarMenu, cargarFooter, cargarHeader } from "./layout.js"; // Los adaptaremos en la Fase 2

document.addEventListener("DOMContentLoaded", () => {
    cargarHeader();
    cargarFooter();

    // 1. Elementos del DOM (Login)
    const loginBtn = document.getElementById("login");
    const emailInput = document.getElementById("login-email");
    const passInput = document.getElementById("login-password");
    
    // 2. Elementos del DOM (Configuraciones / Perfil)
    const configEmail = document.getElementById("user-email");
    const userInfo = document.getElementById("userinfo");
    
    // --- LÓGICA DE LOGIN ---
    if (loginBtn && emailInput && passInput) {
        const realizarLogin = async () => {
            const email = emailInput.value.trim();
            const password = passInput.value.trim();
            
            if (!email || !password) {
                return alert("Ingrese su correo y contraseña.");
            }

            loginBtn.innerText = "Entrando...";
            loginBtn.disabled = true;

            try {
                // Le pegamos al endpoint público de Auth en Spring Boot
                const response = await fetchAPI("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });

                // Guardamos el JWT y el email en localStorage
                localStorage.setItem("aulaHub_token", response.accessToken);
                localStorage.setItem("aulaHub_user", email);
                
                // Redirigimos al catálogo
                window.location.href = "aulas.html";
            } catch (error) {
                alert("Error de acceso: " + error.message);
                loginBtn.innerText = "Entrar";
                loginBtn.disabled = false;
            }
        };

        loginBtn.addEventListener("click", realizarLogin);
        const verificarEnter = (e) => { if (e.key === "Enter") realizarLogin(); };
        emailInput.addEventListener("keypress", verificarEnter);
        passInput.addEventListener("keypress", verificarEnter);
    }

    // --- LÓGICA DE SESIÓN ACTIVA ---
    const token = localStorage.getItem("aulaHub_token");
    const userEmail = localStorage.getItem("aulaHub_user");

    if (token) {
        if (userInfo) userInfo.textContent = userEmail;
        if (configEmail) configEmail.textContent = userEmail;
        
        actualizarMenu(false); 
        activarLogout();
        aplicarRestricciones(true); 
    } else {
        if (userInfo) userInfo.textContent = "Invitado";
        if (configEmail) configEmail.textContent = "No conectado";
        
        actualizarMenu(false);
        activarLogout();
        aplicarRestricciones(false); 
    }

    // Preparamos el motor de la foto una sola vez al cargar la página
    prepararInputFoto();
});

function activarLogout() {
    const btnLogout = document.getElementById("logout");
    if (btnLogout) {
        const newBtn = btnLogout.cloneNode(true);
        if (btnLogout.parentNode) {
            btnLogout.parentNode.replaceChild(newBtn, btnLogout);
        }
        
        newBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("aulaHub_token");
            localStorage.removeItem("aulaHub_user");
            window.location.href = "index.html";
        });
    }
}

function aplicarRestricciones(isAuthenticated) {
    const cards = document.querySelectorAll(".aula-card-classic");
    cards.forEach(card => {
        card.style.visibility = isAuthenticated ? "visible" : "hidden";
    });
}

// --- LÓGICA ROBUSTA PARA EL MENÚ DE FOTO ---
let inputFotoGlobal;
let targetActualMenu;

function prepararInputFoto() {
    // Creamos el input invisible y lo dejamos listo en el código
    inputFotoGlobal = document.createElement("input");
    inputFotoGlobal.type = "file";
    inputFotoGlobal.accept = "image/png, image/jpeg";
    inputFotoGlobal.style.display = "none";
    document.body.appendChild(inputFotoGlobal);

    // Le enseñamos qué hacer cuando elijas una foto
    inputFotoGlobal.addEventListener("change", async (evento) => {
        const file = evento.target.files[0];
        if (!file || !targetActualMenu) return;

        const contenidoOriginal = targetActualMenu.innerHTML;
        targetActualMenu.innerHTML = "Subiendo...";

        try {
            await fetchAPI('/usuarios/foto', {
                method: 'POST',
                body: JSON.stringify({ fileName: file.name })
            });
            alert("¡Foto actualizada con éxito!");
        } catch (error) {
            alert("Error al subir la imagen.");
        } finally {
            targetActualMenu.innerHTML = contenidoOriginal;
            inputFotoGlobal.value = ""; // Lo vaciamos para la próxima vez
        }
    });
}

// Fase de captura (true) intercepta el clic en seco
document.addEventListener("click", async (e) => {
    const targetElement = e.target.closest("a, li, button, div.dropdown-item") || e.target;
    if (!targetElement || !targetElement.textContent) return;

    const textoClickeado = targetElement.textContent.trim();
    
    if (textoClickeado.includes("Subir Foto")) {
        e.preventDefault();
        e.stopPropagation();
        
        targetActualMenu = targetElement;
        
        // Disparo sincrónico: cero pausas, el navegador lo autoriza de inmediato
        inputFotoGlobal.click(); 
    }
    else if (textoClickeado.includes("Borrar Foto")) {
        e.preventDefault();
        e.stopPropagation(); 
        
        if(confirm("¿Estás seguro de que quieres eliminar tu foto de perfil?")) {
            const contenidoOriginal = targetElement.innerHTML;
            targetElement.innerHTML = "Borrando...";

            try {
                await fetchAPI('/usuarios/foto', { method: 'DELETE' });
                alert("Foto eliminada. Se restaurará el avatar por defecto.");
            } catch (error) {
                alert("Error al intentar borrar la foto.");
            } finally {
                targetElement.innerHTML = contenidoOriginal;
            }
        }
    }
}, true);