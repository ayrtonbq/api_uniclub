import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Configurações de conexão para PostgreSQL usando variáveis de ambiente
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_PATH,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    max: 10,
    idleTimeoutMillis: 30000,
});

// Verifica a conexão logo após configurar o pool
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
    } else {
        console.log('Conectado ao banco de dados com sucesso!');
        client.release(); 
    }
});

// Função para ler dados do banco de dados PostgreSQL
async function read(ssql, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(ssql, params);
        
        if (result.rows.length === 0) {
            console.warn("Query returned no results."); 
        } else {
        }

        return result.rows; 
    } catch (err) {
        console.error('Erro na consulta:', err.message); 
        throw new Error('Database query failed: ' + err.message); 
    } finally {
        client.release(); 
    }
}

// Função para escrever dados no banco de dados PostgreSQL
async function write(ssql, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(ssql, params);
        return result;
    } catch (err) {
        throw err; // Lançar o erro para tratamento posterior
    } finally {
        client.release();
    }
}

export { read, write };
