import { Router } from "express";
import { read, write } from '../config/database.js';
import { sign, verify } from "../util/jwt.js"

const controllerFuncionarios = Router();

controllerFuncionarios.post("/funcionarios/login", function (req, res) {

    const token = req.headers['authorization'];
    if (!token) {

        let ssql = `select u.id, u.usuario from usuario u where u.usuario = ? and u.senha = ?`;
        let filtro = [];

        filtro = [req.body.login, req.body.senha];

        read(ssql, filtro, function (err, result) {

            if (err) {
                res.status(500).json(err);
            } else {

                if (result.length == 0) {
                    res.status(401).json({});
                } else {
                    result[0]['token'] = sign({
                        "id": result[0]['id'],
                        "auth": true
                    });
                    res.status(200).json(result[0]);

                    let ssql = `insert into acesso (usuario, data, hora) values 
                    (?, current_date, current_time) `;
                    let filtro = [];

                    filtro.push(result[0]['id']);

                    write(ssql, filtro, function (err, result) { });
                }
            }

        });
    } else {


        let ssql = `select u.id, u.usuario from usuario u where u.id = ?`;
        let filtro = [];

        let result = verify(token);

        if (!result) {
            res.status(401).json({});
        } else {

            filtro = [result['id']];

            read(ssql, filtro, function (err, result) {

                if (err) {
                    res.status(500).json(err);
                } else {
                    if (result.length == 0) {
                        res.status(401).json({});
                    } else {
                        result[0]['token'] = sign({
                            "id": result[0]['id'],
                            "auth": true
                        });
                        res.status(200).json(result[0]);

                        let ssql = `insert into acesso (usuario, data, hora) values
                        (?, current_date, current_time) `;
                        let filtro = [];

                        filtro.push(result[0]['id']);

                        write(ssql, filtro, function (err, result) { });
                    }
                }

            });
        }
    }

});

export default controllerFuncionarios;