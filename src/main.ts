import express from 'express';
import cors from 'cors';
import webhooksRoutes from './routes/webhooksRoutes';

const port = process.env.PORT || 4000;

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use("/api/webhooks", webhooksRoutes);

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
