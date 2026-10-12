import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/ui';
import { colors } from '@/constants/theme';

export type MenuRowItem = { icon: IconName; label: string; value?: string; go?: () => void };

/** Satu baris di grup menu: info (label + nilai) atau tautan (dengan panah). */
export function MenuRow({ row, first }: { row: MenuRowItem; first: boolean }) {
  const content = (
    <>
      <View style={styles.rowIcon}>
        <Icon name={row.icon} size={19} color={colors.ink} strokeWidth={1.8} />
      </View>
      {row.go ? (
        // Tautan: judul tebal, keterangan kecil di bawahnya (opsional).
        <View style={{ flex: 1, gap: 2 }}>
          <Txt weight="semibold" size={15}>
            {row.label}
          </Txt>
          {row.value && (
            <Txt size={12} color={colors.muted}>
              {row.value}
            </Txt>
          )}
        </View>
      ) : (
        // Info: label kecil di atas, nilainya tebal.
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={12} color={colors.muted}>
            {row.label}
          </Txt>
          <Txt weight="semibold" size={15}>
            {row.value}
          </Txt>
        </View>
      )}
      {row.go && <Icon name="chevron" size={18} color={colors.subtle} strokeWidth={2} />}
    </>
  );

  return row.go ? (
    <Pressable accessibilityRole="button" onPress={row.go} style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: colors.lineSoft }]}>
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${row.label}: ${row.value}`} style={[styles.row, !first && styles.divider]}>
      {content}
    </View>
  );
}

/** Grup berjudul berisi beberapa MenuRow dalam satu kartu. */
export function MenuGroup({ title, rows }: { title: string; rows: MenuRowItem[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt weight="extrabold" size={12} color={colors.muted} style={{ letterSpacing: 0.8, paddingHorizontal: 4 }} accessibilityRole="header">
        {title.toUpperCase()}
      </Txt>
      <View style={styles.group}>
        {rows.map((row, i) => (
          <MenuRow key={row.label} row={row} first={i === 0} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 58 },
  rowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
});
