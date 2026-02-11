
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
    { colaboradorId: 'carol', start: '2026-11-14', days: 18 },
    { colaboradorId: 'andre', start: '2026-07-13', days: 12 },
    { colaboradorId: 'andre', start: '2026-12-14', days: 18 },
    { colaboradorId: 'virginia', start: '2026-03-16', days: 15 },
    { colaboradorId: 'virginia', start: '2026-11-23', days: 15 },
    { colaboradorId: 'iuri', start: '2026-08-03', days: 30 },
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

        // Determine Presencial Person for Phase 2 Rotation
        // Only advance rotation index on WORK DAYS
        let rotationPersonId = '';
        if (!isWknd && !isHol && isPhase2) {
            rotationPersonId = rotationPool[rotationIndex % rotationPool.length];
            rotationIndex++;
        }

        colaboradores.forEach((col) => {
            let status = '';

            // 1. Check Vacation (Priority: Vacation counts on ALL days)
            const userVacations = vacations.filter(v => v.colaboradorId === col.id);
            const isOnVacation = userVacations.some(v => {
                const start = parseISO(v.start);
                // Vacations are calendar days, including start date
                const end = addDays(start, v.days - 1);
                return isWithinInterval(day, { start, end });
            });

            if (isOnVacation) {
                status = 'ferias';
            } else {
                // Not vacation. If weekend or holiday, skip generating entry
                if (isWknd || isHol) return;

                // Business Day Logic
                if (!isPhase2) {
                    // Phase 1: All Presencial
                    status = 'presencial';
                } else {
                    // Phase 2
                    if (col.id === 'iuri') {
                        status = 'presencial';
                    } else {
                        // Rotation logic
                        // We need to recalculate rotation person for THIS specific col context?
                        // No, rotationPersonId is global for the day.
                        if (col.id === rotationPersonId) {
                            status = 'presencial';
                        } else {
                            status = 'teletrabalho';
                        }
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
