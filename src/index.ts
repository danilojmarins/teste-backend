import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './routes.js';

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(cors({
    origin: '*',
    allowedHeaders: '*'
}));

app.use(express.json());

app.use(routes);

app.listen(port, () => {
    console.log(`Server aberto na porta: ${port}`);
});