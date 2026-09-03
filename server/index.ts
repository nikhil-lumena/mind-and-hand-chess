import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './socketHandlers';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
  });

  setupSocketHandlers(io);

  server.all('*', (req: any, res: any) => handle(req, res));

  httpServer.listen(port, () => {
    console.log(`> Mind & Hand Chess ready on http://localhost:${port}`);
  });
});
