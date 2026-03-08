// @ts-nocheck
import { Router } from "express";
import * as authController from "../controllers/auth.controller";

const router = Router();

router.post("/login", authController.login);
router.post("/register", authController.createUser);
router.post("/register-file", authController.registerFile);
router.post("/logout", authController.logout);
router.get("/me", authController.getCurrentUser);

export const authRoutes = router;
