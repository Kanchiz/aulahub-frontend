// funcionDates.js - Conectado a Spring Boot y Modal (Selector Corregido)
import { fetchAPI } from "./api.js";

const HORAS_MATUTINO = ["07:00 - 08:00", "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00"];
const HORAS_VESPERTINO = ["14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00"];
let aulaNombreReal = "";
let aulaCodigo = "";
let isUserAdmin = false; 

const calendarBody = document.getElementById('calendarBody');
const currentMonthElement = document.getElementById('currentMonth');
const selectedDatesElement = document.getElementById('selectedDates');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const selectTurno = document.getElementById('turno');
const aulaDisplay = document.getElementById('aulaDisplay');
const selectMateria = document.getElementById('materia');
const selectGrupo = document.getElementById('grupo');
const weekContainer = document.getElementById('weekContainer');
const weekRangeText = document.getElementById('weekRangeText');
const weekTable = document.getElementById('weekTable');
const prevWeekButton = document.getElementById('prevWeekButton');
const nextWeekButton = document.getElementById('nextWeekButton');

const currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let startDate = null;
let endDate = null;
let currentWeekStart = getStartOfWeek(new Date());
const selectedSlots = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    aulaCodigo = urlParams.get('aula') || 'labA';
    aulaNombreReal = getNombreAula(aulaCodigo);
    if (aulaDisplay) aulaDisplay.value = aulaNombreReal;

    const aulaImg = document.getElementById('aulaImg');
    if (aulaImg) {
        aulaImg.src = getImagenAula(aulaCodigo);
        aulaImg.alt = aulaNombreReal;
        aulaImg.onerror = () => { aulaImg.src = "img/aulas/default.jpg"; };
    }

    crearModalAdmin(); 
    
    await verificarRol(); 
    await cargarMaterias();
    
    renderCalendar();
    if (weekContainer) weekContainer.style.display = 'block';
    renderSemana();
});

// --- LÓGICA DE ROLES Y MODAL ADMIN ---

async function verificarRol() {
    const emailLocal = localStorage.getItem("aulaHub_user");
    if (!emailLocal) return;

    try {
        const usuarios = await fetchAPI("/usuarios");
        const userObj = usuarios.find(u => u.email === emailLocal);
        
        if (userObj) {
            const roles = await fetchAPI('/roles');
            const misRoles = roles.filter(r => r.usuarioId === userObj.id);
            isUserAdmin = misRoles.some(r => r.tipo === 'ADMIN' || r.tipo === 'SUPER_ADMIN');

            if (isUserAdmin) {
                const btnReservarContainer = document.querySelector('.aceptar');
                if(btnReservarContainer) btnReservarContainer.style.display = 'none';

                if(aulaDisplay) aulaDisplay.closest('.input-group').style.display = 'none';
                if(selectMateria) selectMateria.closest('.input-group').style.display = 'none';
                if(selectGrupo) selectGrupo.closest('.input-group').style.display = 'none';

                const formContainer = document.querySelector('.form-container');
                if(formContainer) {
                    formContainer.style.boxShadow = "none";
                    formContainer.style.padding = "10px";
                    formContainer.style.minHeight = "auto";
                    formContainer.style.background = "transparent";
                }
            }
        }
    } catch (e) { console.error("Error verificando rol:", e); }
}

