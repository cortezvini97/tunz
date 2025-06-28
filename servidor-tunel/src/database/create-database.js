require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`✅ Banco de dados '${process.env.DB_NAME}' criado/verificado com sucesso`);
  } catch (error) {
    console.error('❌ Erro ao criar banco de dados:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  createDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = createDatabase;
