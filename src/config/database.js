import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Configurações de conexão para PostgreSQL usando variáveis de ambiente

const pool = new Pool({
    host: "node206951-uniclub.sp1.br.saveincloud.net.br",
    port: 11088,
    database: "uniclub",
    user: "uniclub",
    password: "#abc123",
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
    console.log("Executando consulta SQL:", ssql);
    console.log("Parâmetros da consulta:", params);
    
    const client = await pool.connect();
    try {
        const result = await client.query(ssql, params);
        
        if (result.rows.length === 0) {
            console.warn("Consulta não retornou resultados."); 
        } else {
            console.log("Consulta executada com sucesso. Resultados:", result.rows);
        }

        return result.rows; 
    } catch (err) {
        console.error('Erro na consulta:', err.message); 
        throw new Error('Erro na consulta ao banco de dados: ' + err.message); 
    } finally {
        client.release(); 
    }
}

// Função para escrever dados no banco de dados PostgreSQL
async function write(ssql, params) {
    console.log("Executando SQL de escrita:", ssql);
    console.log("Parâmetros da escrita:", params);
    
    const client = await pool.connect();
    try {
        const result = await client.query(ssql, params);
        console.log("Escrita executada com sucesso:", result);
        return result;
    } catch (err) {
        console.error('Erro na escrita:', err.message);
        throw new Error('Erro na escrita ao banco de dados: ' + err.message); 
    } finally {
        client.release();
    }
}

// Eventos adicionais de conexão do pool
pool.on('error', (err) => {
    console.error('Erro inesperado no pool:', err);
});

export { read, write };
