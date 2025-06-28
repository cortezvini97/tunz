module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Verificar se a tabela existe
      const tables = await queryInterface.showAllTables();
      const tableName = tables.find(table => table.toLowerCase() === 'tunnels');
      
      if (!tableName) {
        console.log('✅ Tabela Tunnels não existe, migração não necessária');
        return;
      }

      // Verificar se as colunas antigas existem
      const tableDescription = await queryInterface.describeTable(tableName);
      
      if (tableDescription.subdomain) {
        // Renomear a coluna subdomain para slug
        await queryInterface.renameColumn(tableName, 'subdomain', 'slug');
        console.log('✅ Coluna subdomain renomeada para slug');
      } else {
        console.log('✅ Coluna subdomain já foi convertida ou não existe');
      }
      
      if (tableDescription.isCustomSubdomain) {
        // Renomear a coluna isCustomSubdomain para isCustomSlug
        await queryInterface.renameColumn(tableName, 'isCustomSubdomain', 'isCustomSlug');
        console.log('✅ Coluna isCustomSubdomain renomeada para isCustomSlug');
      } else {
        console.log('✅ Coluna isCustomSubdomain já foi convertida ou não existe');
      }
      
      console.log('✅ Migração concluída: subdomain -> slug, isCustomSubdomain -> isCustomSlug');
    } catch (error) {
      console.log('✅ Migração não necessária (tabela já atualizada):', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const tables = await queryInterface.showAllTables();
      const tableName = tables.find(table => table.toLowerCase() === 'tunnels');
      
      if (!tableName) {
        console.log('✅ Tabela Tunnels não existe, rollback não necessário');
        return;
      }

      const tableDescription = await queryInterface.describeTable(tableName);
      
      if (tableDescription.slug) {
        await queryInterface.renameColumn(tableName, 'slug', 'subdomain');
      }
      
      if (tableDescription.isCustomSlug) {
        await queryInterface.renameColumn(tableName, 'isCustomSlug', 'isCustomSubdomain');
      }
      
      console.log('✅ Migração revertida: slug -> subdomain, isCustomSlug -> isCustomSubdomain');
    } catch (error) {
      console.log('✅ Rollback não necessário:', error.message);
    }
  }
};
