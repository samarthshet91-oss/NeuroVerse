/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { NeuroVerseShell } from '@/src/app/NeuroVerseShell';
import { IntroAnimation } from '@/src/components/intro/IntroAnimation';

export default function App() {
  const [introFinished, setIntroFinished] = useState(false);

  const handleIntroComplete = useCallback(() => {
    setIntroFinished(true);
  }, []);

  if (!introFinished) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  return <NeuroVerseShell />;
}
