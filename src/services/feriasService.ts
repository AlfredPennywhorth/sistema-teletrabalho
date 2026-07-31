import { collection, doc, setDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ferias, FeriasStatus } from '../types';
import { validateFerias } from '../utils/feriasValidation';
import { getFeriados } from './firestoreService';

export const getFerias = async (): Promise<Ferias[]> => {
    try {
        const q = query(collection(db, 'ferias'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Ferias);
    } catch (error) {
        console.error('Error fetching ferias:', error);
        return [];
    }
};

export const getFeriasByColaborador = async (colaboradorId: string): Promise<Ferias[]> => {
    try {
        const q = query(collection(db, 'ferias'), where('colaboradorId', '==', colaboradorId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Ferias);
    } catch (error) {
        console.error('Error fetching ferias by colaborador:', error);
        return [];
    }
};

export const saveFerias = async (ferias: Ferias): Promise<void> => {
    try {
        const feriados = await getFeriados();
        const validation = validateFerias(ferias, feriados);

        if (!validation.valid) {
            throw new Error(`Validação de férias inválida: ${validation.errors.join(' | ')}`);
        }

        const docRef = doc(db, 'ferias', ferias.id);
        const dataToSave = { ...ferias };
        
        if (!dataToSave.createdAt) {
            dataToSave.createdAt = new Date().toISOString();
        }
        dataToSave.updatedAt = new Date().toISOString();

        await setDoc(docRef, dataToSave);
    } catch (error) {
        console.error('Error saving ferias:', error);
        throw error;
    }
};

export const updateFeriasStatus = async (id: string, status: FeriasStatus): Promise<void> => {
    try {
        const docRef = doc(db, 'ferias', id);
        await updateDoc(docRef, {
            status,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating ferias status:', error);
        throw error;
    }
};

export const cancelFerias = async (id: string): Promise<void> => {
    try {
        await updateFeriasStatus(id, 'cancelado');
    } catch (error) {
        console.error('Error canceling ferias:', error);
        throw error;
    }
};
