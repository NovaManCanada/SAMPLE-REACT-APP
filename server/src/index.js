import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

// Behind a reverse proxy in any real deployment; needed for correct req.ip / rate limiting.
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// Strict CORS allow-list — never wildcard when credentials (cookies) are involved.
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  }),
);

app.use(express.json({ limit: '10kb' })); // request size limit
app.use(cookieParser());
app.use(mongoSanitize()); // strip `$`/`.` operator-injection keys from user input
app.use(hpp()); // strip duplicate HTTP parameters (parameter-pollution defense)

if (env.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`, { env: env.nodeEnv });
  });
}

start().catch((err) => {
  logger.error('Fatal startup error', { message: err.message });
  process.exit(1);
});
