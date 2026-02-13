import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { apiRouter } from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandlers.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: "*"
      // TODO: Restrict origins once frontend URLs are known.
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

