import { Router } from "express";
import Validate from "./app/controllers/Validate.js";
import Update from "./app/controllers/Update.js";

const router = Router();

router.post('/validar', Validate);
router.post('/atualizar', Update);

export default router;