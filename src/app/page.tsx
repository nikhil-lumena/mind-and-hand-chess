'use client';

import { SocketProvider } from '@/context/SocketContext';
import { GameProvider } from '@/context/GameContext';
import { GameContainer } from '@/components/GameContainer';

export default function Home() {
  return (
    <SocketProvider>
      <GameProvider>
        <GameContainer />
      </GameProvider>
    </SocketProvider>
  );
}
