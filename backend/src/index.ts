import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.route';
import {checkBucket} from './config/minioclient';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
checkBucket();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', authRoutes);



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});