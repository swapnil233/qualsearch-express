import express, { Request, Response } from 'express';
import cors from 'cors';
import webhooksRoutes from './routes/webhooksRoutes';
import winston from "winston";
import expressWinston from "express-winston";
import embeddingsRoutes from './routes/embeddingsRoutes';

const port = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(
  expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.json()
    ),
    meta: false,
    msg: "HTTP  ",
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) {
      return false;
    },
  })
);

app.get("/status", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
});

// Routes
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/embeddings", embeddingsRoutes);

// 404 
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
