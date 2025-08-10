const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/whatsapp_enterprise.sqlite');
const db = new sqlite3.Database(dbPath);

function listTablesAndData() {
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
    if (err) {
      console.error('Erro ao listar tabelas:', err);
      db.close();
      return;
    }
    if (!tables.length) {
      console.log('Nenhuma tabela encontrada.');
      db.close();
      return;
    }
    console.log('Tabelas encontradas:', tables.map(t => t.name));
    let pending = tables.length;
    tables.forEach(table => {
      db.all(`SELECT * FROM ${table.name} LIMIT 5`, (err, rows) => {
        if (err) {
          console.error(`Erro ao consultar tabela ${table.name}:`, err);
        } else {
          console.log(`\nTabela: ${table.name}`);
          if (rows.length === 0) {
            console.log('  (sem dados)');
          } else {
            rows.forEach((row, i) => {
              console.log(`  Registro ${i + 1}:`, row);
            });
          }
        }
        if (--pending === 0) db.close();
      });
    });
  });
}

listTablesAndData();
