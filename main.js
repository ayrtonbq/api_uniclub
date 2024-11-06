import express from "express";
import cors from "cors";
import controllerUsuarios from "./src/controllers/controller.usuarios.js";
import controllerNoticias from "./src/controllers/controller.noticias.js";
import controllerTitulos from "./src/controllers/controller.titulos.js";
import controllerConvites from "./src/controllers/controller.convites.js";
import controllerAreas from "./src/controllers/controller.areas.js";
import controllerCep from "./src/controllers/controller.cep.js";
import controllerFuncionarios from "./src/controllers/controller.funcionarios.js";
import controllerSolicitacoes from "./src/controllers/controller.solicitacoes.js";

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
