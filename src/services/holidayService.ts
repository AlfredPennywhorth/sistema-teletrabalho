
import { Feriado } from '../types';

interface BrasilApiHoliday {
    date: string;
    name: string;
    type: string;
}

const SP_MUNICIPAL_HOLIDAYS = [
    { date: '01-25', name: 'Aniversário de São Paulo' },
    { date: '11-20', name: 'Dia da Consciência Negra' }, // Agora é nacional, mas mantendo por garantia histórica/municipal se falhar na API
];

const SP_STATE_HOLIDAYS = [
    { date: '07-09', name: 'Revolução Constitucionalista' },
];

// Fallback holidays if API fails
const NATIONAL_HOLIDAYS_FALLBACK: Record<string, { date: string; name: string }[]> = {
    '2025': [
        { date: '01-01', name: 'Confraternização Universal' },
        { date: '03-03', name: 'Carnaval' },
        { date: '03-04', name: 'Carnaval' },
        { date: '04-18', name: 'Sexta-feira Santa' },
        { date: '04-21', name: 'Tiradentes' },
        { date: '05-01', name: 'Dia do Trabalho' },
        { date: '06-19', name: 'Corpus Christi' },
        { date: '09-07', name: 'Independência do Brasil' },
        { date: '10-12', name: 'Nossa Senhora Aparecida' },
        { date: '11-02', name: 'Finados' },
        { date: '11-15', name: 'Proclamação da República' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '12-25', name: 'Natal' }
    ],
    '2026': [
        { date: '01-01', name: 'Confraternização Universal' },
        { date: '02-16', name: 'Carnaval' },
        { date: '02-17', name: 'Carnaval' },
        { date: '04-03', name: 'Sexta-feira Santa' },
        { date: '04-21', name: 'Tiradentes' },
        { date: '05-01', name: 'Dia do Trabalho' },
        { date: '06-04', name: 'Corpus Christi' },
        { date: '09-07', name: 'Independência do Brasil' },
        { date: '10-12', name: 'Nossa Senhora Aparecida' },
        { date: '11-02', name: 'Finados' },
        { date: '11-15', name: 'Proclamação da República' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '12-25', name: 'Natal' }
    ],
    '2027': [
        { date: '01-01', name: 'Confraternização Universal' },
        { date: '02-08', name: 'Carnaval' },
        { date: '02-09', name: 'Carnaval' },
        { date: '03-26', name: 'Sexta-feira Santa' },
        { date: '04-21', name: 'Tiradentes' },
        { date: '05-01', name: 'Dia do Trabalho' },
        { date: '05-27', name: 'Corpus Christi' },
        { date: '09-07', name: 'Independência do Brasil' },
        { date: '10-12', name: 'Nossa Senhora Aparecida' },
        { date: '11-02', name: 'Finados' },
        { date: '11-15', name: 'Proclamação da República' },
        { date: '11-20', name: 'Dia da Consciência Negra' },
        { date: '12-25', name: 'Natal' }
    ]
};

export async function fetchHolidays(year: number): Promise<Feriado[]> {
    let feriados: Feriado[] = [];
    let usedFallback = false;

    // 1. Tentar buscar feriados nacionais (BrasilAPI)
    try {
        const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);

        if (response.ok) {
            const data: BrasilApiHoliday[] = await response.json();
            feriados = data.map((h) => ({
                id: `${h.date}-${h.name.replace(/\s+/g, '-').toLowerCase()}`,
                data: h.date,
                nome: h.name,
                tipo: 'nacional',
            }));
        } else {
            throw new Error(`Status ${response.status}`);
        }
    } catch (error) {
        console.warn('BrasilAPI falhou ou está offline. Usando dados locais de fallback.', error);
        usedFallback = true;

        // Usar fallback se disponível
        const fallbackList = NATIONAL_HOLIDAYS_FALLBACK[year.toString()];
        if (fallbackList) {
            feriados = fallbackList.map(h => ({
                id: `${year}-${h.date}-${h.name.replace(/\s+/g, '-').toLowerCase()}`,
                data: `${year}-${h.date}`,
                nome: h.name,
                tipo: 'nacional'
            }));
        }
    }

    // 2. Adicionar feriados estaduais de SP (Hardcoded)
    SP_STATE_HOLIDAYS.forEach((spHoliday) => {
        const fullDate = `${year}-${spHoliday.date}`;
        const exists = feriados.some((f) => f.data === fullDate);

        if (!exists) {
            feriados.push({
                id: `${fullDate}-${spHoliday.name.replace(/\s+/g, '-').toLowerCase()}`,
                data: fullDate,
                nome: spHoliday.name,
                tipo: 'estadual',
            });
        }
    });

    // 3. Adicionar feriados municipais de SP (Hardcoded)
    SP_MUNICIPAL_HOLIDAYS.forEach((spHoliday) => {
        const fullDate = `${year}-${spHoliday.date}`;
        // Evitar duplicatas se a API já tiver retornado (ex: Consciência Negra que agora é nacional)
        const exists = feriados.some((f) => f.data === fullDate);

        if (!exists) {
            feriados.push({
                id: `${fullDate}-${spHoliday.name.replace(/\s+/g, '-').toLowerCase()}`,
                data: fullDate,
                nome: spHoliday.name,
                tipo: 'municipal',
            });
        }
    });

    // Ordenar por data
    return feriados.sort((a, b) => a.data.localeCompare(b.data));
}
