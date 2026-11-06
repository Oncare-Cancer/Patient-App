import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, MessageCircle, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import {
  Btn,
  Card,
  Chip,
  Field,
  Txt,
  SosPill,
} from '@/components/ui';
import { OtpInput, OTP_LENGTH } from '@/components/ui/OtpInput';
import { LoginHero } from '@/components/login/LoginHero';
import {
  PatientPicker,
  type HospitalUidOption,
} from '@/components/login/PatientPicker';
import { CallbackSheet } from '@/components/login/CallbackSheet';
import { PremiumAlert } from '@/components/PremiumAlert';
import { takePendingIntent, resumePathFor } from '@/services/pendingIntent';
import {
  PALETTE,
  RADIUS,
  SPACE,
  SURFACE,
  TEXT,
  TOUCH_MIN,
} from '@/constants/theme';

/**
 * Screens A1 and A2 — login and OTP.
 *
 * The transport logic is unchanged from the previous build on purpose: the same
 * `sendOTP(identifier, name)` / `login(mobile, otp, hospitalUid)` calls, and the
 * same handling of the backend's four response codes:
 *
 *   code 1  OTP sent          -> go to the OTP step, keep data.mobile + hospitalUids
 *   code 3  number not in HIS -> ask for a name, then resend as a call-back
 *   code 4  call-back raised  -> confirm and return to the start
 *   other   surface the message
 *
 * What is new is presentation plus the three things section 04 asks for and the
 * old screen lacked: a 30-second resend timer with a 3-resend cap, an SMS
 * fallback, and a patient picker when one number carries several Hospital UIDs.
 */

/** Section 04: "OTP ... valid 5 min, max 3 resends". */
const RESEND_SECONDS = 30;
const MAX_RESENDS = 3;

type Step = 'identifier' | 'otp';
type Method = 'mobile' | 'hospitalUid';

