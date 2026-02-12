
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isWeekend, format, parseISO } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../src/data/data_2026.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawData);

const carolVacations = data.filter((e: any) => e.colaboradorId === 'carol' && e.status === 'ferias');
const dates = carolVacations.map((e: any) => e.data).sort();

console.log(`Total Vacation Days for Carol: ${dates.length}`);

// Holidays used in generation (checking directly what was likely used)
const holidays2026 = [
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-21',
    '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12',
    '2026-11-02', '2026-11-15', '2026-12-25'
];

let workingDaysCount = 0;
let weekendCount = 0;
let holidayCount = 0;

dates.forEach((dateStr: string) => {
    const isW = isWeekend(new Date(dateStr + 'T12:00:00'));
    const isH = holidays2026.includes(dateStr);

    let type = 'Work Day';
    if (isH) {
        type = 'Holiday';
        holidayCount++;
    } else if (isW) {
        type = 'Weekend';
        weekendCount++;
    } else {
        workingDaysCount++;
    }

    console.log(`${dateStr}: ${type}`);
});

console.log(`\nSummary:`);
console.log(`Working Days consumed: ${workingDaysCount}`);
console.log(`Weekends: ${weekendCount}`);
console.log(`Holidays: ${holidayCount}`);
console.log(`Total entries: ${dates.length}`);

if (workingDaysCount > 30) {
    console.log('\nWARNING: Consumed more than 30 working days!');
} else {
    console.log('\nOK: Consumed 30 or fewer working days.');
}
