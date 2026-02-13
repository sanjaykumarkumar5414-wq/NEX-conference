import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { bookingRouter } from "./booking.routes.js";
import { adminRouter } from "./admin.routes.js";
import { notificationsRouter } from "./notifications.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/bookings", bookingRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/notifications", notificationsRouter);

