import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radii } from '@/constants/theme';

type ColorSwatchPickerProps = {
  colors: readonly string[];
  selected: string;
  onSelect: (color: string) => void;
};

export function ColorSwatchPicker({ colors, selected, onSelect }: ColorSwatchPickerProps) {
  return (
    <View style={styles.row}>
      {colors.map((color) => {
        const isSelected = color.toLowerCase() === selected.toLowerCase();
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`Pilih warna ${color}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              void Haptics.selectionAsync();
              onSelect(color);
            }}
            style={({ pressed }) => [
              styles.touch,
              isSelected && styles.touchSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.swatch, { backgroundColor: color }]}>
              {isSelected ? <Check color={palette.white} size={15} strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  touch: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  touchSelected: {
    borderColor: palette.text,
  },
  pressed: {
    opacity: 0.72,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
