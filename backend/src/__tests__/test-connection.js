const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('Testing connection...');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: 3306,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('Connection successful!');
    await connection.end();
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();
