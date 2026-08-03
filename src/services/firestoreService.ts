
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    setDoc,
    query,
    where,
    writeBatch,
    onSnapshot,
    type QuerySnapshot,
    type DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Colaborador, Feriado, StatusDiario } from '../types';

const COLLECTIONS = {
    COLABORADORES: 'colaboradores',
    FERIADOS: 'feriados',
    REGISTROS: 'registros', // StatusDiario
};

// --- Colaboradores ---
export async function getColaboradores(): Promise<Colaborador[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.COLABORADORES));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Colaborador));
}

export async function addColaborador(colaborador: Colaborador) {
    const docRef = doc(db, COLLECTIONS.COLABORADORES, colaborador.id);
    await setDoc(docRef, colaborador);
}

export async function updateColaborador(colaborador: Colaborador) {
    const docRef = doc(db, COLLECTIONS.COLABORADORES, colaborador.id);
    await setDoc(docRef, colaborador);
}

export async function deleteColaborador(id: string) {
    await deleteDoc(doc(db, COLLECTIONS.COLABORADORES, id));
}

export async function setColaboradoresBatch(colaboradores: Colaborador[]) {
    for (const c of colaboradores) {
        const docRef = doc(db, COLLECTIONS.COLABORADORES, c.id);
        await setDoc(docRef, c);
    }
}

// --- Feriados ---
export async function getFeriados(): Promise<Feriado[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.FERIADOS));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feriado));
}

export async function addFeriado(feriado: Feriado) {
    // Normalização: USAR SEMPRE A DATA COMO ID (aaaa-mm-dd)
    const docId = feriado.data;
    const docRef = doc(db, COLLECTIONS.FERIADOS, docId);
    await setDoc(docRef, { ...feriado, id: docId });
}

export async function updateFeriado(feriado: Feriado) {
    const docId = feriado.data;
    const docRef = doc(db, COLLECTIONS.FERIADOS, docId);
    await setDoc(docRef, { ...feriado, id: docId });
}

export async function deleteFeriado(id: string) {
    await deleteDoc(doc(db, COLLECTIONS.FERIADOS, id));
}

export async function setFeriadosBatch(feriados: Feriado[]) {
    const batch = writeBatch(db);
    feriados.forEach((f) => {
        const docRef = doc(db, COLLECTIONS.FERIADOS, f.id);
        batch.set(docRef, f);
    });
    await batch.commit();
}

// --- Registros (Status Diários) ---
export async function getRegistros(year?: number): Promise<StatusDiario[]> {
    let q = query(collection(db, COLLECTIONS.REGISTROS));

    if (year) {
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;
        q = query(collection(db, COLLECTIONS.REGISTROS), where('data', '>=', start), where('data', '<=', end));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusDiario));
}

export async function setRegistrosBatch(registros: StatusDiario[]) {
    // Firestore batch limit is 500.
    const CHUNK_SIZE = 450; // Using a slightly smaller size for safety
    for (let i = 0; i < registros.length; i += CHUNK_SIZE) {
        const chunk = registros.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach(r => {
            const docRef = doc(db, COLLECTIONS.REGISTROS, r.id);
            batch.set(docRef, r);
        });
        
        await batch.commit();
        // Registros salvos
    }
}

export async function updateStatusDiario(status: StatusDiario) {
    const docRef = doc(db, COLLECTIONS.REGISTROS, status.id);
    await setDoc(docRef, status);
}

export async function deleteStatusDiario(id: string) {
    await deleteDoc(doc(db, COLLECTIONS.REGISTROS, id));
}

interface SubscribeDataChangesHandlers {
    onColaboradores: (colaboradores: Colaborador[]) => void;
    onFeriados: (feriados: Feriado[]) => void;
    onRegistros: (registros: StatusDiario[]) => void;
    onAnyChange?: () => void;
}

function mapSnapshotDocs<T>(snapshot: QuerySnapshot<DocumentData>): T[] {
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
}

