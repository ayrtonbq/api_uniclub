import { read, write } from '../config/database.js';
import { sign, verify } from "../util/jwt.js"

const app = express();

app.get('/associados', async (req, res) => {
    try {
        const ssql = `SELECT * FROM associado;`;
        const result = await read(ssql, []);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao acessar o banco de dados!', details: err });
    }
});

// Inicie o servidor (porta 3000 por exemplo)
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
