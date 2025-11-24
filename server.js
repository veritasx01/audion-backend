import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';

const app = express();

const corsOptions = {
  origin: [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.set('query parser', 'extended');


app.get(/.*/, (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

const port = process.env.PORT || 3030;
app.listen(port, () => console.log(`Server ready at http://localhost:${port}`));
