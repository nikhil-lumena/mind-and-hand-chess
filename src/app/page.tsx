'use client';

import { RealtimeProvider } from '@/context/RealtimeContext';
import { GameProvider } from '@/context/GameContext';
import { FxProvider } from '@/context/FxContext';
import { SoundProvider } from '@/context/SoundContext';
import { GameContainer } from '@/components/GameContainer';

export default function Home() {
  return (
    <RealtimeProvider>
      <GameProvider>
        <FxProvider>
          <SoundProvider>
            <GameContainer />
          </SoundProvider>
        </FxProvider>
      </GameProvider>
    </RealtimeProvider>
  );
}
