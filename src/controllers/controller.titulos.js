import { Router } from "express";
import { read, write } from '../config/database.js';
import { verify } from "../util/jwt.js";

const controllerTitulos = Router();

controllerTitulos.get("/titulo", async function (req, res) {
    const token = req.headers['authorization'];
    console.log("Received token:", token); // Log do token recebido

    let result = verify(token);

    if (!result) {
        console.log("Token verification failed."); // Log se a verificação falhar
        return res.status(401).json({});
    }

    let filtro = [];
    let ssql = `SELECT a.id FROM associado a WHERE titulo = $1 AND ativo = 'S'`;

    filtro.push(result['titulo']);
    console.log("Filter for ID selection:", filtro); // Log dos filtros

    try {
        const idResult = await read(ssql, filtro);
        console.log("ID read result:", idResult); // Log do resultado da leitura

        let id = idResult[0] ? idResult[0]['id'] : null;

        if (id == null) {
            console.log("No ID found or an error occurred."); // Log se não encontrar ID
            return res.status(500).json({});
        }

        // Preparar e executar a segunda consulta
        filtro = [];
        ssql = `
            SELECT a.id, a.titulo, CAST(a.digito AS INTEGER) AS digito,
            CASE WHEN (a.codtiposocio = 3) THEN 0 ELSE 1 END AS categoria,
            a.nome, ts.descricao AS tipo, a.cpf, a.foto,
            CASE WHEN (
                (SELECT MAX(r.validade) FROM recebimentos_titulo r 
                 WHERE r.cod_cliente_associado = a.id AND r.pagamento IS NOT NULL) >= CURRENT_DATE
                 OR a.codtiposocio IN (4, 5)) 
                THEN 1 ELSE 0 END AS situacao,
            CASE WHEN (
                (SELECT COUNT(p.id) FROM presenca p 
                 WHERE p.id = a.id AND p.titulo = a.titulo 
                 AND p.digito = a.digito AND data = CURRENT_DATE) > 0) 
                THEN TRUE ELSE FALSE END AS presenca
            FROM associado a 
            INNER JOIN tiposocio ts ON a.codtiposocio = ts.codtiposocio 
            WHERE a.ativo = 'S' AND a.titulo = $1
            GROUP BY a.id, a.titulo, a.digito, a.cpf, a.foto, a.nome, a.codtiposocio, tipo`;

        filtro.push(result['titulo']); // Isso pode precisar ser ajustado
        console.log("Filter for title selection:", filtro); // Log dos filtros para a segunda consulta

        const titleResult = await read(ssql, filtro);
        console.log("Title data read result:", titleResult); // Log do resultado da leitura

        let titulo = {};
        for (const element of titleResult) {
            if (element['situacao'] != null) {
                titulo['numero'] = element['titulo'];
                titulo['situacao'] = element['situacao'];
                titulo['titular'] = element;
                titulo['dependentes'] = []; // Você pode decidir se deseja manter ou remover isso
            }
        }
        console.log("Final title object:", titulo); // Log do objeto título final
        return res.status(200).json(titulo);
    } catch (err) {
        console.error("Error during processing:", err); // Log do erro
        return res.status(500).json(err);
    }
});



controllerTitulos.get("/titulos", function (req, res) {
    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result || !result['auth']) {
        return res.status(401).json({});
    }

    let filtro = [];
    let page = (req.query.page === undefined) ? 0 : (req.query.page - 1) * 20;

    let ssql = `
        SELECT a.id, a.titulo, a.nome, ts.descricao AS tipo,
        CASE WHEN (
            (SELECT MAX(r.validade) FROM recebimentos_titulo r 
             WHERE r.cod_cliente_associado = a.id AND r.pagamento IS NOT NULL) >= CURRENT_DATE
             OR a.codtiposocio IN (4, 5)) 
            THEN 1 ELSE 0 END AS situacao
        FROM associado a
        INNER JOIN tiposocio ts ON a.codtiposocio = ts.codtiposocio
        WHERE a.ativo = 'S' 
        LIMIT 20 OFFSET $1`;

    filtro.push(page);

    if (req.query.pesquisa !== undefined) {
        filtro.push('%' + req.query.pesquisa + '%');
        ssql += ` AND a.nome ILIKE $2`;
    }

    read(ssql, filtro, function (err, result) {
        if (err) {
            return res.status(500).json(err);
        } else {
            return res.status(200).json(result);
        }
    });
});