function crearModalAdmin() {
    const div = document.createElement('div');
    div.id = 'adminActionModal';
    div.className = 'admin-modal-overlay';
    div.innerHTML = `
        <div class="admin-card">
            <span class="material-symbols-outlined" style="font-size: 40px; color: #f97316; margin-bottom: 10px;">verified_user</span>
            <h3>Gestionar Solicitud</h3>
            <div class="admin-info">
                <p><strong>Profesor:</strong> <span id="admProf"></span></p>
                <p><strong>Materia:</strong> <span id="admMateria"></span></p>
                <p><strong>Grupo:</strong> <span id="admGrupo"></span></p>
            </div>
            <div class="admin-actions">
                <button class="btn-admin btn-reject" id="btnAdminReject">Rechazar</button>
                <button class="btn-admin btn-close" id="btnAdminClose">Cerrar</button>
                <button class="btn-admin btn-approve" id="btnAdminApprove">Aceptar</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);

    document.getElementById('btnAdminClose').onclick = cerrarModalAdmin;
    
    document.getElementById('btnAdminApprove').onclick = () => {
        const modal = document.getElementById('adminActionModal');
        resolverSolicitud(modal.dataset.currentId, "ACEPTADA");
    };

    document.getElementById('btnAdminReject').onclick = () => {
        const modal = document.getElementById('adminActionModal');
        resolverSolicitud(modal.dataset.currentId, "RECHAZADA");
    };
}

function abrirModalAdmin(id, prof, mat, grupo) {
    const modal = document.getElementById('adminActionModal');
    document.getElementById('admProf').textContent = prof || 'N/A';
    document.getElementById('admMateria').textContent = mat || 'N/A';
    document.getElementById('admGrupo').textContent = grupo || 'N/A';
    
    modal.dataset.currentId = id; 
    modal.classList.add('active');
}

function cerrarModalAdmin() {
    document.getElementById('adminActionModal').classList.remove('active');
}

async function resolverSolicitud(id, status) {
    const btn = status === "ACEPTADA" ? document.getElementById('btnAdminApprove') : document.getElementById('btnAdminReject');
    const originalText = btn.innerText;
    btn.innerText = "...";
    btn.disabled = true;

    try {
        await fetchAPI(`/reservas/${id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: status })
        });

        alert(`Solicitud ${status.toLowerCase()}.`);
        cerrarModalAdmin();
        renderSemana(); 
    } catch (e) {
        console.error(e);
        alert("Error al actualizar en el servidor.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}


// --- CONEXIÓN DE DATOS ---

async function cargarMaterias() {
    if(!selectMateria) return;
    try {
        const materias = await fetchAPI('/materias');
        selectMateria.innerHTML = '<option value="">Selecciona una materia...</option>';
        materias.forEach(m => {
            const option = document.createElement('option');
            option.value = m.nombre; 
            option.textContent = m.nombre; 
            selectMateria.appendChild(option);
        });
        selectMateria.addEventListener('change', (e) => cargarGrupos(e.target.value));
    } catch (error) {
        console.error(error);
        selectMateria.innerHTML = '<option>Error al cargar</option>';
    }
}

function cargarGrupos(materia) {
    if(!selectGrupo) return;
    selectGrupo.innerHTML = '<option value="">Selecciona un grupo</option>';
    if (!materia) return;
    const gruposDemo = ["Grupo 101", "Grupo 102", "Grupo 201"];
    gruposDemo.forEach(grupo => {
        const option = document.createElement('option'); 
        option.value = grupo; 
        option.textContent = grupo; 
        selectGrupo.appendChild(option);
    });
}

function getAulaIdFromCodigo(codigo) {
    const map = { "laba": 1, "labb": 2, "centro": 3, "auditorio": 4, "labcd": 5, "labp": 6 };
    return map[String(codigo).toLowerCase()] || 1;
}

async function cargarHorariosOcupados(fechaInicio, fechaFin) {
    if (!aulaNombreReal) return;
    
    try {
        const reservas = await fetchAPI('/reservas');
        const currentAulaId = getAulaIdFromCodigo(aulaCodigo);
        
        document.querySelectorAll('.time-slot-cell').forEach(cell => {
            cell.classList.remove('busy', 'pending-slot');
            cell.dataset.reservaId = "";
            cell.title = "";
        });

        reservas.forEach(data => {
            // Filtro para que no se mezclen las reservas de distintas aulas
            if(data.aulaId !== currentAulaId) return;

            const fecha = data.fecha;
            let horaSolo = data.horaInicio + " - " + data.horaFin; 

            // LA SOLUCIÓN: Buscamos por fecha Y HORA exacta al mismo tiempo
            const cell = document.querySelector(`.time-slot-cell[data-fecha="${fecha}"][data-hora="${horaSolo}"]`);
            
            if (cell) {
                cell.dataset.reservaId = data.id;
                cell.dataset.profesor = data.profesorName || "Profesor";
                cell.dataset.materia = data.materia || "Sin materia";
                cell.dataset.grupo = data.grupo || "";

                if (data.estado === "ACEPTADA") {
                    cell.classList.add('busy');
                    cell.title = `Ocupado por: ${data.profesorName}`;
                } else if (data.estado === "PENDIENTE") {
                    cell.classList.add('pending-slot'); 
                    cell.title = `Solicitud Pendiente`;
                }
                const key = `${fecha}|${horaSolo}`;
                selectedSlots.delete(key);
                cell.classList.remove('selected');
            }
        });
    } catch (error) { console.error("Error cargando horarios:", error); }
}

// --- LÓGICA VISUAL Y CLICS ---

function handleCellClick(td, key) {
    if (td.classList.contains('past')) { alert("Esta fecha ya pasó."); return; }
    if (td.classList.contains('busy')) { alert(`Horario ocupado por: ${td.dataset.profesor}`); return; }
    
    if (td.classList.contains('pending-slot')) { 
        if (isUserAdmin) {
            abrirModalAdmin(td.dataset.reservaId, td.dataset.profesor, td.dataset.materia, td.dataset.grupo);
        } else {
            alert("Este horario tiene una solicitud pendiente."); 
        }
        return; 
    }

    if (isUserAdmin) return; 

    if (selectedSlots.has(key)) { 
        selectedSlots.delete(key); td.classList.remove('selected'); 
    } else { 
        selectedSlots.add(key); td.classList.add('selected'); 
    }
    updateSelectedDatesFromSlots();
}

function renderCalendar() {
    if (!calendarBody || !currentMonthElement) return;
    const jsFirstDay = new Date(currentYear, currentMonth, 1).getDay();
    const firstDayIndex = (jsFirstDay - 1 + 7) % 7;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    currentMonthElement.textContent = new Date(currentYear, currentMonth, 1).toLocaleDateString('es-MX', {month: 'long', year: 'numeric'});
    let days = '';
    for (let i = 0; i < firstDayIndex; i++) days += `<div class="calendar-day empty"></div>`;
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        days += `<div class="calendar-day ${getDayClassName(date)}" onclick="selectDate(${i})">${i}</div>`;
    }
    calendarBody.innerHTML = days;
}

function getDayClassName(date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return 'past';
    if (startDate && date.toDateString() === startDate.toDateString()) return 'selected';
    if (endDate && date.toDateString() === endDate.toDateString()) return 'selected';
    if (startDate && endDate && date > startDate && date < endDate) return 'range';
    return '';
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0); return d;
}

