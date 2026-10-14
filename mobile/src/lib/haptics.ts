import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function run(feedback: () => Promise<void>) {
  // Web tidak punya motor getar; di HP, gagal (mode hemat daya, getar dimatikan) tidak perlu diketahui pengguna.
  if (Platform.OS === 'web') return;
  feedback().catch(() => undefined);
}

/** Getar halus untuk momen penting, seperti di aplikasi belanja besar. Aman dipanggil di mana saja. */
export const haptics = {
  /** Pilihan berganti: tab, chip, switch. */
  select: () => run(() => Haptics.selectionAsync()),
  /** Aksi kecil yang berhasil, mis. kode tersalin. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
