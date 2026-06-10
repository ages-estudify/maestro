require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'backend',
});

const userEmail = process.env.EMAIL;

if (!userEmail) {
  console.error("Erro: Variável EMAIL não fornecida no .env.");
  process.exit(1);
}

const query = `
DO $$
DECLARE
    target_user_id UUID;
    r RECORD;
    user_exists BOOLEAN;
BEGIN
    SELECT id, TRUE INTO target_user_id, user_exists FROM "User" WHERE email = $1;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Usuário com o email % não existe. Nenhuma ação foi realizada.', $1;
        RETURN;
    END IF;

    FOR r IN 
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
    LOOP
        EXECUTE format('DELETE FROM %I WHERE %I = $1', r.table_name, r.column_name) 
        USING target_user_id;
    END LOOP;

    DELETE FROM "User" WHERE id = target_user_id;
    
    RAISE NOTICE 'Usuário % e todos os seus dados correlacionados foram deletados.', $1;
END $$;
`;

async function run() {
  try {
    await client.connect();
    
    const result = await client.query(query, [userEmail]);
    
    if (result.notices && result.notices.length > 0) {
      result.notices.forEach(notice => console.log(`[BD]: ${notice.message}`));
    } else {
      console.log(`Processo finalizado para o e-mail: ${userEmail}`);
    }

  } catch (err) {
    console.error('Erro ao executar o script:', err.stack);
  } finally {
    await client.end();
  }
}

run();