export function subscribeToDataChanges(handlers: SubscribeDataChangesHandlers) {
    let initializedColaboradores = false;
    let initializedFeriados = false;
    let initializedRegistros = false;

    const unsubscribeColaboradores = onSnapshot(
        collection(db, COLLECTIONS.COLABORADORES),
        (snapshot) => {
            const data = mapSnapshotDocs<Colaborador>(snapshot);
            handlers.onColaboradores(data);
            if (initializedColaboradores) handlers.onAnyChange?.();
            initializedColaboradores = true;
        }
    );

    const unsubscribeFeriados = onSnapshot(
        collection(db, COLLECTIONS.FERIADOS),
        (snapshot) => {
            const data = mapSnapshotDocs<Feriado>(snapshot);
            handlers.onFeriados(data);
            if (initializedFeriados) handlers.onAnyChange?.();
            initializedFeriados = true;
        }
    );

    const unsubscribeRegistros = onSnapshot(
        collection(db, COLLECTIONS.REGISTROS),
        (snapshot) => {
            const data = mapSnapshotDocs<StatusDiario>(snapshot);
            handlers.onRegistros(data);
            if (initializedRegistros) handlers.onAnyChange?.();
            initializedRegistros = true;
        }
    );

    return () => {
        unsubscribeColaboradores();
        unsubscribeFeriados();
        unsubscribeRegistros();
    };
}


// --- Data Fixer & Normalizer (One-time) ---
export async function fixCorruptedData() {
    const batch = writeBatch(db);
    let modified = false;

    // 1. Fix Colaboradores (Ouvidoria/Ouvidor)
    const cols = await getColaboradores();
    cols.forEach(c => {
        let changed = false;
        let newCargo = c.cargo;
        let newDept = c.departamento;

        if (c.cargo === 'dominó' || c.cargo === 'Carga') {
            newCargo = 'Ouvidor';
            changed = true;
        }
        if (c.departamento === 'lyndoria' || c.departamento === 'lybdoria' || c.departamento === 'Ouvidoria (lyndoria)') {
            newDept = 'Ouvidoria';
            changed = true;
        }

        if (changed) {
            const ref = doc(db, COLLECTIONS.COLABORADORES, c.id);
            batch.set(ref, { ...c, cargo: newCargo, departamento: newDept });
            modified = true;
        }
    });

    // 2. Normalize Holiday IDs (aaaa-mm-dd)
    const currentHolidays = await getFeriados();
    
    // Identificar feriados com IDs fora do padrão (aaaa-mm-dd tem exatamente 10 caracteres)
    const strangeHolidays = currentHolidays.filter(f => f.id.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(f.id));
    
    strangeHolidays.forEach(f => {
        // Deletar o ID estranho
        const deleteRef = doc(db, COLLECTIONS.FERIADOS, f.id);
        batch.delete(deleteRef);
        
        // Re-inserir com o ID correto (data)
        const correctRef = doc(db, COLLECTIONS.FERIADOS, f.data);
        batch.set(correctRef, { ...f, id: f.data });
        modified = true;
    });

    // 3. Restore 2026 (including bridges and facultativos)
    const { fetchHolidays } = await import('./holidayService');
    const full2026 = await fetchHolidays(2026);
    
    full2026.forEach(f => {
        const ref = doc(db, COLLECTIONS.FERIADOS, f.data);
        batch.set(ref, { ...f, id: f.data });
        modified = true;
    });

    // 4. Migrate and Clean Status IDs to standard format (colaboradorId-data)
    const registros = await getRegistros(2026);
    const holidayDates = new Set(full2026.map(f => f.data));
    
    registros.forEach(r => {
        // Check if it's a holiday - holidays should NOT have work records (presencial/teletrabalho)
        // But VACATIONS (ferias) and other leaves MUST remain.
        if (holidayDates.has(r.data)) {
            if (['presencial', 'teletrabalho'].includes(r.status)) {
                const regRef = doc(db, COLLECTIONS.REGISTROS, r.id);
                batch.delete(regRef);
                modified = true;
                return;
            }
        }

        // Check for old ID format (yyyy-mm-dd-colaboradorId)
        const oldIdFormat = `${r.data}-${r.colaboradorId}`;
        const newIdFormat = `${r.colaboradorId}-${r.data}`;
        
        if (r.id === oldIdFormat) {
            console.log(`Migrando registro ${r.id} para ${newIdFormat}`);
            // Delete old
            const oldRef = doc(db, COLLECTIONS.REGISTROS, r.id);
            batch.delete(oldRef);
            
            // Set new (with same data)
            const newRef = doc(db, COLLECTIONS.REGISTROS, newIdFormat);
            batch.set(newRef, { ...r, id: newIdFormat });
            modified = true;
        }
    });

    if (modified) {
        await batch.commit();
        console.warn('⚠️ DADOS NORMALIZADOS: Alguns registros foram corrigidos ou migrados no Firestore.');
    }
    return modified;
}

/**
 * PURGE LEGACY DATA: Agressively removes any record that doesn't follow the
 * standard `${colaboradorId}-${data}` ID format.
 */
