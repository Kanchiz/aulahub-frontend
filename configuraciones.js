// configuraciones.js - Conectado a Spring Boot (Mock)
import { confirmarAccion, fetchAPI } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Mostrar email del usuario actual leyendo el LocalStorage
    const emailLocal = localStorage.getItem("aulaHub_user");
    
    if (emailLocal) {
        const emailText = document.getElementById("user-email");
        if(emailText) emailText.innerText = emailLocal;
    } else {
        // Si no hay sesión iniciada, lo regresamos al login
        window.location.href = "index.html";
    }

    // 2. Lógica del botón Cambiar Contraseña
    const btnReset = document.getElementById("btnResetPassword");
    
    if(btnReset) {
        btnReset.addEventListener("click", async () => {
            if(!emailLocal) return;

            if(await confirmarAccion(`¿Enviar petición de restablecimiento a ${emailLocal}?`)) {
                try {
                    const textoOriginal = btnReset.innerText;
                    btnReset.innerText = "Enviando...";
                    btnReset.disabled = true;

                    // Le pedimos al backend de Spring Boot que envíe el correo
                    await fetchAPI('/reset-password', {
                        method: 'POST',
                        body: JSON.stringify({ email: emailLocal })
                    });

                    mostrarNotificacion("Petición enviada. Si el correo existe en el sistema, recibirás instrucciones pronto.", "success");
                    btnReset.innerText = "Correo Enviado";
                    
                } catch (error) {
                    console.error("Error al restablecer:", error);
                    mostrarNotificacion("Error de conexión con el servidor: " + error.message, "error");
                    btnReset.innerText = "Reintentar";
                    btnReset.disabled = false;
                }
            }
        });
    }

    // 3. Lógica para subir foto de perfil
    const inputFoto = document.getElementById("inputFotoPerfil");
    const btnFoto = document.getElementById("btnCambiarFoto");

    if(inputFoto && btnFoto) {
        inputFoto.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if(!file) return;

            // Validamos que sea una imagen (por si acaso)
            if(!file.type.startsWith("image/")) {
                return alert("Por favor selecciona un archivo de imagen válido (JPG o PNG).");
            }

            const textoOriginal = btnFoto.innerText;
            btnFoto.innerText = "Subiendo...";
            btnFoto.disabled = true;

            try {
                // Le avisamos al simulador (y luego al backend) que hay una foto nueva
                await fetchAPI('/usuarios/foto', {
                    method: 'POST',
                    // Nota: En producción, David te pedirá que uses un FormData en lugar de JSON
                    // para poder procesar el archivo físico en Spring Boot. 
                    body: JSON.stringify({ fileName: file.name, size: file.size })
                });

                alert(`¡La foto "${file.name}" se subió con éxito!`);
                btnFoto.innerText = "Foto Actualizada";
                btnFoto.style.background = "#dcfce7"; // Lo pintamos de verde éxito
                btnFoto.style.color = "#166534";
                
                // Si la imagen de tu navbar tiene un ID (ej: id="avatar-img"), 
                // aquí podrías actualizarla usando URL.createObjectURL(file) para que se vea el cambio en tiempo real.

            } catch (error) {
                console.error("Error subiendo foto:", error);
                mostrarNotificacion("Error al intentar guardar la imagen.", "error");
                btnFoto.innerText = textoOriginal;
            } finally {
                btnFoto.disabled = false;
            }
        });
    }
});