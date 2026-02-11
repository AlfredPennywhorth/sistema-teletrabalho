
import { auth } from '../lib/firebase';

const PROJECT_ID = 'sistema-teletrabalho-v2';
const REGION = 'southamerica-east1';
const GLOBAL_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;
const REGIONAL_URL = `https://${REGION}-firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

// Helper to convert JS Object to Firestore Value
function toFirestoreValue(value: any): any {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { integerValue: value.toString() };
        return { doubleValue: value };
    }
    if (typeof value === 'string') return { stringValue: value };
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(toFirestoreValue) } };
    }
    if (typeof value === 'object') {
        const fields: any = {};
        for (const k in value) {
            fields[k] = toFirestoreValue(value[k]);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

export async function migrateViaRest(
    colaboradores: any[],
    feriados: any[],
    registros: any[],
    databaseId: string = '(default)',
    onProgress: (msg: string) => void
) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Usuário não autenticado.');

    const allWrites: any[] = [];
    // Dynamic URLs based on databaseId
    const GLOBAL_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${databaseId}/documents:commit`;
    const REGIONAL_URL = `https://${REGION}-firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${databaseId}/documents:commit`;
    const dbPath = `projects/${PROJECT_ID}/databases/${databaseId}/documents`;

    // Prepare Writes for Colaboradores
    colaboradores.forEach(c => {
        allWrites.push({
            update: {
                name: `${dbPath}/colaboradores/${c.id}`,
                fields: {
                    ...Object.keys(c).reduce((acc: any, key) => {
                        acc[key] = toFirestoreValue(c[key]);
                        return acc;
                    }, {})
                }
            }
        });
    });

    // Prepare Writes for Feriados
    feriados.forEach(f => {
        allWrites.push({
            update: {
                name: `${dbPath}/feriados/${f.id}`,
                fields: {
                    ...Object.keys(f).reduce((acc: any, key) => {
                        acc[key] = toFirestoreValue(f[key]);
                        return acc;
                    }, {})
                }
            }
        });
    });

    // Prepare Writes for Registros
    registros.forEach(r => {
        if (!r.id) return;
        allWrites.push({
            update: {
                name: `${dbPath}/registros/${r.id}`,
                fields: {
                    ...Object.keys(r).reduce((acc: any, key) => {
                        acc[key] = toFirestoreValue(r[key]);
                        return acc;
                    }, {})
                }
            }
        });
    });

    // Batch and Send
    const BATCH_SIZE = 450; // Max is 500
    const totalBatches = Math.ceil(allWrites.length / BATCH_SIZE);
    let useRegional = false;

    for (let i = 0; i < allWrites.length; i += BATCH_SIZE) {
        const batch = allWrites.slice(i, i + BATCH_SIZE);
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;

        onProgress(`Enviando via REST (Lote ${currentBatch}/${totalBatches})...`);

        // Try Global first, fallback to Regional if 404
        let currentUrl = useRegional ? REGIONAL_URL : GLOBAL_URL;

        try {
            console.log(`Tentando URL: ${currentUrl}`);
            let response = await fetch(currentUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ writes: batch })
            });

            // Handle Regional Fallback
            if (!response.ok && response.status === 404 && !useRegional) {
                console.warn('Global endpoint falhou (404). Tentando endpoint regional...');
                useRegional = true;
                currentUrl = REGIONAL_URL;
                response = await fetch(currentUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ writes: batch })
                });
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Erro REST (${response.status} em ${useRegional ? 'Regional' : 'Global'}): ${errText}`);
            }
        } catch (error: any) {
            throw error;
        }
    }

    onProgress('Sucesso! Todos os lotes enviados.');
}
