const { Client } = require('pg');
require('dotenv').config();

async function deleteUser(email) {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'backend',
  });

  try {
    await client.connect();

    // 1. Get user by email
    const userRes = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.log(`[BD]: Usuário com o email ${email} não existe. Nenhuma ação foi realizada.`);
      return { success: true, message: 'User not found' };
    }

    const userId = userRes.rows[0].id;
    console.log(`[BD]: Encontrado usuário ID ${userId} para o email ${email}. Removendo referências...`);

    // 2. Find referencing tables
    const refTablesQuery = `
      SELECT 
          tc.table_name, 
          kcu.column_name
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE 
          tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'User'
          AND ccu.column_name = 'id'
    `;
    const refRes = await client.query(refTablesQuery);

    // 3. Delete from each referencing table
    for (const row of refRes.rows) {
      const { table_name, column_name } = row;
      console.log(`[BD]: Removendo de ${table_name} onde ${column_name} = ${userId}`);
      // Use double quotes for table and column names to handle mixed case/identifiers correctly
      await client.query(`DELETE FROM "${table_name}" WHERE "${column_name}" = $1`, [userId]);
    }

    // 4. Delete the user itself
    await client.query('DELETE FROM "User" WHERE id = $1', [userId]);
    console.log(`[BD]: Usuário ${email} e todos os seus dados correlacionados foram deletados.`);
    return { success: true, message: 'User deleted successfully' };

  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    throw err;
  } finally {
    await client.end();
  }
}

// Support running directly from command line
if (require.main === module) {
  const userEmail = process.env.EMAIL;
  if (!userEmail) {
    console.error("Erro: Variável EMAIL não fornecida no .env.");
    process.exit(1);
  }
  deleteUser(userEmail).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { deleteUser };
