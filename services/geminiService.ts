import { GameStats } from "../types";

// Yapay zeka servisi devre dışı bırakıldı.
// Bu fonksiyon artık kullanılmıyor ancak dosya yapısını bozmamak için dummy olarak bırakıldı.
export const getTacticalAdvice = async (stats: GameStats, playerHealth: number): Promise<string> => {
  return "Taktiksel analiz sistemi çevrimdışı.";
};