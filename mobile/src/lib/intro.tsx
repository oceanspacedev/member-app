import { createContext, useContext } from 'react';

/**
 * Apakah layar pembuka berlogo (AppIntro) sudah selesai. Layar pertama yang punya animasi masuk
 * (mis. pengenalan) menunggu ini agar animasinya terlihat, bukan berjalan di balik layar pembuka.
 */
const IntroContext = createContext(true);

export const IntroProvider = IntroContext.Provider;

export function useIntroDone(): boolean {
  return useContext(IntroContext);
}
