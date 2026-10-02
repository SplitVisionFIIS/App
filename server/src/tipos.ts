import 'express';

declare global {
  namespace Express {
    interface Request {
      usuario?: { id: string; username: string };
    }
  }
}

export {};
