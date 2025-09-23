import { config } from 'dotenv';

config({ path: `.env` }); 

export const { PORT,
    NODE_ENV,
    DATABASE_URL,
    DB_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    ARCJET_ENV,
    ARCJET_KEY
} = process.env; 