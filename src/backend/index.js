import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

app.get('/hello', (req, res) => {
  res.send('world');
});

app.listen(port, () => {
  console.log(`Backend API listening at http://localhost:${port}`);
});
