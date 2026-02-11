import {
    addDays,
    isSaturday,
    isSunday,
    format,
    parseISO,
    isWithinInterval,
    startOfDay
} from 'date-fns';
import { StatusDiario, Feriado, Colaborador } from '../types';

// Configuration
const ROTATION_POOL = ['andre', 'virginia', 'carol', 'william'];
const FIXED_PERSON_ID = 'iuri';

interface RotationEfficient {
    currentData: StatusDiario[];
    feriados: Feriado[];
    startDate: Date;
    endDate: Date;
}

export const calculateRotationMatrix = (
    currentData: StatusDiario[],
    feriados: Feriado[],
    colaboradores: Colaborador[],
    startDate: Date,
    endDate: Date
): StatusDiario[] => {
    const newStatuses: StatusDiario[] = [];

    // 1. Identify "Fixed" Absences (Vacation, Medical, etc.) that are already manually set
    // We want to preserve these and NOT overwrite them with rotation logic.
    // Actually, we want the rotation to *skip* these people.

    // We need to know who is available on any given day.
    // A person is unavailable if they have a status other than 'presencial' | 'teletrabalho' 
    // explicitly set for that day (e.g. 'ferias', 'atestado', 'licenca', 'folga').

    // For the purpose of regeneration, we assume 'presencial' and 'teletrabalho' are mutable 
    // (unless manually locked, but for now let's assume valid for recalculation).

    let rotationIndex = 0;

    // We need to find the last valid rotation state to continue from, OR start fresh?
    // The user said: "trazer os próximos da sequencia".
    // Ideally we find who was the last person scheduled before startDate to continue the sequence.
    // For simplicity MVP: We might reset sequence or let user pick "Next Person".
    // Let's try to infer from data before startDate? Too complex for now.
    // Let's start rotationIndex at 0 (André) or pass it in.
    // Better: The user can perhaps select "Who starts today?" in UI, or we default to Pool[0].

    let currentDate = startOfDay(startDate);
    const end = startOfDay(endDate);

    // Helper to check if date is holiday
    const isHoliday = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return feriados.some(f => f.data === dateStr);
    };

    // Helper to check if date is weekend
    const isWeekend = (date: Date) => isSaturday(date) || isSunday(date);

    // Parse existing data for quick lookup
    const statusMap = new Map<string, StatusDiario>();
    currentData.forEach(s => {
        statusMap.set(`${s.data}-${s.colaboradorId}`, s);
    });

    // Infer initial rotation index based on history
    rotationIndex = 0;

    // Look back up to 30 days to find who was the last person from the pool to be 'presencial'
    // We do this to ensure continuity.
    let lookBackDate = addDays(currentDate, -1);
    const lookBackLimit = addDays(currentDate, -30);

    let lastPresencialPerson: string | null = null;

    while (lookBackDate >= lookBackLimit) {
        const dStr = format(lookBackDate, 'yyyy-MM-dd');
        // Find who from the pool was presencial on this day
        const poolPersonOnDay = ROTATION_POOL.find(pid => {
            const s = statusMap.get(`${dStr}-${pid}`);
            return s && s.status === 'presencial';
        });

        if (poolPersonOnDay) {
            lastPresencialPerson = poolPersonOnDay;
            break;
        }
        lookBackDate = addDays(lookBackDate, -1);
    }

    if (lastPresencialPerson) {
        const idx = ROTATION_POOL.indexOf(lastPresencialPerson);
        if (idx !== -1) {
            rotationIndex = idx + 1;
        }
    }

    while (currentDate <= end) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        // Skip Weekends and Holidays
        if (isWeekend(currentDate) || isHoliday(currentDate)) {
            currentDate = addDays(currentDate, 1);
            continue;
        }

        // It's a work day!

        // 1. Fixed Person (Iuri) is always Presencial unless he has a blocking status
        const fixedPersonStatus = statusMap.get(`${dateStr}-${FIXED_PERSON_ID}`);
        const isFixedPersonAvailable = !fixedPersonStatus || ['presencial', 'teletrabalho'].includes(fixedPersonStatus.status);

        if (isFixedPersonAvailable) {
            // We can upsert Iuri as Presencial if he doesn't have a status or is just tele/presencial
            // But wait, if he manually set 'teletrabalho', should we force 'presencial'?
            // The rule is "Ouvidor/Chefe deve ter sempre alguém presencialmente com ele".
            // Implicitly Chefe is Presencial.
            newStatuses.push({
                id: `${dateStr}-${FIXED_PERSON_ID}`,
                colaboradorId: FIXED_PERSON_ID,
                data: dateStr,
                status: 'presencial'
            });
        }

        // 2. Determine who from the Pool is Presencial
        let assignedPersonId: string | null = null;
        let attempts = 0;

        // Try to find the next available person
        while (attempts < ROTATION_POOL.length) {
            const candidateId = ROTATION_POOL[rotationIndex % ROTATION_POOL.length];

            // Check availability
            const candidateStatus = statusMap.get(`${dateStr}-${candidateId}`);
            // Available if: No status OR status is presencial/teletrabalho (mutable)
            // Unavailable if: ferias, atestado, licenca, folga
            const isAvailable = !candidateStatus || ['presencial', 'teletrabalho'].includes(candidateStatus.status);

            if (isAvailable) {
                assignedPersonId = candidateId;
                rotationIndex++; // Advance index since we used this person
                break;
            } else {
                // Candidate is busy (e.g. Vacation), skip them and try next person WITHOUT advancing the "consumed" rotation tick for them?
                // Wait, "trazer os próximos da sequencia".
                // If André is on vacation, we skip him. Does he lose his turn? Usually yes in a strict calendar, 
                // but here the requirement is "cobrir as ausências".
                // So we just pick the next available person.
                rotationIndex++; // We increment to check the next person in the array
            }
            attempts++;
        }

        // Assign statuses for the pool
        ROTATION_POOL.forEach(personId => {
            // If person has a blocking status (vacation etc), preserve it (don't overwrite)
            const existingStatus = statusMap.get(`${dateStr}-${personId}`);
            if (existingStatus && !['presencial', 'teletrabalho'].includes(existingStatus.status)) {
                // Keep existing blocking status
                // We verify if we need to ensure this is in the output? 
                // The service returns *new* statuses to be merged.
                // If we don't return it, the store needs to know not to delete it. 
                // Our strategy: Return the full set of immutable statuses for the range?
                // Or just the changes?
                // Safer to return the calculated state for everyone in the pool for this day.
                newStatuses.push(existingStatus); // Keep vacation/etc
                return;
            }

            if (personId === assignedPersonId) {
                newStatuses.push({
                    id: `${dateStr}-${personId}`,
                    colaboradorId: personId,
                    data: dateStr,
                    status: 'presencial'
                });
            } else {
                newStatuses.push({
                    id: `${dateStr}-${personId}`,
                    colaboradorId: personId,
                    data: dateStr,
                    status: 'teletrabalho'
                });
            }
        });

        currentDate = addDays(currentDate, 1);
    }

    return newStatuses;
};
