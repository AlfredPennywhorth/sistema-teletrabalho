import { addDays, differenceInDays, format, getDay, isBefore, isValid, parseISO } from 'date-fns';
import { Ferias, Feriado } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFerias(
  ferias: Omit<Ferias, 'id' | 'status'>,
  feriados: Feriado[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { colaboradorId, abonoPecuniario, parcelas, antecipar13, periodoFim } = ferias;

  if (!colaboradorId) {
    errors.push('Colaborador é obrigatório.');
  }

  if (!parcelas || parcelas.length === 0 || parcelas.length > 3) {
    errors.push('O número de parcelas deve ser entre 1 e 3.');
  }

  const diasDireito = 30;
  const diasAbono = abonoPecuniario ? 10 : 0;
  const diasDescanso = abonoPecuniario ? 20 : 30;

  let totalDias = 0;
  let has14Days = false;

  const parcelasValidas = parcelas.filter(p => p.dataInicio && p.dataFim);

  if (parcelasValidas.length !== parcelas.length) {
    errors.push('Todas as parcelas devem ter data de início e fim preenchidas.');
  }

  const parcelasOrdenadas = [...parcelasValidas].sort(
    (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
  );

  const safeFeriados = feriados || [];

  parcelasOrdenadas.forEach((p, i) => {
    const dInicio = parseISO(p.dataInicio);
    const dFim = parseISO(p.dataFim);

    if (isValid(dInicio) && isValid(dFim)) {
      if (isBefore(dFim, dInicio)) {
        errors.push(`Parcela ${i + 1}: Data fim não pode ser anterior à data de início.`);
      }
      
      const diasCalculados = differenceInDays(dFim, dInicio) + 1;
      totalDias += diasCalculados;

      if (diasCalculados >= 14) has14Days = true;
      if (diasCalculados > 0 && diasCalculados < 5) {
        errors.push(`Parcela ${i + 1} deve ter no mínimo 5 dias.`);
      }
    }

    if (i > 0) {
      const prevFim = parseISO(parcelasOrdenadas[i - 1].dataFim);
      if (isValid(prevFim) && isValid(dInicio)) {
        if (dInicio <= prevFim) {
          errors.push('Há sobreposição entre períodos de férias. Ajuste as datas antes de salvar.');
        }
      }
    }

    if (p.dataInicio) {
      const dayOfWeek = getDay(dInicio); // 0=Sun, 1=Mon, ..., 6=Sat
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        errors.push(`Parcela ${i + 1} não pode iniciar no fim de semana.`);
      }
      if (dayOfWeek === 4 || dayOfWeek === 5) {
        errors.push(`Parcela ${i + 1} não pode iniciar em quinta ou sexta-feira.`);
      }

      // Check feriados e vésperas
      const dateStr = format(dInicio, 'yyyy-MM-dd');
      const next1 = format(addDays(dInicio, 1), 'yyyy-MM-dd');
      const next2 = format(addDays(dInicio, 2), 'yyyy-MM-dd');

      const isHol = safeFeriados.some(f => f.data === dateStr);
      const isVespera1 = safeFeriados.some(f => f.data === next1);
      const isVespera2 = safeFeriados.some(f => f.data === next2);

      if (isHol) {
        errors.push(`Parcela ${i + 1} não pode iniciar em feriado.`);
      }
      if (isVespera1 || isVespera2) {
        errors.push(`Parcela ${i + 1} não pode iniciar nos 2 dias que antecedem um feriado.`);
      }

      // Warnings
      const daysDiff = differenceInDays(dInicio, new Date());
      if (daysDiff < 30 && daysDiff >= 0) {
        warnings.push(`Parcela ${i + 1} inicia em menos de 30 dias.`);
      }

      if (antecipar13 && dInicio.getMonth() === 0) {
        warnings.push('Antecipação de 13º marcada para janeiro (Verificar norma).');
      }
    }
  });

  if (totalDias !== diasDescanso) {
    errors.push(`A soma dos dias (${totalDias}) deve ser igual a ${diasDescanso} (Direito: ${diasDireito} - Abono: ${diasAbono}).`);
  }

  if (parcelas.length > 1 && !has14Days) {
    errors.push('No fracionamento, ao menos uma parcela deve ter 14 dias ou mais.');
  }

  if (abonoPecuniario && periodoFim) {
    const today = new Date();
    const aquisitivoFim = parseISO(periodoFim);
    if (isValid(aquisitivoFim) && differenceInDays(aquisitivoFim, today) < 15) {
      warnings.push('Abono pecuniário solicitado com menos de 15 dias do vencimento do período aquisitivo.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
