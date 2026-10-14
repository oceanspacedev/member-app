import { Alert, Platform } from 'react-native';

type Options = { title: string; message: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void };

/** Dialog konfirmasi bawaan sistem untuk aksi yang tidak boleh terjadi karena salah ketuk (mis. keluar akun). */
export function confirmAction({ title, message, confirmLabel, destructive = false, onConfirm }: Options) {
  // Alert.alert tidak berfungsi di web; di sana pakai dialog browser (hanya untuk pengembangan).
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Batal', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
