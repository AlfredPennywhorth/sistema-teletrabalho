
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    setDoc,
    query,
    where,
    writeBatch
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
    // Use custom ID if provided (e.g. date-name slug), otherwise auto-id
    const docRef = doc(db, COLLECTIONS.FERIADOS, feriado.id || doc(collection(db, COLLECTIONS.FERIADOS)).id);
    await setDoc(docRef, feriado);
}

export async function updateFeriado(feriado: Feriado) {
    const docRef = doc(db, COLLECTIONS.FERIADOS, feriado.id);
    await setDoc(docRef, feriado);
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

export async function setRegistrosBatch(_registros: StatusDiario[]) {
    // Firestore batch limit is 500. For large datasets we need multiple batches.
    // For simplicity here, we'll use migrateData for large sets or updateStatusDiario for single updates.
}

export async function updateStatusDiario(status: StatusDiario) {
    const docRef = doc(db, COLLECTIONS.REGISTROS, status.id); // Assuming ID is date-colaboradorId
    await setDoc(docRef, status);
}


// --- Data Fixer (One-time) ---
export async function fixCorruptedData() {
    const batch = writeBatch(db);
    let modified = false;

    // 1. Fix Colaboradores
    const cols = await getColaboradores();
    cols.forEach(c => {
        let changed = false;
        let newCargo = c.cargo;
        let newDept = c.departamento;

        if (c.cargo === 'dominó') {
            newCargo = 'Ouvidor';
            changed = true;
        }
        if (c.departamento === 'lyndoria') {
            newDept = 'Ouvidoria';
            changed = true;
        }

        if (changed) {
            const ref = doc(db, COLLECTIONS.COLABORADORES, c.id);
            batch.set(ref, { ...c, cargo: newCargo, departamento: newDept });
            modified = true;
        }
    });

    // 2. Fix Missing Holiday (Paixão de Cristo 2026)
    const holidays = await getFeriados();
    const hasPaixao = holidays.some(f => f.data === '2026-04-03');
    if (!hasPaixao) {
        const holidayRef = doc(db, COLLECTIONS.FERIADOS, '2026-04-03-paixao-de-cristo');
        batch.set(holidayRef, {
            id: '2026-04-03-paixao-de-cristo',
            data: '2026-04-03',
            nome: 'Paixão de Cristo',
            tipo: 'nacional'
        });
        modified = true;
    }

    // 3. Clean status for that holiday
    const registros = await getRegistros(2026);
    const holidayRegs = registros.filter(r => r.data === '2026-04-03');
    holidayRegs.forEach(r => {
        const regRef = doc(db, COLLECTIONS.REGISTROS, r.id);
        batch.delete(regRef);
        modified = true;
    });

    if (modified) {
        await batch.commit();
        console.log('Dados corrigidos no Firestore (Colaboradores, Feriado e Escalas).');
    }
    return modified;
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
