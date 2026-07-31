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
    endDate: Date,
    feriasProgramadas?: any[],
    maxTeletrabalho: number = 1,
    sobrescreverManual: boolean = false
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

    while (currentDate <= end) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const isWknd = isWeekendDay(currentDate);
        const isHol = isHoliday(currentDate);

        if (isWknd || isHol) {
            // Em finais de semana e feriados, não há rodízio.
            // Mas PRECISAMOS preservar os status de férias/folga/licença/atestado/outro que já existem.
            colaboradores.forEach(col => {
                const existing = statusMap.get(`${col.id}-${dateStr}`);
                if (existing && !['presencial', 'teletrabalho'].includes(existing.status)) {
                    newStatuses.push(existing);
                }
            });
            currentDate = addDays(currentDate, 1);
            continue;
        }

        // 1. Identify Unavailable Users (Vacation, etc.) and Manual Teleworkers
        const unavailableUsers = new Set<string>();
        const manualTeleworkers = new Set<string>();

        ROTATION_POOL.forEach(id => {
            const s = statusMap.get(`${id}-${dateStr}`);
            if (s) {
                const checkManual = s.isManual && !sobrescreverManual;
                if (checkManual && s.status === 'teletrabalho') {
                    manualTeleworkers.add(id);
                } else if (checkManual || !['presencial', 'teletrabalho'].includes(s.status)) {
                    unavailableUsers.add(id);
                }
            }
        });

        // Also check vacation bookings (feriasProgramadas)
        if (feriasProgramadas) {
            feriasProgramadas.forEach(f => {
                if (f.status !== 'cancelado' && f.parcelas) {
                    f.parcelas.forEach((p: any) => {
                        if (p.dataInicio && p.dataFim) {
                            if (dateStr >= p.dataInicio && dateStr <= p.dataFim) {
                                unavailableUsers.add(f.colaboradorId);
                            }
                        }
                    });
                }
            });
        }

        // 2. Determine Rotation Persons (up to maxTeletrabalho who get teletrabalho)
        const rotationPersonIds = new Set<string>();
        
        // Add manual teleworkers first to count them towards the limit
        manualTeleworkers.forEach(id => {
            if (rotationPersonIds.size < maxTeletrabalho) {
                rotationPersonIds.add(id);
            }
        });

        let attempts = 0;
        while (attempts < ROTATION_POOL.length && rotationPersonIds.size < maxTeletrabalho) {
            const candidateId = ROTATION_POOL[rotationIndex % ROTATION_POOL.length];
            if (!unavailableUsers.has(candidateId) && !manualTeleworkers.has(candidateId)) {
                rotationPersonIds.add(candidateId);
            }
            rotationIndex++;
            attempts++;
        }

        // 3. Generate Statuses
        colaboradores.forEach(col => {
            // Check if on vacation in programadas
            let isOnVacation = false;
            if (feriasProgramadas) {
                isOnVacation = feriasProgramadas.some(f => 
                    f.status !== 'cancelado' &&
                    f.colaboradorId === col.id && 
                    f.parcelas?.some((p: any) => p.dataInicio && p.dataFim && dateStr >= p.dataInicio && dateStr <= p.dataFim)
                );
            }

            if (isOnVacation) {
                newStatuses.push({
                    id: `${col.id}-${dateStr}`,
                    colaboradorId: col.id,
                    data: dateStr,
                    status: 'ferias',
                    observacao: 'Férias Programadas'
                });
                return;
            }

            const existing = statusMap.get(`${col.id}-${dateStr}`);
            const checkManual = existing?.isManual && !sobrescreverManual;
            
            // Preserva registros manuais ou ausências (diferentes de presencial/teletrabalho)
            if (existing && (checkManual || !['presencial', 'teletrabalho'].includes(existing.status))) {
                newStatuses.push(existing);
                return;
            }

            // Padrão é presencial.
            let status: 'presencial' | 'teletrabalho' = 'presencial';

            if (rotationPersonIds.has(col.id)) {
                status = 'teletrabalho';
            }

            // O Ouvidor nunca pode estar em teletrabalho
            if (col.id === FIXED_PERSON_ID) {
                status = 'presencial';
            }

            newStatuses.push({
                id: `${col.id}-${dateStr}`,
                colaboradorId: col.id,
                data: dateStr,
                status,
                observacao: existing?.observacao,
                isManual: existing?.isManual // Maintain flag if present
            });
        });

        currentDate = addDays(currentDate, 1);
    }

    return newStatuses;
};
