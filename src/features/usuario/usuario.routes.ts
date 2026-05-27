import { Router } from "express";
import { pool } from "../../shared/config/database";
import UsuarioRepository from "./usuario.repository";
import UsuarioService from "./usuario.service";
import UsuarioController from "./usuario.controller";
import exigeLogin from "../../shared/middlewares/exigeLogin";

const router = Router();

// Instanciação das dependências e injeção no Controller
const usuarioRepo = new UsuarioRepository(pool);
const usuarioService = new UsuarioService(usuarioRepo);
const usuarioController = new UsuarioController(usuarioService);

/**
 * GET /api/v1/usuarios/meu-perfil
 */
router.get("/meu-perfil", exigeLogin(), usuarioController.buscarMeuPerfil.bind(usuarioController));

export default router;