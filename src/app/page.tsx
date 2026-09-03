'use client';

import { RealtimeProvider } from '@/context/RealtimeContext';
import { GameProvider } from '@/context/GameContext';
import { GameContainer } from '@/components/GameContainer';

export default function Home() {
  return (
    <RealtimeProvider>
      <GameProvider>
        <GameContainer />
      </GameProvider>
    </RealtimeProvider>
  );
}
