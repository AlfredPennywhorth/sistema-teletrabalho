
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addDays, format, isSaturday, isSunday, isWithinInterval, parseISO, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const holidays2026 = [
    '2026-01-01', // Confraternização Universal
    '2026-02-16', // Carnaval (Ponto Facultativo - assuming regular work day or added explicit?) usually Carnaval is holiday-like. I'll stick to national ones for now or what was in useStore. 
    '2026-02-17', // Carnaval
    '2026-04-21', // Tiradentes
    '2026-05-01', // Dia do Trabalho
    '2026-06-04', // Corpus Christi
    '2026-09-07', // Independência do Brasil
    '2026-10-12', // Nossa Senhora Aparecida
    '2026-11-02', // Finados
    '2026-11-15', // Proclamação da República
    '2026-12-25', // Natal
];

interface Vacation {
    colaboradorId: string;
    start: string;
    days: number;
}

const vacations: Vacation[] = [
    { colaboradorId: 'carol', start: '2026-03-02', days: 12 },
    { colaboradorId: 'carol', start: '2026-11-03', days: 18 }, // Updated from 14/11 to 03/11
    { colaboradorId: 'andre', start: '2026-07-13', days: 12 },
    { colaboradorId: 'andre', start: '2026-12-14', days: 18 },
    { colaboradorId: 'virginia', start: '2026-03-16', days: 15 },
    { colaboradorId: 'virginia', start: '2026-11-23', days: 15 },
    { colaboradorId: 'iuri', start: '2026-08-06', days: 30 }, // Updated from 03/08 to 06/08
    { colaboradorId: 'william', start: '2026-06-08', days: 30 },
];

const colaboradores = [
    { id: 'andre', nome: 'André' },
    { id: 'virginia', nome: 'Virginia' },
    { id: 'carol', nome: 'Ana Carolina' },
    { id: 'william', nome: 'William' },
    { id: 'iuri', nome: 'Iuri' },
];

// Rotation pool for Phase 2 (excluding Iuri who is fixed)
const rotationPool = ['andre', 'virginia', 'carol', 'william'];

function generateData() {
    const startDate = startOfYear(new Date(2026, 0, 1));
    const endDate = endOfYear(new Date(2026, 0, 1));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const statusData: any[] = [];
    let rotationIndex = 0; // Increments on every WORK DAY (Phase 2)

    days.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isWknd = isSaturday(day) || isSunday(day);
        const isHol = holidays2026.includes(dateStr);

        // Determine Phase
        // Phase 1: 01/01/2026 to 22/02/2026
        // Phase 2: 23/02/2026 onwards
        const phase2Start = new Date(2026, 1, 23); // Feb 23 (Month is 0-indexed: 1 = Feb)
        const isPhase2 = day >= phase2Start;

        // Determine who is on vacation TODAY
        // Map of who is available
        const vacationers = new Set<string>();
        colaboradores.forEach(c => {
            const userVacations = vacations.filter(v => v.colaboradorId === c.id);
            const isOnVacation = userVacations.some(v => {
                const start = parseISO(v.start);

                // Calculate end date by counting CALENDAR days (dias corridos)
                let daysCounted = 0;
                let d = start;
                let endDate = d;

                // Max loop to prevent infinite (safety check)
                let safety = 0;
                while (daysCounted < v.days && safety < 100) {
                    safety++;

                    // Count every day as a vacation day used
                    daysCounted++;

                    // If we reached the count, this is the last day
                    if (daysCounted === v.days) {
                        endDate = d;
                        break;
                    }

                    // Move to next day
                    d = addDays(d, 1);
                }

                return isWithinInterval(day, { start, end: endDate });
            });
            if (isOnVacation) vacationers.add(c.id);
        });

        // Determine Presencial Person for Phase 2 Rotation
        let rotationPersonId = '';
        let temporaryFixedPersonId = ''; // Typically empty, but 'carol' if Iuri is away

        // Check if Iuri is on vacation today
        const isIuriVacation = vacationers.has('iuri');

        if (isIuriVacation) {
            temporaryFixedPersonId = 'carol';
        }

        // Effective Rotation Pool
        // If Carol is fixed (substituting Iuri) OR if someone is on vacation, they are removed from availability for the "rotation slot".
        const effectivePool = rotationPool.filter(id => id !== temporaryFixedPersonId);

        if (!isWknd && !isHol && isPhase2) {
            // Find next available person in rotation
            let attempts = 0;
            while (attempts < effectivePool.length) {
                const candidateId = effectivePool[rotationIndex % effectivePool.length];
                if (!vacationers.has(candidateId)) {
                    rotationPersonId = candidateId;
                    rotationIndex++;
                    break;
                } else {
                    rotationIndex++;
                }
                attempts++;
            }
        }

        colaboradores.forEach((col) => {
            let status = '';

            if (vacationers.has(col.id)) {
                status = 'ferias';
            } else {
                if (isWknd || isHol) return;

                if (!isPhase2) {
                    status = 'presencial';
                } else {
                    // Phase 2
                    if (col.id === 'iuri') {
                        status = 'presencial'; // Iuri is fixed presencial (unless vacation, caught above)
                    } else if (col.id === temporaryFixedPersonId) {
                        status = 'presencial'; // Substitution Rule
                    } else if (col.id === rotationPersonId) {
                        status = 'presencial';
                    } else {
                        status = 'teletrabalho';
                    }
                }
            }

            if (status) {
                statusData.push({
                    id: `${dateStr}-${col.id}`,
                    colaboradorId: col.id,
                    data: dateStr,
                    status: status,
                });
            }
        });
    });



    const outputPath = path.join(__dirname, '../src/data/data_2026.json');
    fs.writeFileSync(outputPath, JSON.stringify(statusData, null, 2));
    console.log(`Generated ${statusData.length} entries to ${outputPath}`);
}

generateData();
