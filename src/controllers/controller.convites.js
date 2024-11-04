import { Router } from "express";
import { read, write } from '../config/database.js';
import { verify } from "../util/jwt.js";

const controllerConvites = Router();

controllerConvites.get("/convites", async function (req, res) {
    console.log("Requisição recebida para /convites");

    const token = req.headers['authorization'];
    const result = verify(token);

    if (!result) {
        console.log("Token inválido");
        return res.status(401).json({});
    } else {
        console.log("Token válido");

        const ssql = `SELECT c.id, c.numero_convite AS numero,
                      c.nome_convidado AS convidado,
                      cpf_convidado AS cpf, data_entrada AS data
                      FROM convites c
                      WHERE confirmacao_uso <> 'S' AND cod_associado = $1`;

        const filtro = [result['id']];

        try {
            const convites = await read(ssql, filtro);
            console.log("Consulta bem-sucedida, retornando resultados");
            return res.status(200).json(convites);
        } catch (err) {
            console.error("Erro ao consultar o banco de dados:", err);
            return res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
        }
    }
});

controllerConvites.post("/convites/envio", async function (req, res) {
    console.log("Requisição recebida para /convites/envio");

    const token = req.headers['authorization'];
    const result = verify(token);

    if (!result || !result['auth']) {
        console.log("Token inválido ou sem autorização");
        return res.status(401).json({});
    } else {
        console.log("Token válido e autorizado");

        try {
            // Verificação da quantidade de convites restantes
            const ssqlCheck = `SELECT 2 - COUNT(*) AS quantidade FROM convites c 
                               WHERE data_uso = CURRENT_DATE AND confirmacao_uso = 'S'
                               AND titulo_associado = (SELECT titulo_associado FROM convites WHERE id = $1 AND numero_convite = $2)`;
            const checkParams = [req.body.id, req.body.numero];
            const quantidadeResult = await read(ssqlCheck, checkParams);
            const quantidade = quantidadeResult[0]?.quantidade;

            if (quantidade === 0) {
                console.log("Nenhum convite disponível");
                return res.status(422).json([]);
            }

            // Atualização do convite para confirmar o uso
            const ssqlUpdate = `UPDATE convites SET confirmacao_uso = $1, data_uso = CURRENT_DATE, hora_uso = CURRENT_TIME
                                WHERE id = $2 AND numero_convite = $3
                                RETURNING titulo_associado`;
            const updateParams = ['S', req.body.id, req.body.numero];
            const updateResult = await write(ssqlUpdate, updateParams);
            const tituloAssociado = updateResult[0]?.titulo_associado;

            // Verificação final de quantidade de convites disponíveis
            const ssqlQuantidade = `SELECT 2 - COUNT(*) AS quantidade FROM convites c
                                    WHERE data_uso = CURRENT_DATE AND confirmacao_uso = 'S'
                                    AND titulo_associado = $1`;
            const quantidadeParams = [tituloAssociado];
            const finalQuantidadeResult = await read(ssqlQuantidade, quantidadeParams);

            console.log("Consulta finalizada, retornando quantidade disponível");
            return res.status(200).json(finalQuantidadeResult[0]);
        } catch (err) {
            console.error("Erro ao processar a requisição:", err);
            return res.status(500).json({ error: 'Erro ao processar a requisição.' });
        }
    }
});

export default controllerConvites;
