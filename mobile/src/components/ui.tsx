import { router } from 'expo-router';
import { useState, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, type FontWeight } from '@/constants/theme';
import { initials } from '@/lib/format';
import { haptics } from '@/lib/haptics';

import { Icon, type IconName } from './icon';

type TxtProps = TextProps & { weight?: FontWeight; size?: number; color?: string; style?: StyleProp<TextStyle> };

// Pengaturan "ukuran teks besar" di HP boleh membesarkan teks, tapi dibatasi agar tata letak tidak pecah.
export const MAX_FONT_SCALE = 1.3;

export function Txt({ weight = 'regular', size = 14, color = colors.ink, style, ...rest }: TxtProps) {
  return <Text maxFontSizeMultiplier={MAX_FONT_SCALE} {...rest} style={[{ fontFamily: fonts[weight], fontSize: size, color }, style]} />;
}

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'brass' | 'secondary' | 'outline' | 'light' | 'danger' | 'destructive';
  loading?: boolean;
  icon?: IconName;
  /** Elemen bebas di kiri label, mis. logo brand. */
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const buttonVariants = {
  primary: { bg: colors.primary, fg: '#FFFFFF', border: colors.primary },
  brass: { bg: colors.accent, fg: colors.accentInk, border: colors.accent },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.inputBorder },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.primary },
  light: { bg: '#FFFFFF', fg: colors.primaryDark, border: '#FFFFFF' },
  danger: { bg: colors.surface, fg: colors.danger, border: '#E8C9BE' },
  destructive: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
} as const;

export function Button({ title, variant = 'primary', loading, disabled, icon, leading, style, ...rest }: ButtonProps) {
  const v = buttonVariants[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border, opacity: inactive ? 0.6 : pressed ? 0.85 : 1, transform: [{ scale: pressed && !inactive ? 0.98 : 1 }] },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {leading}
          {icon && <Icon name={icon} size={20} color={v.fg} />}
          <Txt weight="bold" size={15} color={v.fg}>
            {title}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type FieldProps = TextInputProps & { label: string; error?: string; prefix?: string; hint?: ReactNode; required?: boolean; ref?: Ref<TextInput> };

export function Field({ label, error, prefix, hint, required, style, onFocus, onBlur, ...rest }: FieldProps) {
  // Bingkai menebal saat kolom dipilih, supaya jelas mana yang sedang diisi.
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Txt weight="semibold" size={13} color={colors.inkSoft}>
        {label}
        {required && (
          <Txt weight="semibold" size={13} color={colors.danger} accessibilityLabel="wajib diisi">
            *
          </Txt>
        )}
      </Txt>
      <View style={[styles.input, focused && { borderColor: colors.primary }, error ? { borderColor: colors.danger } : null]}>
        {prefix && (
          <View style={styles.prefix}>
            <Txt weight="bold" size={15}>
              {prefix}
            </Txt>
          </View>
        )}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.subtle}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          selectionColor={colors.accentText}
          style={[styles.inputText, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
      {error ? (
        <Txt size={12} color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : (
        hint
      )}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (!active) haptics.select();
        onPress();
      }}
      style={[styles.chip, active ? { backgroundColor: colors.primary, borderColor: colors.primary } : null]}>
      <Txt weight="bold" size={13} color={active ? '#FFFFFF' : colors.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Monogram({ name, color, size = 44, radius = 12 }: { name: string; color: string; size?: number; radius?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Txt weight="extrabold" size={Math.round(size * 0.3)} color="#FFFFFF">
        {initials(name)}
      </Txt>
    </View>
  );
}

export function Banner({ text, tone = 'info', icon = 'info' }: { text: string; tone?: 'info' | 'error' | 'gold'; icon?: IconName }) {
  const palette = {
    info: { bg: colors.primarySoft, fg: colors.primaryDark },
    error: { bg: colors.dangerSoft, fg: colors.danger },
    gold: { bg: colors.accentSoft, fg: colors.accentText },
  }[tone];

  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]} accessibilityLiveRegion="polite">
      <Icon name={icon} size={20} color={palette.fg} strokeWidth={2} />
      <Txt size={13} color={palette.fg} style={{ flex: 1, lineHeight: 19 }}>
        {text}
      </Txt>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ScreenHeader({ title, right, dark }: { title: string; right?: ReactNode; dark?: boolean }) {
  const fg = dark ? '#FFFFFF' : colors.ink;
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={styles.back}>
        <Icon name="back" color={fg} strokeWidth={2} />
      </Pressable>
      <Txt weight="bold" size={16} color={fg} style={{ flex: 1 }}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Txt weight="extrabold" size={17} accessibilityRole="header">
        {title}
      </Txt>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: 14,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  inputText: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
