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
    currentData.forEach(s => statusMap.set(`${s.data}-${s.colaboradorId}`, s));

    // Initial Rotation Index Estimation (Simplified)
    rotationIndex = 0;

    while (currentDate <= end) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        if (isWeekendDay(currentDate) || isHoliday(currentDate)) {
            currentDate = addDays(currentDate, 1);
            continue;
        }

        // 1. Identify Unavailable Users (Vacation, etc.)
        const unavailableUsers = new Set<string>();
        ROTATION_POOL.forEach(id => {
            const s = statusMap.get(`${dateStr}-${id}`);
            if (s && !['presencial', 'teletrabalho'].includes(s.status)) {
                unavailableUsers.add(id);
            }
        });

        const iuriStatus = statusMap.get(`${dateStr}-${FIXED_PERSON_ID}`);
        if (iuriStatus && !['presencial', 'teletrabalho'].includes(iuriStatus.status)) {
            unavailableUsers.add(FIXED_PERSON_ID);
        }

        // 2. Determine Substitution Rule
        let temporaryFixedPersonId = '';
        if (unavailableUsers.has(FIXED_PERSON_ID)) {
            temporaryFixedPersonId = 'carol';
        }

        // 3. Effective Pool
        const effectivePool = ROTATION_POOL.filter(id => id !== temporaryFixedPersonId);

        // 4. Determine Rotation Person
        let rotationPersonId = '';
        let attempts = 0;
        while (attempts < effectivePool.length) {
            const candidateId = effectivePool[rotationIndex % effectivePool.length];
            if (!unavailableUsers.has(candidateId)) {
                rotationPersonId = candidateId;
                rotationIndex++;
                break;
            } else {
                rotationIndex++;
            }
            attempts++;
        }

        // 5. Generate Statuses
        colaboradores.forEach(col => {
            const existing = statusMap.get(`${dateStr}-${col.id}`);
            if (existing && !['presencial', 'teletrabalho'].includes(existing.status)) {
                newStatuses.push(existing);
                return;
            }

            let status: 'presencial' | 'teletrabalho' = 'teletrabalho';

            if (col.id === FIXED_PERSON_ID) {
                status = 'presencial';
            } else if (col.id === temporaryFixedPersonId) {
                status = 'presencial';
            } else if (col.id === rotationPersonId) {
                status = 'presencial';
            }

            newStatuses.push({
                id: `${dateStr}-${col.id}`,
                colaboradorId: col.id,
                data: dateStr,
                status
            });
        });

        currentDate = addDays(currentDate, 1);
    }

    return newStatuses;
};
