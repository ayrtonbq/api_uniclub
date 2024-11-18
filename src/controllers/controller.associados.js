import { read, write } from '../config/database.js';
import { sign, verify } from "../util/jwt.js"

const app = express();

app.get('/associados', async (req, res) => {
    try {
        // Defina sua query para selecionar todos os registros da tabela 'associado'
        const ssql = `SELECT * FROM associado;`;

        // Execute a query sem parâmetros (pois estamos pegando todos os registros)
        const result = await read(ssql, []);

        // Retorna os dados encontrados
        res.status(200).json(result);
    } catch (err) {
        // Em caso de erro, retorna uma resposta de erro
        res.status(500).json({ error: 'Erro ao acessar o banco de dados!', details: err });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
