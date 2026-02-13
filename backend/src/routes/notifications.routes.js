import { Router } from "express";
import { authenticateJwt } from "../middlewares/auth.js";
import {
  listNotificationsForUser,
  markNotificationRead
} from "../repositories/notificationRepository.js";

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get(
  "/",
  authenticateJwt,
  async (req, res, next) => {
    try {
      const notifications = await listNotificationsForUser(req.user.id, {
        limit: 30
      });
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/notifications/:id/read
notificationsRouter.post(
  "/:id/read",
  authenticateJwt,
  async (req, res, next) => {
    try {
      const updated = await markNotificationRead(req.params.id, req.user.id);
      if (!updated) {
        return res.status(404).json({
          error: "NotFound",
          message: "Notification not found."
        });
      }
      res.json({ notification: updated });
    } catch (error) {
      next(error);
    }
  }
);

