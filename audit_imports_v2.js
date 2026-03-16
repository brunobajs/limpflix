
import fs from 'fs';
import path from 'path';

const srcDir = './src';
const files = [];

function getFiles(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            getFiles(filePath);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            files.push(filePath);
        }
    });
}

getFiles(srcDir);

files.forEach(file => {
    if (file.includes('supabase.js')) return;
    const content = fs.readFileSync(file, 'utf8');
    
    // Procura por 'supabase.' que não seja precedido por 'import' ou 'from' no mesmo arquivo de forma válida
    const matches = content.match(/supabase\./g);
    if (matches) {
        const hasImport = content.includes('import { supabase }') || content.includes("import supabase") || content.includes('import {supabase}');
        if (!hasImport) {
            console.log(`[ALERT] Potential missing import in ${file}`);
            // Mostra a linha
            const lines = content.split('\n');
            lines.forEach((line, i) => {
                if (line.includes('supabase.')) {
                    console.log(`  L${i+1}: ${line.trim()}`);
                }
            });
        }
    }
});
