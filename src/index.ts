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
  /https:\/\/clinic360pro-.*-clinic360pro\.vercel\.app/,
  'https://*.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    console.log('Recebendo origem:', origin);
    
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return origin === allowedOrigin || origin.endsWith('.vercel.app');
    });
    
    if (isAllowed) {
      console.log('Origem permitida:', origin);
      callback(null, true);
    } else {
      console.warn('Origem bloqueada:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  exposedHeaders: ['Set-Cookie', 'Authorization'],
  optionsSuccessStatus: 204
};

app.set('trust proxy', true);
app.enable('trust proxy');

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin) {
    if (allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) return allowedOrigin.test(origin);
      return origin === allowedOrigin || origin.endsWith('.vercel.app');
    })) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Vary', 'Origin');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    cors: {
      allowedOrigins: allowedOrigins,
      currentOrigin: req.headers.origin
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use(authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log('Origens permitidas:');
  allowedOrigins.forEach(origin => console.log(`- ${origin instanceof RegExp ? origin.source : origin}`));
});