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
        a.email, a.uf, a.senha
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

controllerUsuarios.put('/usuarios/atualizar/cadastro', upload.single('foto'), async function (req, res) {
    // 1. Verificação do token JWT
    const token = req.headers['authorization'];
    if (!token) {
        console.log("Erro: Token ausente.");
        return res.status(400).json({ message: 'Token ausente' });
    }

    let result;
    try {
        result = verify(token); // Verifica o token
    } catch (err) {
        console.log("Erro ao verificar o token:", err);
        return res.status(401).json({ message: 'Token inválido ou expirado' });
    }

    if (!result || !result.auth) {
        console.log("Erro: Token inválido.");
        return res.status(401).json({ message: 'Token inválido ou sem autorização' });
    }

    // 2. Verificar se a categoria existe no corpo da requisição (não é obrigatória, mas precisamos dela para determinar qual tabela usar)
    const { categoria, identidade, cep, logradouro, bairro, numero, cidade, fone1, fone2, email, uf } = req.body;
    if (categoria === undefined) {
        console.log("Erro: Categoria não fornecida.");
        return res.status(400).json({ message: 'Categoria não fornecida' });
    }

    // 3. Processar a foto (se existir)
    let fotoBuffer = null;
    if (req.file) {
        fotoBuffer = req.file.buffer; // Se houver foto, pegamos o buffer da foto
    }

    // 4. Montar a query SQL dinamicamente com base na categoria
    let ssql = '';
    let filtro = [];

    try {
        if (categoria == 1) {
            ssql = `UPDATE associado `;
        } else if (categoria == 2) {
            ssql = `UPDATE dependente `;
        } else {
            console.log("Erro: Categoria inválida.");
            return res.status(400).json({ message: 'Categoria inválida' });
        }

        // Montagem da query SQL para atualização
        ssql += `SET identidade = $1, cep = $2, logradouro = $3, bairro = $4, numero = $5, 
                 cidade = $6, fone1 = $7, fone2 = $8, email = $9, uf = $10, foto = $11  
                 WHERE cpf = $12`;

        // Preparar os parâmetros para a query
        filtro = [
            identidade || null,  
            cep || null,          
            logradouro || null,   
            bairro || null,       
            numero || null,       
            cidade || null,       
            fone1 || null,        
            fone2 || null,        
            email || null, 
            uf  || null,       
            fotoBuffer,           
            result.cpf            
        ];

    } catch (err) {
        console.log("Erro na montagem da query SQL:", err);
        return res.status(500).json({ message: 'Erro ao montar a query SQL', error: err });
    }

    // 5. Log da query antes de executá-la
    console.log("Executando query SQL: ", ssql);
    console.log("Parâmetros da query: ", filtro);

    try {
        // 6. Executando a query no banco de dados
        const dbResult = await write(ssql, filtro);

        // 7. Verificação do resultado da query
        if (dbResult && dbResult.rowCount > 0) {
            console.log("Cadastro atualizado com sucesso");
            return res.status(200).json({ message: 'Cadastro atualizado com sucesso' });
        } else {
            console.log("Erro: Nenhuma linha foi atualizada. CPF não encontrado?");
            return res.status(404).json({ message: 'Cadastro não encontrado ou não atualizado. Verifique o CPF.' });
        }
    } catch (err) {
        console.log("Erro ao executar a query:", err);
        return res.status(500).json({ message: 'Erro ao executar a query no banco de dados', error: err });
    }
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
