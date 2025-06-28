const fs = require('fs');
const path = require('path');
const sequelize = require('./connection');

async function runMigrations() {
  try {
    console.log('🔄 Executando migrations...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    for (const file of migrationFiles) {
      console.log(`📁 Executando migration: ${file}`);
      
      const migration = require(path.join(migrationsDir, file));
      
      if (migration.up) {
        await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
        console.log(`✅ Migration ${file} executada com sucesso`);
      }
    }
    
    console.log('🎉 Todas as migrations foram executadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🏁 Processo concluído');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha no processo:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
