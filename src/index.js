import express from "express";
import cors from "cors";
import controllerUsuarios from "./controllers/controller.usuarios.js";
import controllerNoticias from "./controllers/controller.noticias.js";
import controllerTitulos from "./controllers/controller.titulos.js";
import controllerConvites from "./controllers/controller.convites.js";
import controllerAreas from "./controllers/controller.areas.js";
import controllerCep from "./controllers/controller.cep.js";
import controllerFuncionarios from "./controllers/controller.funcionarios.js";
import controllerSolicitacoes from "./controllers/controller.solicitacoes.js";

const app = express();

// Middleware JSON
app.use(express.json());

// Middleware CORS
app.use(cors());

// Rotas
app.use(controllerUsuarios);
app.use(controllerFuncionarios);
app.use(controllerNoticias);
app.use(controllerTitulos);
app.use(controllerConvites);
app.use(controllerAreas);
app.use(controllerSolicitacoes);
app.use(controllerCep);

app.listen(3000, function () {
    console.log("Servidor no ar");
});