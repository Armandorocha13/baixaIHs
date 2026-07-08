const XLSX = require('xlsx');

const wb = XLSX.readFile('Acompanhamento de baixa - MODENS IHS.xlsx');
const sheet = wb.Sheets['BAIXA'];
const rows = XLSX.utils.sheet_to_json(sheet);

// Count by estado
const estadoCount = {};
const projetoByEstado = {};

rows.forEach(row => {
  const estado = row.ESTADO ? String(row.ESTADO).trim().toUpperCase() : 'VAZIO';
  estadoCount[estado] = (estadoCount[estado] || 0) + 1;
  
  const projeto = row.PROJETO ? String(row.PROJETO).trim() : 'SEM PROJETO';
  if (!projetoByEstado[estado]) projetoByEstado[estado] = new Set();
  projetoByEstado[estado].add(projeto);
});

console.log('=== Contagem por ESTADO na planilha ===');
Object.entries(estadoCount).forEach(([k,v]) => console.log('  ' + k + ': ' + v));

console.log('\n=== Projetos por ESTADO ===');
Object.entries(projetoByEstado).forEach(([estado, projetos]) => {
  console.log('  ' + estado + ':');
  projetos.forEach(p => console.log('    - ' + p));
});

console.log('\nTotal de linhas: ' + rows.length);
