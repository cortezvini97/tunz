const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se as colunas já existem antes de tentar adicioná-las
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.twoFASecret) {
      await queryInterface.addColumn('users', 'twoFASecret', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Secret key para autenticação de dois fatores'
      });
    }

    if (!tableDescription.twoFAEnabled) {
      await queryInterface.addColumn('users', 'twoFAEnabled', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Indica se o 2FA está habilitado para o usuário'
      });
    }

    if (!tableDescription.twoFABackupCodes) {
      await queryInterface.addColumn('users', 'twoFABackupCodes', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Códigos de backup para 2FA (JSON array)'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'twoFASecret');
    await queryInterface.removeColumn('users', 'twoFAEnabled');
    await queryInterface.removeColumn('users', 'twoFABackupCodes');
  }
};
