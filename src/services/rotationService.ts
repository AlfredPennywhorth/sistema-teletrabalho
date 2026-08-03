import {
    addDays,
    isSaturday,
    isSunday,
    format,
    startOfDay,
    startOfWeek
} from 'date-fns';
import { StatusDiario, Feriado, Colaborador } from '../types';

// Helpers to normalize and check Ouvidor role
const isOuvidor = (cargo: string): boolean => {
    if (!cargo) return false;
    return cargo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("ouvidor");
};

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
    
    // Filtrar colaboradores ativos
    const activeColaboradores = colaboradores.filter(c => c.situacao === 'ativo');

    // Determinar o pool de rodízio e o Ouvidor dinamicamente
    const ouvidorColaborador = activeColaboradores.find(c => isOuvidor(c.cargo));
    const ouvidorId = ouvidorColaborador ? ouvidorColaborador.id : 'iuri'; // Fallback seguro
    
    const dynamicRotationPool = activeColaboradores
        .filter(c => !isOuvidor(c.cargo))
        .map(c => c.id);

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

    let currentWeekKey = '';
    const weekTeleworkAssignments = new Map<string, string>(); // dateStr -> collaboratorId

    while (currentDate <= end) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const isWknd = isWeekendDay(currentDate);
        const isHol = isHoliday(currentDate);

        if (isWknd || isHol) {
            // Em finais de semana e feriados, não há rodízio.
            // Mas preservamos licenças/atestados/folgas e atribuímos férias programadas vigentes.
            colaboradores.forEach(col => {
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
                // Preserva ausências (folga, licença, atestado, etc.), ignorando status 'ferias' antigo que já não vigora
                if (existing && existing.status !== 'ferias' && !['presencial', 'teletrabalho'].includes(existing.status)) {
                    newStatuses.push(existing);
                }
            });
            currentDate = addDays(currentDate, 1);
            continue;
        }

        // Track and reset weekly telework counts and pre-calculate assignments
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (weekKey !== currentWeekKey) {
            currentWeekKey = weekKey;
            weekTeleworkAssignments.clear();

            // 1. Gather all working days of this week (Monday to Friday) that are not holidays
            const availableDays: Date[] = [];
            for (let offset = 0; offset < 5; offset++) {
                const dayOfWk = addDays(weekStart, offset);
                if (!isHoliday(dayOfWk)) {
                    availableDays.push(dayOfWk);
                }
            }

            // 2. Identify manual telework and general leaves for each collaborator this week
            const assignedCols = new Set<string>();
            const assignedDates = new Set<string>();

            // Lock in manual/preserved teleworks first
            availableDays.forEach(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                dynamicRotationPool.forEach(id => {
                    const s = statusMap.get(`${id}-${dayStr}`);
                    if (s) {
                        const checkManual = s.isManual && !sobrescreverManual;
                        if (checkManual && s.status === 'teletrabalho') {
                            weekTeleworkAssignments.set(dayStr, id);
                            assignedCols.add(id);
                            assignedDates.add(dayStr);
                        }
                    }
                });
            });

            // 3. Prepare remaining days and collaborators for shuffling
            const remainingDays = availableDays.filter(day => !assignedDates.has(format(day, 'yyyy-MM-dd')));
            const remainingCols = dynamicRotationPool.filter(id => !assignedCols.has(id));

            // Shuffle remaining days and collaborators randomly
            const shuffledDays = [...remainingDays].sort(() => Math.random() - 0.5);
            const shuffledCols = [...remainingCols].sort(() => Math.random() - 0.5);

            // 4. Map remaining collaborators to remaining days (up to 1 telework per day and per week)
            for (const day of shuffledDays) {
                const dayStr = format(day, 'yyyy-MM-dd');
                
                // Find a collaborator who is available on this day
                const availableColIndex = shuffledCols.findIndex(id => {
                    const s = statusMap.get(`${id}-${dayStr}`);
                    const isManualPresencial = s?.isManual && s?.status === 'presencial' && !sobrescreverManual;
                    const isOtherStatus = s && !['presencial', 'teletrabalho', 'ferias'].includes(s.status);
                    
                    let isOnVacation = false;
                    if (feriasProgramadas) {
                        isOnVacation = feriasProgramadas.some(f => 
                            f.status !== 'cancelado' &&
                            f.colaboradorId === id && 
                            f.parcelas?.some((p: any) => p.dataInicio && p.dataFim && dayStr >= p.dataInicio && dayStr <= p.dataFim)
                        );
                    }
                    
                    return !isManualPresencial && !isOtherStatus && !isOnVacation;
                });
                
                if (availableColIndex !== -1) {
                    const colId = shuffledCols[availableColIndex];
                    weekTeleworkAssignments.set(dayStr, colId);
                    shuffledCols.splice(availableColIndex, 1); // remove from available list for this week
                }
            }
        }

        // 5. Generate Statuses
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
            const isObsoleteVacation = existing?.status === 'ferias';
            
            // Preserva registros manuais ou ausências (diferentes de presencial/teletrabalho), ignorando férias obsoletas
            if (existing && !isObsoleteVacation && (checkManual || !['presencial', 'teletrabalho'].includes(existing.status))) {
                newStatuses.push(existing);
                return;
            }

            // Padrão é presencial.
            let status: 'presencial' | 'teletrabalho' = 'presencial';

            if (weekTeleworkAssignments.get(dateStr) === col.id) {
                status = 'teletrabalho';
            }

            // O Ouvidor nunca pode estar em teletrabalho
            if (col.id === ouvidorId) {
                status = 'presencial';
            }

            const newRecord: StatusDiario = {
                id: `${col.id}-${dateStr}`,
                colaboradorId: col.id,
                data: dateStr,
                status,
            };

            if (existing?.observacao !== undefined) {
                newRecord.observacao = existing.observacao;
            }
            if (existing?.isManual !== undefined) {
                newRecord.isManual = existing.isManual;
            }

            newStatuses.push(newRecord);
        });

        currentDate = addDays(currentDate, 1);
    }

    return newStatuses;
};
