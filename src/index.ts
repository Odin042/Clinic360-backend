import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://clinic360pro-git-homolog-clinic360pro.vercel.app',
  'https://*.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = 
      allowedOrigins.some(allowedOrigin => 
        origin === allowedOrigin || 
        origin.endsWith('.vercel.app')
      );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204
};

app.set('trust proxy', true);
app.enable('trust proxy');

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  console.log(`Requisição: ${req.method} ${req.url} | Origem: ${req.headers.origin}`);
  next();
});

app.get('/cors-test', (req, res) => {
  res.json({ message: 'CORS test successful', timestamp: new Date() });
});

app.use(authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});