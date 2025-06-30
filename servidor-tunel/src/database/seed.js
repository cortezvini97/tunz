const User = require('../models/User');

async function seed() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');
    
    // Verificar se já existe usuário admin
    const adminExists = await User.findOne({ where: { email: process.env.ADMIN_EMAIL } });
    
    if (!adminExists) {
      await User.create({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        name: 'Administrador',
        role: 'admin',
        isActive: true,
      });
      console.log(`✅ Usuário admin criado: ${process.env.ADMIN_EMAIL}`);
    } else {
      console.log('ℹ️  Usuário admin já existe');
    }
    
    console.log('🎉 Seed concluído!');
    console.log('');
    console.log('📋 Credenciais de acesso:');
    console.log(`Email: ${process.env.ADMIN_EMAIL}`);
    console.log(`Senha: ${process.env.ADMIN_PASSWORD}`);
    console.log('');
  } catch (error) {
    console.error('❌ Erro no seed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seed;
