import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { songRoutes } from './api/song/song.routes.js';
import { logRequest } from './middleware/logger.middleware.js';
import { loggerService } from './services/logger.service.js';

const app = express();

const corsOptions = {
  origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.set('query parser', 'extended');
app.use(logRequest); // log all incoming requests with custom logger middleware

app.use('/api/song', songRoutes);

app.get(/.*/, (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () =>
  loggerService.info(`Server ready at http://localhost:${PORT}`)
);
