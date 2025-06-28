const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar se as colunas já existem antes de adicionar
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.resetPasswordToken) {
      await queryInterface.addColumn('users', 'resetPasswordToken', {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    
    if (!tableDescription.resetPasswordExpires) {
      await queryInterface.addColumn('users', 'resetPasswordExpires', {
        type: DataTypes.DATE,
        allowNull: true
      });
    }
    
    console.log('✅ Campos de reset de senha adicionados à tabela users');
  },

  down: async (queryInterface, Sequelize) => {
    // Verificar se as colunas existem antes de remover
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.resetPasswordExpires) {
      await queryInterface.removeColumn('users', 'resetPasswordExpires');
    }
    
    if (tableDescription.resetPasswordToken) {
      await queryInterface.removeColumn('users', 'resetPasswordToken');
    }
    
    console.log('✅ Campos de reset de senha removidos da tabela users');
  }
};