controllerTitulos.get("/titulo/:titulo/", async function (req, res) {
    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result || !result['auth']) {
        return res.status(401).json({});
    }

    let id = [];
    let filtro = [];
    let ssql;

    ssql = `SELECT a.id FROM associado a WHERE titulo = $1 AND ativo = 'S'`;
    filtro.push(req.params.titulo);

    if (req.query.id !== undefined) {
        ssql += ` AND id = $2`;
        filtro.push(req.query.id);
    }

    ssql += ` ORDER BY codtiposocio`;

    await new Promise((resolve, reject) => read(ssql, filtro, function (err, result) {
        if (err) {
            reject(err);
        } else {
            resolve(result);
        }
    })).then(result => {
        for (const element of result) {
            id.push(element['id']);
        }
    })
    .catch(err => id = null);

    if (id == null) {
        return res.status(500).json({});
    } else {
        await new Promise(async (resolve, reject) => {
            let titulos = [];

            for (const element of id) {
                ssql = `
                    SELECT a.id, a.titulo, CAST(a.digito AS INTEGER) AS digito, 
                    1 AS categoria, a.nome, ts.descricao AS tipo, a.cpf, a.foto, 
                    CASE WHEN (
                        (SELECT MAX(r.validade) FROM recebimentos_titulo r 
                         WHERE r.cod_cliente_associado = a.id AND r.pagamento IS NOT NULL) >= CURRENT_DATE
                         OR a.codtiposocio IN (4, 5)) 
                        THEN 1 ELSE 0 END AS situacao,
                    CASE WHEN (
                        (SELECT COUNT(p.id) FROM presenca p 
                         WHERE p.id = a.id AND p.titulo = a.titulo 
                         AND p.digito = a.digito AND data = CURRENT_DATE) > 0) 
                        THEN TRUE ELSE FALSE END AS presenca
                    FROM associado a 
                    INNER JOIN tiposocio ts ON a.codtiposocio = ts.codtiposocio 
                    WHERE a.ativo = 'S' AND a.id = $1 AND a.titulo = $2
                    GROUP BY a.id, a.titulo, a.digito, a.cpf, a.foto, a.nome, a.codtiposocio, tipo`;

                let titulo = {};
                filtro = [element, req.params.titulo];

                await new Promise((resolve, reject) =>
                    read(ssql, filtro, function (err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            for (const element of result) {
                                if (element['categoria'] == 1) {
                                    titulo['numero'] = element['titulo'];
                                    titulo['situacao'] = element['situacao'];
                                    titulo['titular'] = element;
                                    titulo['dependentes'] = []; // Você pode decidir se deseja manter ou remover isso
                                }
                            }
                            resolve();
                        }
                    })).then(() => { }).catch(err => reject(err));
            }

            resolve(titulos);
        }).then(titulos => {
            if (titulos.length == 0) {
                return res.status(404).json({});
            } else {
                return res.status(200).json(titulos);
            }
        }).catch(err => res.status(500).json(err));
    }
});

controllerTitulos.post("/presenca/envio", function (req, res) {
    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result) {
        return res.status(401).json({});
    }

    let filtro = [];
    if (req.body.presenca) {
        let ssql = `
            INSERT INTO presenca(id, titulo, digito, data, hora)
            VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_TIME) 
            RETURNING TRUE AS presenca`;

        filtro = [req.body.id, req.body.titulo, req.body.digito];

        write(ssql, filtro, function (err, result) {
            if (err) {
                return res.status(500).json(err);
            } else {
                return res.status(200).json(result);
            }
        });
    } else {
        let ssql = `
            DELETE FROM presenca 
            WHERE id = $1 AND titulo = $2 AND digito = $3 AND data = CURRENT_DATE 
            RETURNING FALSE AS presenca`;

        filtro = [req.body.id, req.body.titulo, req.body.digito];

        write(ssql, filtro, function (err, result) {
            if (err) {
                return res.status(500).json(err);
            } else {
                return res.status(200).json(result);
            }
        });
    }
});

export default controllerTitulos;
