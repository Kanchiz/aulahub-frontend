// misReservas.js - Original restaurado y conectado a Spring Boot (Nombres Corregidos)
import { fetchAPI } from "./api.js";

let allReservas = [];
let filteredReservas = [];
let isAdmin = false;
let adminAulas = [];
let usuarioNombre = "";

document.addEventListener("DOMContentLoaded", async () => {
    inicializarSemestres();
    configurarEventos();
    await detectarRolYCargar();
    aplicarFiltros();
});

// ─── Inicialización ──────────────────────────────────────────────────────────

function inicializarSemestres() {
    const sel = document.getElementById('semestre-val');
    const year = new Date().getFullYear();
    for (let y = year - 1; y <= year + 1; y++) {
        const optA = document.createElement('option');
        optA.value = `${y}-A`;
        optA.textContent = `Ene – Jun ${y}`;
        sel.appendChild(optA);

        const optB = document.createElement('option');
        optB.value = `${y}-B`;
        optB.textContent = `Jul – Dic ${y}`;
        sel.appendChild(optB);
    }
    const semActual = new Date().getMonth() < 6 ? 'A' : 'B';
    sel.value = `${year}-${semActual}`;
}

function configurarEventos() {
    const periodo = document.getElementById('filtro-periodo');
    const inputsCondicionales = ['input-dia', 'input-semana', 'input-mes', 'input-semestre', 'input-rango'];
    const mapaInputs = {
        dia: 'input-dia',
        semana: 'input-semana',
        mes: 'input-mes',
        semestre: 'input-semestre',
        rango: 'input-rango'
    };

    if(periodo) {
        periodo.addEventListener('change', () => {
            inputsCondicionales.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.style.display = 'none';
            });
            if (mapaInputs[periodo.value]) {
                const target = document.getElementById(mapaInputs[periodo.value]);
                if(target) target.style.display = 'flex';
            }
        });
    }

    const btnAplicar = document.getElementById('btn-aplicar');
    if(btnAplicar) btnAplicar.addEventListener('click', aplicarFiltros);
    
    const btnPdf = document.getElementById('btn-pdf');
    if(btnPdf) btnPdf.addEventListener('click', exportarPDF);

    document.getElementById('btn-todos-maestros')?.addEventListener('click', () => {
        Array.from(document.getElementById('filtro-maestro').options).forEach(o => o.selected = true);
    });
    document.getElementById('btn-ninguno-maestros')?.addEventListener('click', () => {
        Array.from(document.getElementById('filtro-maestro').options).forEach(o => o.selected = false);
    });
}

// ─── Carga de datos con Spring Boot (Mock) ──────────────────────────────────────────────────────────

async function detectarRolYCargar() {
    const emailLocal = localStorage.getItem("aulaHub_user");
    if(!emailLocal) {
        window.location.href = "index.html";
        return;
    }

    try {
        const usuarios = await fetchAPI("/usuarios");
        const userObj = usuarios.find(u => u.email === emailLocal);
        
        if (userObj) {
            usuarioNombre = userObj.nombre;
            const roles = await fetchAPI('/roles');
            const misRoles = roles.filter(r => r.usuarioId === userObj.id);
            isAdmin = misRoles.some(r => r.tipo === 'ADMIN' || r.tipo === 'SUPER_ADMIN');

            if(isAdmin) {
                const grupoMaestro = document.getElementById('grupo-maestro');
                if(grupoMaestro) grupoMaestro.style.display = 'flex';
                adminAulas = []; 
                await cargarTodasLasReservas();
            } else {
                await cargarReservasProfesor(userObj.id);
            }
        }
    } catch(e) {
        console.error("Error al detectar el rol:", e);
    }
}

