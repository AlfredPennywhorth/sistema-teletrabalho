import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isWeekend } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../src/data/data_2026.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

// Group by date
const days: Record<string, any[]> = {};
data.forEach((entry: any) => {
    if (!days[entry.data]) days[entry.data] = [];
    days[entry.data].push(entry);
});

const holidays2026 = [
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-21',
    '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12',
    '2026-11-02', '2026-11-15', '2026-12-25'
];

console.log('--- Verification Report ---');

// Check Virginia's Vacations
const virginiaEntries = data.filter((e: any) => e.colaboradorId === 'virginia' && e.status === 'ferias');
const virginiaDates = virginiaEntries.map((e: any) => e.data).sort();
console.log(`Virginia has ${virginiaDates.length} vacation days.`);

const unexpectedVacation = virginiaDates.filter((d: string) => {
    const date = new Date(d);
    // Range 1
    const r1Start = new Date('2026-03-16');
    const r1End = new Date('2026-03-30');
    // Range 2
    const r2Start = new Date('2026-11-23');
    const r2End = new Date('2026-12-07');

    const inR1 = date >= r1Start && date <= r1End;
    const inR2 = date >= r2Start && date <= r2End;

    // We expect Virginia to be on vacation only in these ranges
    return !(inR1 || inR2);
});

if (unexpectedVacation.length > 0) {
    console.log('WARNING: Virginia has unexpected vacation days:', unexpectedVacation);
} else {
    console.log('Virginia vacation dates look correct (March and November/December).');
}

console.log('\nChecking Iuri Vacation Substitution Rules...');
// Check Iuri's Vacation Substitution
const iuriVacations = data.filter((e: any) => e.colaboradorId === 'iuri' && e.status === 'ferias');
const iuriDates = iuriVacations.map((e: any) => e.data);

if (iuriDates.length === 0) {
    console.log('NOTE: Iuri has no vacation days recorded in data_2026.json yet.');
} else {
    console.log(`Iuri has ${iuriDates.length} vacation days.`);
}

let errorCount = 0;
iuriDates.forEach((dateStr: string) => {
    // Check for weekends and holidays
    const date = new Date(dateStr);
    // Fix: isWeekend treats local time which might be tricky with YYYY-MM-DD which is UTC usually.
    // Ideally we append T12:00:00 to be safe or use parseISO.
    // date-fns parseISO is safer.
    // But verify_rules uses new Date(d) above.
    // verification script is running in node, so validation is fine.

    // date-fns 'isWeekend' works with Date object.
    // '2026-09-05' -> new Date('2026-09-05') depends on timezone offset in Node?
    // Usually it defaults to UTC, which is fine.
    // However, if we want to be safe, append T00:00:00.
    // But let's trust simple new Date for now as it's just a script.

    const isWknd = isWeekend(new Date(dateStr + 'T12:00:00')); // Force mid-day to avoid TZ issues
    const isHol = holidays2026.includes(dateStr);

    if (isWknd || isHol) {
        return; // Skip checks on non-working days
    }

    // For each day Iuri is on vacation, check if Carol is Presencial
    const dayEntries = days[dateStr];
    if (!dayEntries) {
        console.log(`DATA MISSING ERROR: ${dateStr} - No data found for this date!`);
        errorCount++;
        return;
    }
    const carolStat = dayEntries.find((e: any) => e.colaboradorId === 'carol');

    if (!carolStat || carolStat.status !== 'presencial') {
        console.log(`SUBSTITUTION ERROR: ${dateStr} - Iuri is on vacation but Carol is NOT Presencial!`);
        console.log(`  Carol status: ${carolStat ? carolStat.status : 'N/A'}`);
        errorCount++;
    }

    // Check total coverage (Should be at least 2 presencial: Carol + Rotation)
    const presencial = dayEntries.filter((e: any) => e.status === 'presencial');
    if (presencial.length < 2) {
        console.log(`COVERAGE ERROR: ${dateStr} - Potentially insufficient coverage! (Total Presencial: ${presencial.length})`);
        console.log('  Statuses:', dayEntries.map((e: any) => `${e.colaboradorId}:${e.status}`).join(', '));
        errorCount++;
    }
});

if (errorCount === 0 && iuriDates.length > 0) {
    console.log('SUCCESS: All substitution rules passed.');
} else if (iuriDates.length > 0) {
    console.log(`Found ${errorCount} errors.`);
}

console.log('Verification Complete.');
