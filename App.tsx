import React from 'react';
import { GameCanvas } from './components/GameCanvas';

function App() {
  return (
    <div className="w-full h-screen bg-zinc-950 flex flex-col">
      <GameCanvas />
    </div>
  );
}

export default App;
