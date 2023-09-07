import { Router } from "express";
import Validate from "./app/controllers/Validate.js";
import Load from "./app/controllers/Load.js";

const router = Router();

router.post('/validar', Validate);
router.post('/carregar', Load);

export default router;