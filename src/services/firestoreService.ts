
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    query,
    where
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
    const batch = [];
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

export async function setRegistrosBatch(registros: StatusDiario[]) {
    // Firestore batch limit is 500. For large datasets we need multiple batches.
    // For simplicity here, we'll confirm migration via specialized script logic or chunks.
    // Just exporting a function for single status update for now.
}

export async function updateStatusDiario(status: StatusDiario) {
    const docRef = doc(db, COLLECTIONS.REGISTROS, status.id); // Assuming ID is date-colaboradorId
    await setDoc(docRef, status);
}

// --- Migration Helper ---
import { writeBatch } from 'firebase/firestore';

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
        if (!r.id) continue; // Skip invalid records
        const ref = doc(db, COLLECTIONS.REGISTROS, r.id);
        batch.set(ref, r);
        count++;
        totalProcessed++;
        if (count >= batchLimit) await commitBatch();
    }

    // Final commit
    await commitBatch();
    if (onProgress) onProgress('Finalizando...');
}
