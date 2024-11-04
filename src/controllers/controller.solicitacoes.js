import { Router } from "express";
import { read, write } from '../config/database.js';
import { verify } from "../util/jwt.js";
import multer from "multer";


const controllerSolicitacoes = Router();
const upload = multer();

controllerSolicitacoes.post("/termo/envio", upload.single('assinatura'), function (req, res) {

    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result || !result['auth']) {
        res.status(401).json({});
    } else {

        let filtro = [];

        let ssql = `insert into termo_responsabilidade(id_associado, titulo, data, hora, assinatura, 
            nome_menores, parentesco) values (?, ?, current_date, current_time, ?, ?, ?)`;

        filtro = [req.body.id, req.body.titulo, req.file['buffer'], req.body.nome, req.body.parentesco];

        write(ssql, filtro, function (err, result) {
            if (err) {
                res.status(500).json(err);
            } else {
                res.status(200).json(result);
            }
        });
    }

});

controllerSolicitacoes.get("/solicitacoes/tipo", function (req, res) {

    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result || !result['auth']) {
        res.status(401).json({});
    } else {

        let filtro = [];
        let ssql = `select ts.codigo, ts.descricao from tipo_solicitacao ts`;

        read(ssql, filtro, function (err, result) {
            if (err) {
                res.status(500).json(err);
            } else {
                res.status(200).json(result);
            }
        });
    }

});

controllerSolicitacoes.get("/solicitacoes/tipo/:tipo", function (req, res) {

    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result || !result['auth']) {
        res.status(401).json({});
    } else {

        let filtro = [];
        let ssql = `select tsi.codigo, tsi.descricao, true as marcado from tipo_solicitacao_item tsi
        where tsi.cod_tipo = ? order by codigo asc`;

        filtro.push(req.params.tipo);

        read(ssql, filtro, function (err, result) {
            if (err) {
                res.status(500).json(err);
            } else {
                res.status(200).json(result);
            }
        });
    }

});

controllerSolicitacoes.get("/solicitacoes/:codigo", function (req, res) {

    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result || !result['auth']) {
        res.status(401).json({});
    } else {

        let filtro = [];
        let ssql = `select s.codigo, s.descricao, cast(s.data_i||' '||s.hora_i as timestamp) as data,
        assinatura_i as assinaturaEntrada, ts.codigo as cod_tipo, ts.descricao as tipo, si.marcado 
        from solicitacao s
        inner join solicitacaoitem si on s.codigo = si.cod_solicitacao
        inner join tipo_solicitacao_item ts on si.cod_item = ts.codigo
        where s.codigo = ?`;

        filtro.push(req.params.codigo);

        read(ssql, filtro, function (err, result) {
            if (err) {
                res.status(500).json(err);
            } else {
                let solicitacao = {};
                solicitacao['codigo'] = result[0]['codigo'];
                solicitacao['descricao'] = result[0]['descricao'];
                solicitacao['data'] = result[0]['data'];
                solicitacao['assinaturaEntrada'] = result[0]['assinaturaentrada'];
                solicitacao['entrada'] = [];
                solicitacao['saida'] = [];
                for (let i = 0; i < result.length; i++) {
                    let itemEntrada = {};
                    let itemSaida = {};
                    itemEntrada['codigo'] = result[i]['cod_tipo'];
                    itemEntrada['descricao'] = result[i]['tipo'];
                    if (result[i]['marcado'] == 1) {
                        itemEntrada['marcado'] = true;
                    } else {
                        itemEntrada['marcado'] = false;
                    }
                    itemSaida['codigo'] = result[i]['cod_tipo'];
                    itemSaida['descricao'] = result[i]['tipo'];
                    itemSaida['marcado'] = true;
                    solicitacao['entrada'].push(itemEntrada);
                    solicitacao['saida'].push(itemSaida);
                }
                res.status(200).json(solicitacao);
            }
        });
    }

});

controllerSolicitacoes.post("/solicitacoes/envio", function (req, res) {

    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result || !result['auth']) {
        res.status(401).json({});
    } else {

        let filtro = [];
        let itens = req.body.entrada;

        let ssql = `insert into solicitacao(id, titulo, descricao, data_i, hora_i, assinatura_i)
        values (?, ?, ?, current_date, current_time, ?) returning codigo, descricao, 
        cast(data_i||' '||hora_i as timestamp) as data`;

        filtro = [req.body.id, req.body.titulo, req.body.descricao, Buffer.from(req.body.assinaturaEntrada)];

        write(ssql, filtro, function (err, result) {
            if (err) {
                res.status(500).json(err);
            } else {
                let codigo = result['codigo'];
                for (let i = 0; i < itens.length; i++) {
                    let ssql = `insert into solicitacaoitem(cod_solicitacao, cod_item, tipo, marcado)
                    values (?, ?, ?, ?)`;

                    let filtro = [codigo, itens[i]['codigo'], 'I', itens[i]['marcado']];
                    write(ssql, filtro, function (err, result) { });
                }
                res.status(200).json(result);
            }
        });
    }

});

controllerSolicitacoes.post("/solicitacoes/finalizar", function (req, res) {

    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result || !result['auth']) {
        res.status(401).json({});
    } else {

        let filtro = [];
        let itens = req.body.saida;

        let ssql = `update solicitacao set data_o = current_date, hora_o = current_time, 
        assinatura_o = ?, observacao = ? where codigo = ?`;

        filtro = [Buffer.from(req.body.assinaturaSaida), req.body.observacao, req.body.codigo];

        write(ssql, filtro, function (err, result) {
            if (err) {
                res.status(500).json(err);
            } else {
                for (let i = 0; i < itens.length; i++) {
                    let ssql = `insert into solicitacaoitem(cod_solicitacao, cod_item, tipo, marcado)
                    values (?, ?, ?, ?) `;

                    let filtro = [req.body.codigo, itens[i]['codigo'], 'O', itens[i]['marcado']];
                    write(ssql, filtro, function (err, result) { });
                }
                res.status(200).json({});
            }
        });
    }

});


export default controllerSolicitacoes;