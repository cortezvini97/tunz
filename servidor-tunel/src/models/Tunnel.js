const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const User = require('./User');

const Tunnel = sequelize.define('Tunnel', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  protocol: {
    type: DataTypes.ENUM('http', 'https'),
    allowNull: false
  },
  localUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  publicUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('waiting', 'connected', 'disconnected'),
    defaultValue: 'waiting'
  },
  isCustomSlug: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  socketId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  connectedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  disconnectedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tunnels',
  timestamps: true
});

// Relacionamentos
Tunnel.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Tunnel, { foreignKey: 'userId', as: 'tunnels' });

module.exports = Tunnel;
