import 'dotenv/config';
import pg from 'pg'; // Importa o pacote 'pg'

const { Pool } = pg; // Desestrutura o Pool

// Exibe as variáveis de ambiente para verificar se estão sendo carregadas corretamente
// console.log('Configurações do Banco de Dados:');
// console.log('Host:', process.env.DB_HOST);
// console.log('Port:', process.env.DB_PORT);
// console.log('Database:', process.env.DB_PATH);
// console.log('User:', process.env.DB_USER);
// console.log('Password:', process.env.DB_PASS); // Mostre a senha apenas para debug, remova em produção

// Configurações de conexão para PostgreSQL
const pool = new Pool({
    host: 'node206951-uniclub.sp1.br.saveincloud.net.br', //10.100.45.238 IP SAVEINCLOUD
    port: '5432',
    database: 'uniclub',
    user: 'uniclub',
    password: '#abc123',
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
        console.log("Executing query:", ssql, "with parameters:", params); // Log da consulta
        const result = await client.query(ssql, params);
        
        if (result.rows.length === 0) {
            console.warn("Query returned no results."); // Aviso se não houver resultados
        } else {
            console.log("Query executed successfully. Number of rows returned:", result.rows.length); // Log de sucesso
        }

        return result.rows; // Retorna apenas as linhas do resultado
    } catch (err) {
        console.error('Erro na consulta:', err.message); // Log do erro com mensagem
        throw new Error('Database query failed: ' + err.message); // Lança um erro mais informativo
    } finally {
        client.release(); // Libera o cliente, independentemente de sucesso ou erro
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
