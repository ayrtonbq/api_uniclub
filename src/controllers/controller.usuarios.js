import { Router } from "express";
import { read, write } from '../config/database.js';
import { sign, verify } from "../util/jwt.js";
import multer from "multer";  // Keep this import statement

const controllerUsuarios = Router();
const upload = multer();  // This initializes multer for use

controllerUsuarios.post("/usuarios/login", async function (req, res) {
    const token = req.headers['authorization'];

    // Consulta SQL para verificar CPF e senha
    let ssql = `
        select a.id, a.titulo, cast(a.digito as integer) as digito, 1 as categoria, ts.descricao as tipo,  
        a.cpf, a.identidade, a.nome, a.cep, a.numero, a.logradouro, a.bairro, a.cidade, a.foto, a.fone1, a.fone2, 
        a.email, a.senha
        from public.associado a 
        inner join tiposocio ts on a.codtiposocio = ts.codtiposocio
        where a.cpf = $1 and a.senha = $2;
    `;

    const { login, senha } = req.body;

    let filtro = [];

    if (!token) {
        filtro = [login, senha];

        try {
            const result = await read(ssql, filtro);

            if (result.length === 0) {
                return res.status(401).json({ error: 'Usuário não encontrado ou senha incorreta!' });
            }

            const token = sign({
                id: result[0]['id'],
                titulo: result[0]['titulo'],
                cpf: result[0]['cpf'],
                auth: true,
            });
            result[0]['token'] = token;

            delete result[0]['senha'];

            return res.status(200).json(result[0]);
        } catch (err) {
            console.error('Erro ao acessar o banco de dados no login:', err);
            return res.status(500).json({ error: 'Erro ao acessar o banco de dados!', details: err });
        }
    } else {
        console.log('Token recebido:', token);

        let filtro = [];
        let decoded = verify(token);

        console.log('Resultado da verificação do token:', decoded);

        if (!decoded) {
            return res.status(401).json({ error: 'Token inválido!' });
        } else {
            let cpf = decoded['cpf'];
            filtro = [cpf];

            try {
                const result = await read(ssql, filtro);

                if (result.length === 0) {
                    return res.status(401).json({ error: 'Usuário não encontrado!' });
                }
                let novoToken = sign({
                    id: result[0]['id'],
                    titulo: result[0]['titulo'],
                    cpf: result[0]['cpf'],
                    auth: true,
                });

                result[0]['token'] = novoToken;
                return res.status(200).json(result[0]);
            } catch (err) {
                console.error('Erro ao acessar o banco de dados ao validar token:', err);
                return res.status(500).json({ error: 'Erro ao acessar o banco de dados!', details: err });
            }
        }
    }
});

controllerUsuarios.put('/usuarios/atualizar/cadastro', upload.single('foto'), function (req, res) {
    const token = req.headers['authorization'];
    console.log('Token recebido:', token);

    let result = verify(token);

    if (!result) {
        return res.status(401).json({ message: 'Token inválido ou ausente' });
    }

    // Se não houver foto, definimos uma variável fotoBuffer como null
    let fotoBuffer = null;
    if (req.file) {
        fotoBuffer = req.file.buffer; // Se houver foto, pegamos o buffer da foto
    }

    let filtro = [];
    let ssql;

    // Lógica para escolher se o usuário é um associado ou dependente
    if (req.body.categoria == 1) {
        ssql = `UPDATE associado `;
    } else {
        ssql = `UPDATE dependente `;
    }

    // Montagem da query SQL para atualização
    ssql += `SET identidade = $1, cep = $2, logradouro = $3, bairro = $4, numero = $5, 
             cidade = $6, fone1 = $7, fone2 = $8, email = $9, foto = $10 
             WHERE cpf = $11`;

    // Preenchendo o array de parâmetros para a query
    filtro = [
        req.body.identidade,
        req.body.cep,
        req.body.logradouro,
        req.body.bairro,
        req.body.numero,
        req.body.cidade,
        req.body.fone1,
        req.body.fone2,
        req.body.email,
        fotoBuffer,  // Foto pode ser null caso não tenha sido enviada
        result.cpf
    ];

    // Executando a query SQL
    write(ssql, filtro, function (err, result) {
        if (err) {
            return res.status(500).json({ message: "Erro ao salvar no banco", error: err });
        } else {
            return res.status(200).json({ message: "Cadastro atualizado com sucesso" });
        }
    });
});


controllerUsuarios.put("/usuarios/atualizar/senha", async function (req, res) {
    const token = req.headers['authorization'];
    let result = verify(token);

    if (!result) {
        return res.status(401).json({});
    } else {
        let filtro = [];
        let ssql;

        if (req.body.categoria == 1) {
            ssql = `select cpf from associado `;
        } else {
            ssql = `select cpf from dependente `;
        }

        ssql += `where cpf = $1 and senha = $2`;
        filtro.push(result['cpf'], req.body.senhaAtual);

        await new Promise((resolve, reject) => read(ssql, filtro, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        })).then(result => {
            if (result.length == 0) {
                return res.status(404).json({});
            } else {
                if (req.body.categoria == 1) {
                    ssql = `update associado `;
                } else {
                    ssql = `update dependente `;
                }

                ssql += `set senha = $1 where cpf = $2`;

                filtro = [req.body.senhaNova, result[0]['cpf']];

                write(ssql, filtro, function (err, result) {
                    if (err) {
                        return res.status(500).json(err);
                    } else {
                        return res.status(200).json({});
                    }
                });
            }
        })
        .catch(err => res.status(500).json(err));
    }
});

controllerUsuarios.put("/usuarios/atualizar/foto", upload.single('foto'), function (req, res) {
    if (!req.file) {
        return res.status(400).json({});
    } else {
        const token = req.headers['authorization'];
        let result = verify(token);

        if (!result || !result['auth']) {
            return res.status(401).json({});
        } else {
            let filtro = [];
            let ssql;

            if (req.body.categoria == 1) {
                ssql = `update associado `;
            } else {
                ssql = `update dependente `;
            }

            ssql += `set foto = $1 where id = $2 and titulo = $3 and digito = $4`;
            filtro = [req.file['buffer'], req.body.id, req.body.titulo, req.body.digito];

            write(ssql, filtro, function (err, result) {
                if (err) {
                    return res.status(500).json(err);
                } else {
                    return res.status(200).json({});
                }
            });
        }
    }
});

export default controllerUsuarios;
