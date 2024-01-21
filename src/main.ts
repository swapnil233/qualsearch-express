import express from 'express';
import cors from 'cors';

const port = process.env.PORT || 4000;

const app = express();

app.use(cors());

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
