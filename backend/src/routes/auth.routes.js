import { Router } from "express";
import {
  adminLogin,
  requestEmployeeOtp,
  verifyEmployeeOtp
} from "../services/authService.js";

export const authRouter = Router();

// POST /api/auth/admin/login
authRouter.post("/admin/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await adminLogin({ email, password });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/employee/request-otp
authRouter.post("/employee/request-otp", async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await requestEmployeeOtp({ email });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/employee/verify-otp
authRouter.post("/employee/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyEmployeeOtp({ email, otp });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

