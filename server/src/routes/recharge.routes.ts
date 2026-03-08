import { Router } from "express";
import * as rechargeController from "../controllers/recharge.controller";

const router = Router();

// Secure recharge endpoints
router.post("/topup", rechargeController.topup);

export default router;
