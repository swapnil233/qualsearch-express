require('dotenv').config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import webhooksRoutes from './routes/webhooksRoutes';
import winston from 'winston';
import expressWinston from 'express-winston';
import embeddingsRoutes from './routes/embeddingsRoutes';
import summariesRoutes from './routes/summariesRoutes';

const port = process.env.PORT || 4000;
const app = express();

const allowedOrigins = ['http://localhost:3003', 'https://www.qualsearch.io'];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        console.log(`Allowed CORS for: ${origin}`);
        callback(null, true);
      } else {
        console.log(`Blocked CORS for: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

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
    msg: 'HTTP  ',
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) {
      return false;
    },
  })
);

app.get('/status', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

// Routes
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/embeddings', embeddingsRoutes);
app.use('/api/summaries', summariesRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