export async function purgeLegacyData() {
    console.log('🔍 Iniciando Auditoria e Limpeza Agressiva de Registros Legados...');
    const registros = await getRegistros();
    const batch = writeBatch(db);
    let count = 0;
    let totalPurged = 0;

    for (const r of registros) {
        const standardId = `${r.colaboradorId}-${r.data}`;
        
        // Se o ID atual não bate com o padrão calculado, é lixo ou legado
        if (r.id !== standardId) {
            console.warn(`🗑️ Deletando registro legado/inválido: ID=${r.id} (Esperado=${standardId})`);
            const docRef = doc(db, COLLECTIONS.REGISTROS, r.id);
            batch.delete(docRef);
            count++;
            totalPurged++;
        }

        // Firestore batch limit is 500
        if (count >= 400) {
            await batch.commit();
            count = 0;
        }
    }

    if (totalPurged > 0 && count > 0) {
        await batch.commit();
    }

    if (totalPurged > 0) {
        console.log(`✅ LIMPEZA CONCLUÍDA: ${totalPurged} registros legados removidos.`);
    } else {
        console.log('✅ NENHUM registro legado encontrado. Banco de dados está limpo.');
    }

    return totalPurged;
}

// --- Migration Helper ---
export async function migrateData(
    colaboradores: Colaborador[],
    feriados: Feriado[],
    registros: StatusDiario[],
    onProgress?: (message: string) => void
) {
    const batchLimit = 400;
    let batch = writeBatch(db);
    let count = 0;
    let totalProcessed = 0;
    const totalItems = colaboradores.length + feriados.length + registros.length;

    const commitBatch = async () => {
        if (count > 0) {
            if (onProgress) onProgress(`Enviando lote de ${count} itens... (${totalProcessed}/${totalItems})`);
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
        }
    };

    // 1. Colaboradores
    if (onProgress) onProgress(`Preparando ${colaboradores.length} colaboradores...`);
    for (const c of colaboradores) {
        const ref = doc(db, COLLECTIONS.COLABORADORES, c.id);
        batch.set(ref, c);
        count++;
        totalProcessed++;
        if (count >= batchLimit) await commitBatch();
    }

    // 2. Feriados
    if (onProgress) onProgress(`Preparando ${feriados.length} feriados...`);
    for (const f of feriados) {
        const ref = doc(db, COLLECTIONS.FERIADOS, f.id);
        batch.set(ref, f);
        count++;
        totalProcessed++;
        if (count >= batchLimit) await commitBatch();
    }

    // 3. Registros
    if (onProgress) onProgress(`Preparando ${registros.length} registros...`);
    for (const r of registros) {
        if (!r.id) continue;
        const ref = doc(db, COLLECTIONS.REGISTROS, r.id);
        batch.set(ref, r);
        count++;
        totalProcessed++;
        if (count >= batchLimit) await commitBatch();
    }

    await commitBatch();
    if (onProgress) onProgress('Finalizando...');
}

/**
 * REPARO DE DADOS: Backfill de registros de férias faltantes.
 * Garante que todos os dias de um período de férias existam no banco.
 */
import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns';

import { getFerias } from './feriasService';

export async function backfillVacationRecords() {
    console.log('👷 Iniciando Sincronização Dinâmica de Registros de Férias...');
    
    // Busca programações dinâmicas do Firestore
    const feriasList = await getFerias();
    const activeFerias = feriasList.filter(f => f.status === 'programado' || f.status === 'aprovado');

    let currentBatch = writeBatch(db);
    let totalCount = 0;
    let batchCount = 0;

    for (const f of activeFerias) {
        if (!f.parcelas) continue;
        for (const p of f.parcelas) {
            if (!p.dataInicio || !p.dataFim) continue;
            const start = parseISO(p.dataInicio);
            const end = parseISO(p.dataFim);
            if (!isValid(start) || !isValid(end) || isBefore(end, start)) continue;

            const interval = eachDayOfInterval({ start, end });
            for (const day of interval) {
                const dateStr = format(day, 'yyyy-MM-dd');
                const docId = `${f.colaboradorId}-${dateStr}`;
                const docRef = doc(db, COLLECTIONS.REGISTROS, docId);
                
                currentBatch.set(docRef, {
                    id: docId,
                    colaboradorId: f.colaboradorId,
                    data: dateStr,
                    status: 'ferias',
                    observacao: 'Férias Programadas'
                });

                totalCount++;
                batchCount++;

                if (batchCount >= 450) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    batchCount = 0;
                }
            }
        }
    }

    if (batchCount > 0) {
        await currentBatch.commit();
    }

    console.log(`✅ SINCRONIZAÇÃO DE FÉRIAS CONCLUÍDA: ${totalCount} registros atualizados.`);
    return totalCount;
}