export default function LoginScreen() {
  const router = useRouter();
  const t = useT();
  const { login, sendOTP } = useAuth();

  const [step, setStep] = useState<Step>('identifier');
  const [method, setMethod] = useState<Method>('mobile');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');

  const [userMobile, setUserMobile] = useState('');
  const [hospitalUids, setHospitalUids] = useState<HospitalUidOption[]>([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [otpInfo, setOtpInfo] = useState('');

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errors, setErrors] = useState({ identifier: '', otp: '', uid: '' });

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  const [callback, setCallback] = useState({ visible: false, message: '' });

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ------------------------------------------------------------- resend timer */

  const startCountdown = useCallback(() => {
    setSecondsLeft(RESEND_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  /* ----------------------------------------------------------------- handlers */

  /** Applies a `code === 1` response. Shared by first send and resend. */
  const acceptOtpSent = (response: any) => {
    setStep('otp');
    setUserMobile(response?.data?.mobile ?? '');
    const uids: HospitalUidOption[] = response?.data?.hospitalUids ?? [];
    setHospitalUids(uids);
    setOtpInfo(response?.message ?? response?.data?.message ?? '');
    // One UID needs no choice; the picker only appears for two or more.
    if (uids.length === 1) setSelectedUid(uids[0].hospitalUid);
    startCountdown();
  };

  const requestOtp = async (name = '') => {
    Keyboard.dismiss();
    setErrors({ identifier: '', otp: '', uid: '' });

    if (!identifier.trim()) {
      setErrors({
        identifier:
          method === 'mobile'
            ? t('ui.guest.enterMobile')
            : t('ui.login.uidLabel'),
        otp: '',
        uid: '',
      });
      return;
    }

    setSending(true);
    const response: any = await sendOTP(identifier, name);
    setSending(false);

    const code = response?.code ?? response?.data?.code;

    if (code === 1) {
      setCallback({ visible: false, message: '' });
      acceptOtpSent(response);
      return;
    }

    // Number is not in the HIS — collect a name and raise a call-back instead.
    if (code === 3) {
      setCallback({
        visible: true,
        message: response?.message ?? '',
      });
      return;
    }

    if (code === 4) {
      setCallback({ visible: false, message: '' });
      setIdentifier('');
      setAlert({
        visible: true,
        title: t('ui.common.done'),
        message: response?.message ?? t('ui.guest.notSureBody'),
      });
      return;
    }

    setAlert({
      visible: true,
      title: t('ui.common.somethingWrong'),
      message: response?.message ?? t('ui.common.somethingWrong'),
    });
  };

  const resend = async () => {
    if (secondsLeft > 0 || resendCount >= MAX_RESENDS) return;
    setResendCount((n) => n + 1);
    setOtp('');
    await requestOtp();
  };

  const verify = async (code = otp) => {
    // An OTP is single-use, so a second submission always fails. Both the
    // auto-submit on the 4th digit and the button can call this, and the button
    // stays tappable while the request is in flight, hence the guard.
    if (verifying) return;

    Keyboard.dismiss();
    setErrors({ identifier: '', otp: '', uid: '' });

    if (code.length !== OTP_LENGTH) {
      setErrors({ identifier: '', otp: t('ui.login.enterCode'), uid: '' });
      return;
    }
    if (hospitalUids.length > 1 && !selectedUid) {
      setErrors({ identifier: '', otp: '', uid: t('ui.login.morePatients') });
      return;
    }

    setVerifying(true);
    const ok = await login(userMobile, code, selectedUid);

    if (ok) {
      // B6: a guest who hit a locked action comes back to the step they left,
      // not to Home. Consumed here so a stale intent cannot redirect a later
      // login.
      const intent = await takePendingIntent();
      const resume = intent ? resumePathFor(intent) : null;

      // Leave `verifying` set: the root layout redirects on the auth state
      // change, and re-enabling the button mid-navigation invites a second tap.
      if (resume) {
        router.replace({
          pathname: resume.pathname as never,
          params: resume.params as never,
        });
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    setVerifying(false);
    setOtp('');
    setErrors({ identifier: '', otp: t('ui.common.invalidOtp'), uid: '' });
  };

  const backToIdentifier = () => {
    setStep('identifier');
    setOtp('');
    setOtpInfo('');
    setErrors({ identifier: '', otp: '', uid: '' });
    setResendCount(0);
    if (timer.current) clearInterval(timer.current);
    setSecondsLeft(0);
  };

  /* ------------------------------------------------------------------- render */

  return (
    <View style={styles.root}>
      <PremiumAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ visible: false, title: '', message: '' })}
      />

      <CallbackSheet
        visible={callback.visible}
        message={callback.message}
        submitting={sending}
        onSubmit={(name) => requestOtp(name)}
        onClose={() => setCallback({ visible: false, message: '' })}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'identifier' ? (
            <>
              <LoginHero step={0} />
              <IdentifierStep
                method={method}
                onMethod={(m) => {
                  setMethod(m);
                  setIdentifier('');
                  setErrors({ identifier: '', otp: '', uid: '' });
                }}
                identifier={identifier}
                onIdentifier={setIdentifier}
                error={errors.identifier}
                sending={sending}
                onSubmit={() => requestOtp()}
                onGuest={() => router.replace('/guest')}
              />
            </>
          ) : (
            <OtpStep
              mobile={userMobile}
              info={otpInfo}
              otp={otp}
              onOtp={setOtp}
              onComplete={verify}
              error={errors.otp}
              verifying={verifying}
              secondsLeft={secondsLeft}
              resendsLeft={MAX_RESENDS - resendCount}
              onResend={resend}
              onBack={backToIdentifier}
              uids={hospitalUids}
              selectedUid={selectedUid}
              onSelectUid={setSelectedUid}
              uidError={errors.uid}
              onVerify={() => verify()}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ================================================================= A1 */

function IdentifierStep({
  method,
  onMethod,
  identifier,
  onIdentifier,
  error,
  sending,
  onSubmit,
  onGuest,
}: {
  method: Method;
  onMethod: (m: Method) => void;
  identifier: string;
  onIdentifier: (v: string) => void;
  error: string;
  sending: boolean;
  onSubmit: () => void;
  onGuest: () => void;
}) {
  const t = useT();
  const isMobile = method === 'mobile';

  return (
    <View style={styles.body}>
      <Txt variant="title" style={styles.bodyTitle}>
        {t('ui.login.title')}
      </Txt>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => onMethod('mobile')}
          accessibilityRole="tab"
          accessibilityState={{ selected: isMobile }}
          style={[styles.tab, isMobile && styles.tabOn]}
        >
          <Txt variant="helper" color={isMobile ? PALETTE.midnight : TEXT.muted}>
            {t('ui.login.tabMobile')}
          </Txt>
        </Pressable>
        <Pressable
          onPress={() => onMethod('hospitalUid')}
          accessibilityRole="tab"
          accessibilityState={{ selected: !isMobile }}
          style={[styles.tab, !isMobile && styles.tabOn]}
        >
          <Txt variant="helper" color={!isMobile ? PALETTE.midnight : TEXT.muted}>
            {t('ui.login.tabUid')}
          </Txt>
        </Pressable>
      </View>

      <Field
        label={isMobile ? t('ui.login.mobileLabel') : t('ui.login.uidLabel')}
        // +91 is fixed, per the Rules table on A1.
        prefix={isMobile ? '+91' : undefined}
        value={identifier}
        onChangeText={(v) => onIdentifier(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={isMobile ? 10 : 12}
        placeholder={isMobile ? '' : t('ui.login.uidLabel')}
        autoComplete={isMobile ? 'tel' : 'off'}
        textContentType={isMobile ? 'telephoneNumber' : 'none'}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        error={error}
        containerStyle={styles.field}
      />

      <Btn
        label={t('ui.login.getOtp')}
        onPress={onSubmit}
        loading={sending}
        disabled={isMobile ? identifier.length !== 10 : identifier.length < 1}
        icon={<MessageCircle size={15} color={PALETTE.white} strokeWidth={2.2} />}
      />

      <Txt variant="helperSm" color={TEXT.muted} center style={styles.note}>
        {t('ui.login.newUserNote')}
      </Txt>

      {/* Divider + guest link, so "Explore without login" reads as the
          alternative route rather than a third button in the same stack. */}
      <View style={styles.orRow}>
        <View style={styles.rule} />
        <Pressable
          onPress={onGuest}
          accessibilityRole="button"
          hitSlop={10}
          style={styles.guestLink}
        >
          <Txt variant="helper" color={PALETTE.pink}>
            {t('ui.login.exploreWithoutLogin')}
          </Txt>
          <ChevronRight size={14} color={PALETTE.pink} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.rule} />
      </View>

      <Txt variant="helperSm" color={TEXT.muted} center style={styles.terms}>
        {t('ui.login.terms')}
      </Txt>
    </View>
  );
}

/* ================================================================= A2 */

function OtpStep({
  mobile,
  info,
  otp,
  onOtp,
  onComplete,
  error,
  verifying,
  secondsLeft,
  resendsLeft,
  onResend,
  onBack,
  uids,
  selectedUid,
  onSelectUid,
  uidError,
  onVerify,
}: {
  mobile: string;
  info: string;
  otp: string;
  onOtp: (v: string) => void;
  onComplete: (code: string) => void;
  error: string;
  verifying: boolean;
  secondsLeft: number;
  resendsLeft: number;
  onResend: () => void;
  onBack: () => void;
  uids: HospitalUidOption[];
  selectedUid: string;
  onSelectUid: (uid: string) => void;
  uidError: string;
  onVerify: () => void;
}) {
  const t = useT();
  const clock = `00:${String(secondsLeft).padStart(2, '0')}`;
  const canResend = secondsLeft === 0 && resendsLeft > 0;

  return (
    <View style={styles.otpWrap}>
      <View style={styles.otpHeader}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('ui.common.back')}
          hitSlop={10}
          style={styles.backBtn}
        >
          <ChevronLeft size={20} color={PALETTE.midnight} strokeWidth={2.4} />
        </Pressable>
        <Txt variant="title" style={styles.flex}>
          {t('ui.login.verifyTitle')}
        </Txt>
        <SosPill />
      </View>

      <Card tone="plain" style={styles.sentCard}>
        <View style={styles.sentRow}>
          <View style={styles.waBadge}>
            <MessageCircle size={14} color="#1FA855" strokeWidth={2.4} />
          </View>
          <View style={styles.flex}>
            <Txt variant="helper" color="#1B7A42">
              {info || t('ui.login.otpSentOn')}
            </Txt>
            <View style={styles.sentSub}>
              {/* Phone number stays Latin in both languages. */}
              <Txt variant="helperSm" color={TEXT.secondary} script="latin">
                +91 {mobile}
              </Txt>
              <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button">
                <Txt variant="helperSm" color={PALETTE.deepBlue} style={styles.link}>
                  {t('ui.common.change')}
                </Txt>
              </Pressable>
            </View>
          </View>
        </View>
      </Card>

      <Txt variant="helper" color={TEXT.secondary} style={styles.otpLabel}>
        {t('ui.login.enterCode')}
      </Txt>

      <OtpInput
        value={otp}
        onChange={onOtp}
        onComplete={onComplete}
        autoFocus
        error={!!error}
      />

      {error ? (
        <Txt variant="helperSm" color={PALETTE.sosRed} style={styles.otpError}>
          {error}
        </Txt>
      ) : null}

      <View style={styles.resendRow}>
        {secondsLeft > 0 ? (
          <Txt variant="helperSm" color={TEXT.muted}>
            {t('ui.login.resendIn', { time: clock })}
          </Txt>
        ) : (
          <Pressable
            onPress={onResend}
            disabled={!canResend}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Txt
              variant="helperSm"
              color={canResend ? PALETTE.deepBlue : TEXT.muted}
              style={canResend ? styles.link : undefined}
            >
              {t('ui.login.didntGet')}
            </Txt>
          </Pressable>
        )}

        <Txt variant="helperSm" color={TEXT.muted}>
          ·
        </Txt>

        {/* Section 04 asks for an SMS fallback. The backend currently only sends
            on WhatsApp, so this re-requests on the same endpoint; wiring a true
            `channel: 'sms'` needs a backend change, tracked with the open items
            rather than faked here. */}
        <Pressable
          onPress={onResend}
          disabled={!canResend}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Txt
            variant="helperSm"
            color={canResend ? PALETTE.deepBlue : TEXT.muted}
            style={canResend ? styles.link : undefined}
          >
            {t('ui.login.getSmsInstead')}
          </Txt>
        </Pressable>
      </View>

      <Btn
        label={t('ui.login.verifyContinue')}
        onPress={onVerify}
        loading={verifying}
        disabled={otp.length !== OTP_LENGTH}
        style={styles.verifyBtn}
      />

      {uids.length > 1 ? (
        <View style={styles.pickerWrap}>
          <PatientPicker
            options={uids}
            selected={selectedUid}
            onSelect={onSelectUid}
            error={uidError}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE.screen,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: SPACE.xxl,
  },
  /**
   * Spacing here is deliberate rather than a uniform `gap`: title and tabs
   * belong together, the field needs air above the button, and the legal line
   * sits apart from both. A single gap value made the whole screen read as one
   * loose column with empty space at the bottom.
   */
  body: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.xl,
  },
  bodyTitle: {
    marginBottom: SPACE.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: SURFACE.disabled,
    borderRadius: RADIUS.chip,
    padding: 3,
    marginBottom: SPACE.lg,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.chip - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: {
    backgroundColor: SURFACE.card,
  },
  field: {
    marginBottom: SPACE.lg,
  },
  note: {
    marginTop: SPACE.sm,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.xl,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: SURFACE.divider,
  },
  guestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: TOUCH_MIN,
  },
  terms: {
    marginTop: SPACE.lg,
    marginBottom: SPACE.lg,
  },

  otpWrap: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.xxl,
    gap: SPACE.md,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: TOUCH_MIN,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: SURFACE.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentCard: {
    backgroundColor: '#EAF8EF',
    borderColor: '#CDEBD8',
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  waBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D6F2E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  otpLabel: {
    marginBottom: -SPACE.xs,
  },
  otpError: {
    marginTop: -SPACE.xs,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    flexWrap: 'wrap',
    marginTop: -SPACE.xs,
  },
  link: {
    textDecorationLine: 'underline',
  },
  verifyBtn: {
    marginTop: SPACE.xxs,
  },
  pickerWrap: {
    marginTop: SPACE.xs,
  },
});
