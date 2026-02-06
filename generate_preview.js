
// Standalone Simulation Script for 2026 Schedule - VFinal
// - Uses ES Modules
// - Generates JSON for useStore injection
// - Extends to 31/12/2026

import fs from 'fs';
import path from 'path';

const START_DATE = new Date(2026, 0, 1); // Jan 1 2026
const END_DATE = new Date(2026, 11, 31); // Dec 31 2026
const START_ROTATION = new Date(2026, 1, 9); // Feb 9 2026
const EXCEPTION_ALL_PRESENTIAL = new Date(2026, 1, 18); // Feb 18 2026

const TARGET_FILE = 'data_2026.json';

const FERIADOS = [
    '2026-01-01', // Confraternização
    '2026-02-16', // Carnaval
    '2026-02-17', // Carnaval
    '2026-03-30', // ?
    '2026-04-03', // Paixão de Cristo
    '2026-04-21', // Tiradentes
    '2026-05-01', // Trabalho
    '2026-06-04', // Corpus Christi
    '2026-07-09', // Rev. Const. (SP) - assumindo SP/generic
    '2026-09-07', // Independência
    '2026-10-12', // N. Sra. Aparecida
    '2026-11-02', // Finados
    '2026-11-15', // Proclamação (Domingo)
    '2026-11-20', // Consciência Negra
    '2026-12-25', // Natal
];

const COLABORADORES = [
    { id: 'andre', nome: 'André', role: 'colaborador' }, // 0
    { id: 'virginia', nome: 'Virgínia', role: 'colaborador' }, // 1
    { id: 'carol', nome: 'Ana Carolina', role: 'colaborador' }, // 2
    { id: 'william', nome: 'William', role: 'colaborador' }, // 3
    { id: 'iuri', nome: 'Iuri', role: 'chefe' },
];

const VACATIONS = [
    { colId: 'andre', start: '2026-07-13', days: 12 },
    { colId: 'andre', start: '2026-12-14', days: 18 },
    { colId: 'william', start: '2026-06-08', days: 30 },
    { colId: 'carol', start: '2026-03-02', days: 12 },
    { colId: 'carol', start: '2026-11-03', days: 18 },
    { colId: 'iuri', start: '2026-08-06', days: 30 },
    { colId: 'virginia', start: '2026-03-16', days: 15 },
    { colId: 'virginia', start: '2026-11-23', days: 15 },
];

// --- Helpers ---

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function parseISOArg(str) {
    const parts = str.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// --- Logic ---

const vacationsWithEnds = VACATIONS.map(v => {
    const start = parseISOArg(v.start);
    const end = addDays(start, v.days - 1);
    return { ...v, startDate: start, endDate: end };
});

function isVacation(colId, date) {
    return vacationsWithEnds.some(v => v.colId === colId && date >= v.startDate && date <= v.endDate);
}

const ROTATION_ORDER = ['andre', 'virginia', 'carol', 'william'];
let rotationIndex = 0;
let returnQueue = [];

let currentDate = START_DATE;
let results = [];

function checkReturningVacations(date) {
    const yesterday = addDays(date, -1);
    ROTATION_ORDER.forEach(id => {
        if (isVacation(id, yesterday) && !isVacation(id, date)) {
            if (!returnQueue.includes(id)) {
                returnQueue.push(id);
            }
        }
    });
}

while (currentDate <= END_DATE) {
    const dateStr = formatDateISO(currentDate);
    const isWknd = isWeekend(currentDate);
    const isHol = FERIADOS.includes(dateStr);
    const isException = isSameDay(currentDate, EXCEPTION_ALL_PRESENTIAL);

    let statuses = {};

    COLABORADORES.forEach(c => statuses[c.id] = 'Teletrabalho');

    COLABORADORES.forEach(c => {
        if (isVacation(c.id, currentDate)) {
            statuses[c.id] = 'Férias';
        }
    });

    checkReturningVacations(currentDate);

    if (isWknd) {
        COLABORADORES.forEach(c => {
            if (statuses[c.id] !== 'Férias') statuses[c.id] = 'Fim de Semana';
        });
    } else if (isHol) {
        COLABORADORES.forEach(c => {
            if (statuses[c.id] !== 'Férias') statuses[c.id] = 'Feriado';
        });
    } else {
        if (statuses['iuri'] !== 'Férias') {
            statuses['iuri'] = 'Presencial';
        }

        if (currentDate < START_ROTATION || isException) {
            ROTATION_ORDER.forEach(id => {
                if (statuses[id] !== 'Férias') statuses[id] = 'Presencial';
            });
            ROTATION_ORDER.forEach(id => {
                if (statuses[id] === 'Presencial') {
                    const idx = returnQueue.indexOf(id);
                    if (idx > -1) returnQueue.splice(idx, 1);
                }
            });

        } else {
            let presencialId = null;
            let candidateFromQueue = null;

            while (returnQueue.length > 0) {
                const c = returnQueue[0];
                if (statuses[c] === 'Férias') {
                    returnQueue.shift();
                } else {
                    candidateFromQueue = c;
                    returnQueue.shift();
                    break;
                }
            }

            if (candidateFromQueue) {
                presencialId = candidateFromQueue;
                const returnIdx = ROTATION_ORDER.indexOf(presencialId);
                rotationIndex = (returnIdx + 1) % ROTATION_ORDER.length;
            } else {
                let attempts = 0;
                while (attempts < ROTATION_ORDER.length) {
                    const candidateId = ROTATION_ORDER[rotationIndex];
                    if (statuses[candidateId] === 'Férias') {
                        rotationIndex = (rotationIndex + 1) % ROTATION_ORDER.length;
                        attempts++;
                        continue;
                    }
                    presencialId = candidateId;
                    rotationIndex = (rotationIndex + 1) % ROTATION_ORDER.length;
                    break;
                }
            }

            if (presencialId) {
                statuses[presencialId] = 'Presencial';
            }
        }
    }

    results.push({ date: dateStr, ...statuses });
    currentDate = addDays(currentDate, 1);
}

// Generate JSON
const statusMap = {
    'Presencial': 'presencial',
    'Teletrabalho': 'teletrabalho',
    'Férias': 'ferias',
    'Fim de Semana': 'folga',
    'Feriado': 'folga'
};

const finalOutput = [];
results.forEach(r => {
    ['andre', 'virginia', 'carol', 'william', 'iuri'].forEach(colId => {
        finalOutput.push({
            id: `${r.date}-${colId}`,
            colaboradorId: colId,
            data: r.date,
            status: statusMap[r[colId]] || 'outro'
        });
    });
});

fs.writeFileSync(TARGET_FILE, JSON.stringify(finalOutput, null, 2), 'utf8');
console.log('JSON File written: ' + TARGET_FILE);
