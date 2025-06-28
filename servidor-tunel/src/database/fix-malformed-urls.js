const sequelize = require('../database/connection');
const Tunnel = require('../models/Tunnel');

async function fixMalformedUrls() {
  try {
    console.log('🔧 Procurando URLs malformadas...');
    
    // Buscar todos os túneis
    const tunnels = await Tunnel.findAll();
    
    let fixed = 0;
    for (const tunnel of tunnels) {
      const localUrl = tunnel.localUrl;
      
      // Verificar se a URL está malformada (http:localhost em vez de http://localhost)
      if (localUrl && (localUrl.includes('http:localhost') || localUrl.includes('https:localhost'))) {
        const fixedUrl = localUrl.replace('http:localhost', 'http://localhost').replace('https:localhost', 'https://localhost');
        
        console.log(`📝 Corrigindo: ${localUrl} -> ${fixedUrl}`);
        
        await Tunnel.update(
          { localUrl: fixedUrl },
          { where: { id: tunnel.id } }
        );
        
        fixed++;
      }
    }
    
    if (fixed > 0) {
      console.log(`✅ ${fixed} URLs corrigidas! Reinicie o servidor para aplicar as mudanças.`);
    } else {
      console.log('✅ Nenhuma URL malformada encontrada.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao corrigir URLs:', error.message);
    process.exit(1);
  }
}

fixMalformedUrls();
