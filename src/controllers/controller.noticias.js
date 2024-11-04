import { Router } from "express";
import { read } from '../config/database.js';
import { verify } from "../util/jwt.js";

const controllerNoticias = Router();

controllerNoticias.get("/noticias", async function (req, res) {
    console.log("Requisição recebida para /noticias");
    
    const token = req.headers['authorization'];
    console.log("Received token:", token); // Log do token recebido

    let result = verify(token);
    if (!result) {
        console.log("Token inválido");
        return res.status(401).json({});
    } else {
        console.log("Token válido");

        // Consulta SQL para obter as 10 primeiras notícias
        let ssql = `SELECT n.id, n.titulo, n.descricao, encode(n.foto, 'hex') AS foto
                    FROM noticia n 
                    ORDER BY data DESC 
                    LIMIT 10`;

        try {
            const noticias = await read(ssql, []); // Chamada da função read sem parâmetros
            console.log("Consulta bem-sucedida, retornando resultados");
            return res.status(200).json(noticias);
        } catch (err) {
            console.error("Erro ao consultar o banco de dados:", err); // Log do erro
            return res.status(500).json({ error: 'Erro ao consultar o banco de dados.' }); // Mensagem de erro mais clara
        }
    }
});


export default controllerNoticias;
