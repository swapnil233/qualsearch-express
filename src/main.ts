import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import webhooksRoutes from './routes/webhooksRoutes';

const port = process.env.PORT || 4000;

const app = express();

app.use(cors());

app.get('/api', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.get('/api/health', (req, res) => {
  res.status(200).send({ message: 'OK' });
});

app.use("/api/users", userRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
