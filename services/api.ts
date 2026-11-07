import AsyncStorage from '@react-native-async-storage/async-storage';
import { Patient, Document, Notification, AuthData } from '../types';
import {
  fetchWrapper,
  BASE_URL,
  APP_VERSION,
  DEVICE_DATA,
} from '@/utils/fetchWrapper';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const patientApi = {
  sendOTP: async (
    identifier: string,
    patientname: string
  ): Promise<{
    success: boolean;
    otp_id?: string;
    message?: string;
    mobile?: string;
    hospitalUids?: any[];
    code?: number;
    data?: any;
  }> => {
    try {
      const data = await fetchWrapper<any>('/sendOTP', {
        method: 'POST',
        body: { identifier, patientname },
        skipAuth: true,
      });

      console.log({ data }, data.code);

      if (data.code !== 1) {
        return {
          success: false,
          message: data.message || 'Failed to send OTP',
          code: data.code,
          data: data.data,
          mobile: data?.data?.mobile,
        };
      }

      return {
        success: true,
        otp_id: data.data.otp_id,
        message: data.message || 'OTP sent successfully',
        mobile: data.data.mobile,
        hospitalUids: data.data.hospitalUids,
        code: data.code,
        data: data.data,
      };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, message: 'Network or server error' };
    }
  },

  login: async (
    mobile: string,
    otp: string,
    otp_id?: string,
    selectedHospitalUid?: string
  ): Promise<{ success: boolean; authData?: AuthData; message?: string }> => {
    try {
      const data = await fetchWrapper<any>('/verifyOTP', {
        method: 'POST',
        body: { mobile, otp, otp_id, hospitalUid: selectedHospitalUid },
        skipAuth: true,
      });

      return {
        success: true,
        authData: data.data,
      };
    } catch (err: any) {
      console.error('Login error:', err);
      return {
        success: false,
        message: err.message || 'Network or server error',
      };
    }
  },

  logout: async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        console.warn('No access token found for logout');
        return { success: false, message: 'No active session' };
      }

      const data = await fetchWrapper<any>('/logout', {
        method: 'GET',
        token,
      });

      await AsyncStorage.multiRemove([
        'access_token',
        'token_expiresAt',
        'otp_id',
      ]);

      return {
        success: true,
        message: data.message || 'Logged out successfully',
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { success: false, message: 'Network or server error' };
    }
  },

  getPatientDetails: async (): Promise<Patient | null> => {
    const data = await fetchWrapper<any>('/getPatientDetails', {
      method: 'GET',
    });

    return data.data || null;
  },
};

export const documentApi = {
  getPatientDocuments: async (): Promise<any[] | null> => {
    try {
      const data = await fetchWrapper<any>('/getPatientDocuments', {
        method: 'GET',
      });

      console.log({ data });

      return data?.data?.length ? data.data : [];
    } catch (error) {
      console.error('Get Patient Documents error:', error);
      return null;
    }
  },
};

/*
 * `notificationApi` has been removed.
 *
 * It returned three hardcoded notifications — including "Your Complete Blood
 * Count Report has been uploaded" for a report that does not exist — and the
 * Notifications screen was left deliberately empty rather than render them,
 * because showing a cancer patient a fabricated result about their own tests
 * is not a placeholder.
 *
 * The real list lives in services/appNotifications.ts, against the backend
 * endpoints that now record every notification sent.
 */

export const pushTokenApi = {
  registerToken: async (
    patientId: string,
    token: string,
    deviceInfo: any
  ): Promise<boolean> => {
    await delay(500);
    console.log('Registering push token:', { patientId, token, deviceInfo });
    return true;
  },

  unregisterToken: async (
    patientId: string,
    token: string
  ): Promise<boolean> => {
    await delay(300);
    console.log('Unregistering push token:', { patientId, token });
    return true;
  },
};

export const appointmentApi = {
  getPatientAppointments: async (): Promise<any[] | null> => {
    try {
      const data = await fetchWrapper<any>('/getPatientAppointments', {
        method: 'GET',
      });

      return data?.data?.length ? data.data : [];
    } catch (error) {
      console.error('Get Patient Documents error:', error);
      return null;
    }
  },
};
