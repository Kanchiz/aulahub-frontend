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

    // --- LÓGICA DE SESIÓN ACTIVA (Para las demás vistas) ---
    const token = localStorage.getItem("aulaHub_token");
    const userEmail = localStorage.getItem("aulaHub_user");

    if (token) {
        // Usuario logueado
        if (userInfo) userInfo.textContent = userEmail;
        if (configEmail) configEmail.textContent = userEmail;
        
        // Por ahora lo ponemos en 'false'. En la Fase 2 verificaremos el rol con el JWT
        actualizarMenu(false); 
        activarLogout();
        aplicarRestricciones(true); // Desbloquea las aulas
    } else {
        // Usuario no logueado o invitado
        if (userInfo) userInfo.textContent = "Invitado";
        if (configEmail) configEmail.textContent = "No conectado";
        
        actualizarMenu(false);
        activarLogout();
        aplicarRestricciones(false); // Oculta aulas si es necesario
    }
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
            // Limpiamos los tokens y variables de sesión
            localStorage.removeItem("aulaHub_token");
            localStorage.removeItem("aulaHub_user");
            window.location.href = "index.html";
        });
    }
}

function aplicarRestricciones(isAuthenticated) {
    const cards = document.querySelectorAll(".aula-card-classic");
    
    cards.forEach(card => {
        // Si está autenticado, mostramos todo. Si no, lo ocultamos o redirigimos.
        card.style.visibility = isAuthenticated ? "visible" : "hidden";
    });
}