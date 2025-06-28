const sequelize = require('./connection');
const User = require('../models/User');
const Tunnel = require('../models/Tunnel');

async function migrate() {
  try {
    console.log('🔄 Iniciando migração do banco de dados...');
    
    // Testar conexão
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida');
    
    // Sincronizar modelos (criar tabelas)
    await sequelize.sync({ force: false });
    console.log('✅ Tabelas criadas/sincronizadas com sucesso');
    
    console.log('🎉 Migração concluída!');
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    throw error;
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
