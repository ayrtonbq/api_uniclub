import { Router } from "express";

const controllerCep = Router();

controllerCep.get("/cep/:cep", async function (req, res) {

    if (req.params.cep.length == 8) {
        await new Promise((resolve, reject) => fetch(`https://viacep.com.br/ws/${req.params.cep}/json/`)
            .then(response => resolve(response.json()))
            .catch(err => reject(err))).
            then(response => res.status(200).json(response)).
            catch(err => res.status(500).json(err));
    } else {
        res.status(404).json([]);
    }

});

export default controllerCep;