function fechaToISO(date) {
    const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2,'0'); const d = String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`;
}

function getHorasTurnoActual() {
    const turno = selectTurno ? selectTurno.value : "Matutino";
    return (turno === "Matutino") ? HORAS_MATUTINO : HORAS_VESPERTINO;
}

function renderSemana() {
    if (!weekTable || !weekRangeText) return;
    const horas = getHorasTurnoActual();
    const start = new Date(currentWeekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    weekRangeText.textContent = `${start.toLocaleDateString('es-ES', {day:'2-digit', month:'short'})} - ${end.toLocaleDateString('es-ES', {day:'2-digit', month:'short'})}`;
    
    cargarHorariosOcupados(start, end);

    weekTable.innerHTML = '';
    const diasLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th'));
    diasLabels.forEach((label, idx) => {
        const th = document.createElement('th');
        const fechaCol = new Date(start); fechaCol.setDate(start.getDate() + idx);
        th.textContent = `${label} ${fechaCol.getDate()}`; headerRow.appendChild(th);
    });
    thead.appendChild(headerRow); weekTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    horas.forEach(hora => {
        const tr = document.createElement('tr');
        const thHora = document.createElement('th'); thHora.textContent = hora; tr.appendChild(thHora);
        diasLabels.forEach((_, idx) => {
            const td = document.createElement('td');
            td.classList.add('time-slot-cell'); 
            const fechaCelda = new Date(start); fechaCelda.setDate(start.getDate() + idx);
            const fechaStr = fechaToISO(fechaCelda);
            
            td.dataset.fecha = fechaStr;
            td.dataset.hora  = hora;
            const key = `${fechaStr}|${hora}`;

            const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
            const isDatePast = fechaCelda < todayMidnight;
            const isTodayDate = fechaToISO(fechaCelda) === fechaToISO(new Date());
            const slotStartHour = parseInt(hora.split(' - ')[0].split(':')[0], 10);
            const isHourPast = isTodayDate && new Date().getHours() >= slotStartHour;

            if (isDatePast || isHourPast) {
                td.classList.add('past');
            } else if (selectedSlots.has(key)) {
                td.classList.add('selected');
            }

            td.addEventListener('click', () => handleCellClick(td, key));
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    weekTable.appendChild(tbody);
}

function updateSelectedDatesFromSlots() {
    if (!selectedDatesElement) return;
    const slots = Array.from(selectedSlots).map(k => { const [f, h] = k.split('|'); return {fecha: f, hora: h}; });
    if (slots.length === 0) {
        selectedDatesElement.textContent = `Selecciona una fecha`; startDate = null; endDate = null; renderCalendar(); return;
    }
    const fechasUnicas = [...new Set(slots.map(s => s.fecha))].sort();
    const parse = (s) => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
    startDate = parse(fechasUnicas[0]);
    endDate = (fechasUnicas.length > 1) ? parse(fechasUnicas[fechasUnicas.length - 1]) : null;
    const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    if (!endDate) selectedDatesElement.textContent = `Fecha: ${fmt(startDate)}`;
    else selectedDatesElement.textContent = `Fechas: ${fmt(startDate)} al ${fmt(endDate)}`;
    renderCalendar();
}

window.selectDate = function(day) {
    const clickedDate = new Date(currentYear, currentMonth, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (clickedDate < today) {
        alert("Esta fecha ya pasó."); return;
    }
    currentWeekStart = getStartOfWeek(clickedDate);
    renderCalendar(); renderSemana();
};

if (prevBtn) prevBtn.addEventListener('click', () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(); });
if (nextBtn) nextBtn.addEventListener('click', () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); });
if (prevWeekButton) prevWeekButton.addEventListener('click', () => { currentWeekStart.setDate(currentWeekStart.getDate() - 7); renderSemana(); });
if (nextWeekButton) nextWeekButton.addEventListener('click', () => { currentWeekStart.setDate(currentWeekStart.getDate() + 7); renderSemana(); });
if (selectTurno) selectTurno.addEventListener('change', () => { selectedSlots.clear(); updateSelectedDatesFromSlots(); renderSemana(); });

const btnPreReservar = document.getElementById('btnPreReservar');
const modal = document.getElementById('modalConfirmacion');
const btnCancelar = document.getElementById('btnCancelar');
const btnEnviar = document.getElementById('btnEnviarReserva');

if (btnPreReservar) {
    btnPreReservar.addEventListener('click', () => {
        const turno = selectTurno.value;
        const materia = selectMateria.value;
        const grupo = selectGrupo.value;
        const slots = Array.from(selectedSlots).map(k => { const [f, h] = k.split('|'); return {fecha: f, hora: h}; }).sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
        
        if (!materia || !grupo) { alert("Selecciona Materia y Grupo."); return; }
        if (slots.length === 0) { alert("Selecciona horarios en la tabla."); return; }
        
        document.getElementById('confAula').innerText = aulaNombreReal;
        document.getElementById('confMateria').innerText = materia;
        document.getElementById('confGrupo').innerText = grupo;
        document.getElementById('confTurno').innerText = turno;
        const horasUnicas = [...new Set(slots.map(s => s.hora))];
        document.getElementById('confHoras').innerText = horasUnicas.join(", ");
        const fechasUnicas = [...new Set(slots.map(s => s.fecha))].sort();
        document.getElementById('confFechas').innerText = fechasUnicas.join(", ");
        
        if (modal) modal.classList.add('active');
    });
}

if (btnCancelar && modal) btnCancelar.addEventListener('click', () => modal.classList.remove('active'));

if (btnEnviar) {
    btnEnviar.addEventListener('click', async () => {
        btnEnviar.innerText = "Enviando..."; 
        btnEnviar.disabled = true;

        try {
            const turno = selectTurno.value;
            const materia = selectMateria.value;
            const grupo = selectGrupo.value;
            const slots = Array.from(selectedSlots).map(k => { const [f, h] = k.split('|'); return {fecha: f, hora: h}; });
            
            const promesas = slots.map(({fecha, hora}) => {
                const [horaInicio, horaFin] = hora.split(" - ");
                return fetchAPI('/reservas', {
                    method: 'POST',
                    body: JSON.stringify({
                        aulaId: getAulaIdFromCodigo(aulaCodigo),
                        materia: materia,
                        grupo: grupo,
                        turno: turno,
                        fecha: fecha,
                        horaInicio: horaInicio,
                        horaFin: horaFin,
                        estado: "PENDIENTE"
                    })
                });
            });

            await Promise.all(promesas);
            alert("¡Solicitudes enviadas con éxito!");
            window.location.href = "misReservas.html";
        } catch (error) { 
            console.error(error); 
            alert("Error al guardar: " + error.message); 
            btnEnviar.innerText = "Confirmar"; 
            btnEnviar.disabled = false; 
        }
    });
}

function getNombreAula(codigo) {
    switch (codigo) {
        case "labA": return "Laboratorio de Cómputo A";
        case "labB": return "Laboratorio de Cómputo B";
        case "centro": return "Centro de Cómputo";
        case "auditorio": return "Auditorio FIC";
        case "labCD": return "Laboratorio de Ciencia de Datos";
        case "labP": return "Laboratorio de Posgrado";
        default: return "Aula desconocida";
    }
}

function getImagenAula(codigo) {
    switch (codigo) {
        case "labA": return "img/aulas/labA.jpeg";
        case "labB": return "img/aulas/labB.jpeg";
        case "centro": return "img/aulas/centro.jpeg";
        case "auditorio": return "img/aulas/auditorio.jpeg";
        case "labCD": return "img/aulas/labCD.jpg";
        case "labP": return "img/aulas/labP.jpeg";
        default: return "img/aulas/default.jpg";
    }
}