import { forwardRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { palette, radii, spacing } from '@/constants/theme';
import { useFontsReady } from '@/providers/FontProvider';
import { AppText } from './AppText';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string | null;
  counter?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  optionalLabel?: string;
};

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    counter,
    leftIcon,
    rightElement,
    containerStyle,
    inputStyle,
    optionalLabel,
    onFocus,
    onBlur,
    multiline,
    editable = true,
    ...rest
  },
  ref,
) {
  const fontsReady = useFontsReady();
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={containerStyle}>
      {label || counter ? (
        <View style={styles.labelRow}>
          <View style={styles.labelLeft}>
            <AppText variant="bodyStrong" style={styles.label}>
              {label}
            </AppText>
            {optionalLabel ? (
              <AppText variant="caption" color={palette.faint}>
                {optionalLabel}
              </AppText>
            ) : null}
          </View>
          {counter ? (
            <AppText variant="caption" color={palette.faint}>
              {counter}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.field,
          multiline && styles.multilineField,
          focused && styles.focused,
          hasError && styles.errored,
          !editable && styles.readOnly,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          ref={ref}
          multiline={multiline}
          editable={editable}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={palette.faint}
          selectionColor={palette.primary}
          style={[
            styles.input,
            {
              fontFamily: fontsReady ? 'Poppins_400Regular' : undefined,
            },
            multiline && styles.multilineInput,
            inputStyle,
          ]}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>

      {error ? (
        <View style={styles.messageRow}>
          <AlertCircle color={palette.danger} size={13} strokeWidth={2.2} />
          <AppText variant="caption" color={palette.danger} style={styles.message}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" color={palette.muted} style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: spacing.sm,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    paddingHorizontal: 14,
  },
  multilineField: {
    alignItems: 'flex-start',
    minHeight: 108,
    paddingVertical: 12,
  },
  focused: {
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  errored: {
    borderColor: palette.danger,
    backgroundColor: palette.dangerSoft,
  },
  readOnly: {
    backgroundColor: palette.surfaceMuted,
  },
  leftIcon: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightElement: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 0,
    color: palette.text,
    fontSize: 14.5,
  },
  multilineInput: {
    minHeight: 82,
    textAlignVertical: 'top',
    paddingTop: 2,
  },
  hint: {
    marginTop: 7,
    marginLeft: 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 7,
    marginLeft: 2,
  },
  message: {
    flex: 1,
    lineHeight: 17,
  },
});
