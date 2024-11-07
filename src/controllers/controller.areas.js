import { Router } from "express";
import { read, write } from '../config/database.js';
import { verify } from "../util/jwt.js";

const controllerAreas = Router();

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    const result = verify(token);
    if (!result) {
        return res.status(401).json({ error: "Token inválido" });
    }
    req.user = result; // Salva os dados do usuário no objeto `req`
    next();
};

// Rota para buscar áreas disponíveis
controllerAreas.post("/areas", verifyToken, async function (req, res) {
    console.log("Requisição recebida para /areas");

    // Validação do corpo da requisição
    if (!req.body.data) {
        return res.status(400).json({ error: "Data é obrigatória" });
    }

    const ssql = `
        SELECT a.id, a.descricao 
        FROM area a 
        WHERE NOT EXISTS (
            SELECT 1 
            FROM area_reserva ar 
            WHERE a.id = ar.id_area AND ar.data = $1
        )`;
    const filtro = [req.body.data];

    try {
        const areasDisponiveis = await read(ssql, filtro);
        return res.status(200).json(areasDisponiveis);
    } catch (err) {
        console.error("Erro ao consultar o banco de dados:", err);
        return res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
    }
});

// Rota para obter áreas reservadas
controllerAreas.get("/areas/reservado", verifyToken, async function (req, res) {
    const ssql = `
        SELECT a.id, a.descricao, ar.data 
        FROM area a 
        INNER JOIN area_reserva ar ON a.id = ar.id_area 
        WHERE ar.id_associado = $1 AND ar.data >= CURRENT_DATE
    `;
    const filtro = [req.user['id']];

    try {
        const areasReservadas = await read(ssql, filtro);
        return res.status(200).json(areasReservadas);
    } catch (err) {
        console.error("Erro ao consultar o banco de dados:", err);
        return res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
    }
});

// Rota para enviar reserva de área
controllerAreas.post("/areas/envio", verifyToken, async function (req, res) {
    // Validação do corpo da requisição
    if (!req.body.area || !req.body.data) {
        return res.status(400).json({ error: "Área e data são obrigatórios" });
    }

    const ssql = `
        INSERT INTO area_reserva (id_area, data, id_associado)
        VALUES ($1, $2, $3)
    `;
    const filtro = [req.body.area, req.body.data, req.user['id']];

    try {
        await write(ssql, filtro);
        return res.status(200).json({ message: 'Reserva realizada com sucesso.' });
    } catch (err) {
        console.error("Erro ao processar a reserva:", err);
        return res.status(500).json({ error: 'Erro ao processar a reserva.' });
    }
});

// Rota para obter detalhes de uma área específica
controllerAreas.get("/areas/:id", verifyToken, async function (req, res) {
    const filtro = [req.params.id];
    const ssql = `
        SELECT a.*, ae.descricao AS equipamento, ae.quantidade, encode(a.foto, 'hex') AS foto 
        FROM area a
        LEFT JOIN area_equipamentos ae ON a.id = ae.id_area
        WHERE a.id = $1
    `;

    try {
        const areaDetalhes = await read(ssql, filtro);

        if (areaDetalhes.length === 0) {
            return res.status(404).json({ error: 'Área não encontrada.' });
        }

        const area = {
            id: areaDetalhes[0]['id'],
            descricao: areaDetalhes[0]['descricao'],
            foto: areaDetalhes[0]['foto'], // Foto como HEX
            equipamentos: areaDetalhes
                .filter(element => element['equipamento'] !== null)
                .map(element => ({
                    descricao: element['equipamento'],
                    quantidade: element['quantidade'],
                }))
        };

        return res.status(200).json(area);
    } catch (err) {
        console.error("Erro ao consultar a área:", err);
        return res.status(500).json({ error: 'Erro ao consultar a área.' });
    }
});

export default controllerAreas;
