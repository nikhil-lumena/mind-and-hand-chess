'use client';

import { RealtimeProvider } from '@/context/RealtimeContext';
import { GameProvider } from '@/context/GameContext';
import { SoundProvider } from '@/context/SoundContext';
import { GameContainer } from '@/components/GameContainer';

export default function Home() {
  return (
    <RealtimeProvider>
      <GameProvider>
        <SoundProvider>
          <GameContainer />
        </SoundProvider>
      </GameProvider>
    </RealtimeProvider>
  );
}
