import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react-native';
import { Txt } from './Txt';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * Upload limits, from section 02 and repeated on E2/F1/G1/H1/H2:
 * JPG, PNG or PDF · up to 3 files · 10 MB each.
 *
 * Enforced here as constants rather than per-screen so the four upload surfaces
 * cannot drift apart, and so the backend's own validation has a single number to
 * agree with.
 */
export const UPLOAD_LIMITS = {
  maxFiles: 3,
  maxBytes: 10 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'] as const,
} as const;

export type PickedFile = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
};

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function extLabel(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'image/png') return 'PNG';
  return 'JPG';
}

export function UploadField({
  label,
  hint,
  files,
  onPick,
  onRemove,
  onPickFromRecords,
  pickFromRecordsLabel,
  disabled,
}: {
  label: string;
  hint: string;
  files: PickedFile[];
  onPick: () => void;
  onRemove: (index: number) => void;
  /** "or pick from My Records" — present on E2, F1, G1. */
  onPickFromRecords?: () => void;
  pickFromRecordsLabel?: string;
  disabled?: boolean;
}) {
  const full = files.length >= UPLOAD_LIMITS.maxFiles;

  return (
    <View>
      <Pressable
        onPress={disabled || full ? undefined : onPick}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled || full }}
        style={({ pressed }) => [
          styles.dropzone,
          (disabled || full) && styles.dropzoneOff,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.dropIcon}>
          <Upload size={17} color={PALETTE.purple} strokeWidth={2.2} />
        </View>
        <View style={styles.dropText}>
          <Txt variant="bodyMedium">{label}</Txt>
          <Txt variant="helperSm" color={TEXT.muted}>
            {hint}
          </Txt>
        </View>
      </Pressable>

      {files.map((f, i) => (
        <View key={`${f.uri}-${i}`} style={styles.fileRow}>
          <View style={styles.fileBadge}>
            {f.mimeType === 'application/pdf' ? (
              <FileText size={14} color={PALETTE.midnight} strokeWidth={2} />
            ) : (
              <ImageIcon size={14} color={PALETTE.midnight} strokeWidth={2} />
            )}
          </View>
          <View style={styles.fileMeta}>
            {/* File names are user data in any script, but they are also almost
                always Latin here, and keeping them Latin avoids a mid-list font
                switch on a row that is mostly a filename. */}
            <Txt variant="bodySm" script="latin" numberOfLines={1}>
              {f.name}
            </Txt>
            <Txt variant="helperSm" color={TEXT.muted} script="latin">
              {extLabel(f.mimeType)} · {sizeLabel(f.size)}
            </Txt>
          </View>
          <Pressable
            onPress={() => onRemove(i)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${f.name}`}
            hitSlop={12}
            style={styles.remove}
          >
            <X size={15} color={TEXT.muted} strokeWidth={2.4} />
          </Pressable>
        </View>
      ))}

      {onPickFromRecords && pickFromRecordsLabel ? (
        <Pressable
          onPress={onPickFromRecords}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.recordsLink}
        >
          <Txt variant="helper" color={PALETTE.deepBlue} style={styles.underline}>
            {pickFromRecordsLabel}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TOUCH_MIN + 10,
    borderRadius: RADIUS.chip,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#D9D2F0',
    backgroundColor: '#FBF9FF',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.sm,
  },
  dropzoneOff: {
    opacity: 0.5,
  },
  dropIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: SURFACE.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropText: {
    flex: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.xs,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: SURFACE.border,
    backgroundColor: SURFACE.card,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    minHeight: TOUCH_MIN,
  },
  fileBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SURFACE.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMeta: {
    flex: 1,
  },
  remove: {
    padding: 2,
  },
  recordsLink: {
    alignSelf: 'center',
    marginTop: SPACE.xs,
    minHeight: 28,
    justifyContent: 'center',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.85,
  },
});