async function cargarTodasLasReservas() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';

    try {
        allReservas = await fetchAPI('/reservas');
        
        const maestros = [...new Set(allReservas.map(r => r.profesorName).filter(Boolean))].sort();
        const sel = document.getElementById('filtro-maestro');
        if(sel) {
            sel.innerHTML = '';
            maestros.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                opt.selected = true;
                sel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error cargando reservas:", e);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

async function cargarReservasProfesor(uid) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';

    try {
        const reservas = await fetchAPI('/reservas');
        allReservas = reservas.filter(r => r.usuarioId === uid);
    } catch (e) {
        console.error("Error cargando reservas:", e);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// ─── Filtrado ────────────────────────────────────────────────────────────────

function parseFecha(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function getRangoDelPeriodo() {
    const periodo = document.getElementById('filtro-periodo').value;
    let inicio = null, fin = null;

    if (periodo === 'dia') {
        const val = document.getElementById('fecha-dia').value;
        if (val) {
            inicio = new Date(val + 'T00:00:00');
            fin   = new Date(val + 'T23:59:59');
        }
    } else if (periodo === 'semana') {
        const val = document.getElementById('fecha-semana').value;
        if (val) {
            const [yearStr, weekStr] = val.split('-W');
            const year = parseInt(yearStr);
            const week = parseInt(weekStr);
            const jan4 = new Date(year, 0, 4);
            const monday = new Date(jan4);
            monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
            inicio = monday;
            fin = new Date(monday);
            fin.setDate(fin.getDate() + 6);
            fin.setHours(23, 59, 59);
        }
    } else if (periodo === 'mes') {
        const val = document.getElementById('fecha-mes').value;
        if (val) {
            const [y, m] = val.split('-').map(Number);
            inicio = new Date(y, m - 1, 1);
            fin    = new Date(y, m, 0, 23, 59, 59);
        }
    } else if (periodo === 'semestre') {
        const val = document.getElementById('semestre-val').value;
        if (val) {
            const [yearStr, sem] = val.split('-');
            const y = parseInt(yearStr);
            if (sem === 'A') {
                inicio = new Date(y, 0, 1);
                fin    = new Date(y, 5, 30, 23, 59, 59);
            } else {
                inicio = new Date(y, 6, 1);
                fin    = new Date(y, 11, 31, 23, 59, 59);
            }
        }
    } else if (periodo === 'rango') {
        const start = document.getElementById('rango-inicio').value;
        const end   = document.getElementById('rango-fin').value;
        if (start) inicio = new Date(start + 'T00:00:00');
        if (end)   fin    = new Date(end + 'T23:59:59');
    }

    return { inicio, fin };
}

function getMaestrosSeleccionados() {
    if (!isAdmin) return null;
    const sel = document.getElementById('filtro-maestro');
    if(!sel) return null;
    const seleccionados = Array.from(sel.selectedOptions).map(o => o.value);
    if (seleccionados.length === 0 || seleccionados.length === sel.options.length) return null;
    return new Set(seleccionados);
}

function aplicarFiltros() {
    const { inicio, fin } = getRangoDelPeriodo();
    const maestros = getMaestrosSeleccionados();

    filteredReservas = allReservas.filter(r => {
        if (maestros && !maestros.has(r.profesorName)) return false;

        if (inicio || fin) {
            const fecha = parseFecha(r.fecha);
            if (!fecha) return false;
            if (inicio && fecha < inicio) return false;
            if (fin   && fecha > fin)    return false;
        }

        return true;
    });

    filteredReservas.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    mostrarInfo();
    renderReservas(filteredReservas);
}

function mostrarInfo() {
    const info = document.getElementById('resultados-info');
    if (!info) return;
    if (filteredReservas.length === 0) {
        info.style.display = 'none';
        return;
    }
    info.style.display = 'block';
    info.textContent = `${filteredReservas.length} registro${filteredReservas.length !== 1 ? 's' : ''} encontrado${filteredReservas.length !== 1 ? 's' : ''}`;
}

// ─── Renderizado de cards ────────────────────────────────────────────────────

function formatFecha(str) {
    if (!str) return 'N/A';
    const [y, m, d] = str.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return str;
}

function extraerHora(reserva) {
    if(reserva.horaInicio && reserva.horaFin) {
        return `${reserva.horaInicio} - ${reserva.horaFin}`;
    }
    return reserva.horario || 'N/A';
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

function renderReservas(reservas) {
    const container = document.getElementById('reservas-container');
    const emptyMsg  = document.getElementById('empty-message');

    if (reservas.length === 0) {
        if (container) container.innerHTML = '';
        if (emptyMsg)  emptyMsg.style.display = 'block';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    let html = '';
    reservas.forEach(data => {
        let estadoParaClase = "Pendiente";
        let estadoParaMostrar = "Pendiente";
        
        if (data.estado === "ACEPTADA") {
            estadoParaClase = "Aceptada";
            estadoParaMostrar = "Aceptada";
        } else if (data.estado === "RECHAZADA") {
            estadoParaClase = "Rechazada";
            estadoParaMostrar = "Rechazada";
        }

        const statusClass = getStatusClass(estadoParaClase);
        const nombreAulaCompleto = getNombreAula(data.aulaId || data.aula);
        const icono = nombreAulaCompleto.toLowerCase().includes("auditorio") ? "podium" : "computer";
        const hora  = extraerHora(data);

        html += `
            <div class="card reserva-card">
                <div class="reserva-header">
                    <div class="aula-icon-small">
                        <span class="material-symbols-outlined">${icono}</span>
                    </div>
                    <div class="reserva-title">
                        <h3>${data.materia || "Sin materia"}</h3>
                        <span>${nombreAulaCompleto}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${estadoParaMostrar}</span>
                </div>
                <div class="reserva-details">
                    ${isAdmin ? `<p><strong>Maestro:</strong> ${data.profesorName || 'N/A'}</p>` : ''}
                    <p><strong>Fecha:</strong> ${formatFecha(data.fecha)}</p>
                    <p><strong>Horario:</strong> ${hora}</p>
                    <p><strong>Grupo:</strong> ${data.grupo || 'N/A'}</p>
                    <p><strong>Turno:</strong> ${data.turno || 'N/A'}</p>
                </div>
            </div>
        `;
    });

    if (container) container.innerHTML = html;
}

// ─── Exportación PDF ─────────────────────────────────────────────────────────

function getDescripcionFiltro() {
    const periodo = document.getElementById('filtro-periodo').value;
    const partes = [];

    if (isAdmin) {
        const sel = document.getElementById('filtro-maestro');
        if(sel) {
            const seleccionados = Array.from(sel.selectedOptions).map(o => o.value);
            if (seleccionados.length === 0 || seleccionados.length === sel.options.length) {
                partes.push('Todos los maestros');
            } else if (seleccionados.length === 1) {
                partes.push(`Maestro: ${seleccionados[0]}`);
            } else {
                partes.push(`Maestros: ${seleccionados.join(', ')}`);
            }
        }
    }

    if (periodo === 'todo')      partes.push('Todas las fechas');
    else if (periodo === 'dia')  partes.push(`Día: ${formatFecha(document.getElementById('fecha-dia').value)}`);
    else if (periodo === 'semana') partes.push(`Semana: ${document.getElementById('fecha-semana').value || '—'}`);
    else if (periodo === 'mes')  partes.push(`Mes: ${document.getElementById('fecha-mes').value || '—'}`);
    else if (periodo === 'semestre') {
        const v = document.getElementById('semestre-val');
        partes.push(`Semestre: ${v.options[v.selectedIndex]?.text || v.value}`);
    } else if (periodo === 'rango') {
        partes.push(`Del ${formatFecha(document.getElementById('rango-inicio').value)} al ${formatFecha(document.getElementById('rango-fin').value)}`);
    }

    return partes.join('   |   ');
}

function exportarPDF() {
    if (filteredReservas.length === 0) {
        alert('No hay registros para exportar con el filtro actual.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

    const AZUL    = [22, 75, 138];
    const GRIS    = [245, 247, 250];
    const VERDE   = { texto: [22, 101, 52],  fondo: [220, 252, 231] };
    const ROJO    = { texto: [153, 27, 27],  fondo: [254, 226, 226] };
    const AMARILLO = { texto: [180, 83, 9],  fondo: [254, 243, 199] };

    const pageW = pdf.internal.pageSize.getWidth();

    pdf.setFillColor(...AZUL);
    pdf.rect(0, 0, pageW, 34, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('HISTORIAL DE RESERVAS', pageW / 2, 13, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Facultad de Informática y Computación — AulaHub', pageW / 2, 21, { align: 'center' });
    const ahora = new Date();
    const fechaGen = `${String(ahora.getDate()).padStart(2,'0')}/${String(ahora.getMonth()+1).padStart(2,'0')}/${ahora.getFullYear()}`;
    pdf.text(`Generado el: ${fechaGen}`, pageW / 2, 29, { align: 'center' });

    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(9);
    const filtroDesc = getDescripcionFiltro();
    pdf.text(`Filtro: ${filtroDesc}`, 14, 41);
    pdf.text(`Total de registros: ${filteredReservas.length}`, pageW - 14, 41, { align: 'right' });
    pdf.setDrawColor(200, 200, 200);
    pdf.line(14, 44, pageW - 14, 44);

    const columnas = isAdmin
        ? ['Maestro', 'Fecha', 'Materia', 'Aula', 'Grupo', 'Turno', 'Horario', 'Estado']
        : ['Fecha', 'Materia', 'Aula', 'Grupo', 'Turno', 'Horario', 'Estado'];
    const idxEstado = columnas.length - 1;

    const filas = filteredReservas.map(r => {
        const hora  = extraerHora(r);
        const fecha = formatFecha(r.fecha);
        let estadoStr = r.estado === "ACEPTADA" ? "Aceptada" : (r.estado === "RECHAZADA" ? "Rechazada" : "Pendiente");
        
        const base  = [fecha, r.materia || 'N/A', getNombreAula(r.aulaId || r.aula), r.grupo || 'N/A', r.turno || 'N/A', hora, estadoStr];
        return isAdmin ? [r.profesorName || 'N/A', ...base] : base;
    });

    pdf.autoTable({
        head: [columnas],
        body: filas,
        startY: 47,
        styles: { fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 }, font: 'helvetica', lineColor: [220, 220, 220], lineWidth: 0.25, valign: 'middle' },
        headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
        alternateRowStyles: { fillColor: GRIS },
        columnStyles: { [idxEstado]: { halign: 'center', fontStyle: 'bold' } },
        didParseCell(data) {
            if (data.section === 'body' && data.column.index === idxEstado) {
                const v = data.cell.raw;
                if (v === 'Aceptada') { data.cell.styles.textColor = VERDE.texto; data.cell.styles.fillColor = VERDE.fondo; } 
                else if (v === 'Rechazada') { data.cell.styles.textColor = ROJO.texto; data.cell.styles.fillColor = ROJO.fondo; } 
                else { data.cell.styles.textColor = AMARILLO.texto; data.cell.styles.fillColor = AMARILLO.fondo; }
            }
        },
        didDrawPage(data) {
            const total = pdf.internal.getNumberOfPages();
            pdf.setFontSize(8);
            pdf.setTextColor(160, 160, 160);
            pdf.text(`Página ${data.pageNumber} de ${total}`, pageW / 2, pdf.internal.pageSize.getHeight() - 8, { align: 'center' });
        },
        margin: { left: 14, right: 14 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.25,
    });

    const nombreArchivo = isAdmin
        ? `historial_reservas_${fechaGen.replace(/\//g, '-')}.pdf`
        : `mis_reservas_${fechaGen.replace(/\//g, '-')}.pdf`;

    pdf.save(nombreArchivo);
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function getStatusClass(status) {
    if (status === "Aceptada")  return "status-success";
    if (status === "Rechazada") return "status-error";
    return "status-pending";
}