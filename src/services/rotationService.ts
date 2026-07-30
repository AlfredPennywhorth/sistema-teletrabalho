import {
    addDays,
    isSaturday,
    isSunday,
    format,
    startOfDay
} from 'date-fns';
import { StatusDiario, Feriado, Colaborador } from '../types';

// Configuration
const ROTATION_POOL = ['andre', 'virginia', 'carol', 'william'];
const FIXED_PERSON_ID = 'iuri';

export const calculateRotationMatrix = (
    currentData: StatusDiario[],
    feriados: Feriado[],
    colaboradores: Colaborador[],
    startDate: Date,
    endDate: Date
): StatusDiario[] => {
    const newStatuses: StatusDiario[] = [];
    let rotationIndex = 0;

    let currentDate = startOfDay(startDate);
    const end = startOfDay(endDate);

    // Helpers
    const holidaySet = new Set(feriados.map(f => f.data));
    const isHoliday = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return holidaySet.has(dateStr);
    };
    const isWeekendDay = (date: Date) => isSaturday(date) || isSunday(date);

    // Map existing statuses
    const statusMap = new Map<string, StatusDiario>();
    currentData.forEach(s => statusMap.set(`${s.colaboradorId}-${s.data}`, s));

    // Initial Rotation Index Estimation (Simplified)
    rotationIndex = 0;

    while (currentDate <= end) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const isWknd = isWeekendDay(currentDate);
        const isHol = isHoliday(currentDate);

        if (isWknd || isHol) {
            // Em finais de semana e feriados, não há rodízio.
            // Mas PRECISAMOS preservar os status de férias/folga/etc que já existem.
            colaboradores.forEach(col => {
                const existing = statusMap.get(`${col.id}-${dateStr}`);
                if (existing && !['presencial', 'teletrabalho'].includes(existing.status)) {
                    newStatuses.push(existing);
                }
            });
            currentDate = addDays(currentDate, 1);
            continue;
        }

        // 1. Identify Unavailable Users (Vacation, etc.)
        const unavailableUsers = new Set<string>();
        ROTATION_POOL.forEach(id => {
            const s = statusMap.get(`${id}-${dateStr}`);
            if (s && !['presencial', 'teletrabalho'].includes(s.status)) {
                unavailableUsers.add(id);
            }
        });

        // 2. Determine Rotation Person (the ONE who gets teletrabalho)
        let rotationPersonId = '';
        let attempts = 0;
        
        while (attempts < ROTATION_POOL.length) {
            const candidateId = ROTATION_POOL[rotationIndex % ROTATION_POOL.length];
            if (!unavailableUsers.has(candidateId)) {
                rotationPersonId = candidateId;
                rotationIndex++;
                break;
            } else {
                rotationIndex++;
            }
            attempts++;
        }

        // 3. Generate Statuses
        colaboradores.forEach(col => {
            const existing = statusMap.get(`${col.id}-${dateStr}`);
            // Preserva registros manuais ou ausências
            if (existing && !['presencial', 'teletrabalho'].includes(existing.status)) {
                newStatuses.push(existing);
                return;
            }

            // Padrão é presencial. Apenas o rotationPersonId ganha teletrabalho.
            let status: 'presencial' | 'teletrabalho' = 'presencial';

            if (col.id === rotationPersonId) {
                status = 'teletrabalho';
            }

            // O Ouvidor nunca pode estar em teletrabalho, mesmo que estivesse no pool
            if (col.id === FIXED_PERSON_ID) {
                status = 'presencial';
            }

            newStatuses.push({
                id: `${col.id}-${dateStr}`,
                colaboradorId: col.id,
                data: dateStr,
                status,
                // Preserva a observação se já existia (registro manual)
                observacao: existing?.observacao
            });
        });

        currentDate = addDays(currentDate, 1);
    }

    return newStatuses;
};
