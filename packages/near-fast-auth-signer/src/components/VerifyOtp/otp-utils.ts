import { httpsCallable } from 'firebase/functions';

import { functions } from '../../utils/firebase';

export const sendOTP = async (email: string) => {
  const sendOTPFunction = httpsCallable(functions, 'sendOTP');
  try {
    const result = await sendOTPFunction({ email });
    return result.data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

export const verifyOTP = async (
  email: string,
  otp: string
): Promise<{ customToken: string }> => {
  const verifyOTPFunction = httpsCallable(functions, 'verifyOTP');
  try {
    const result = await verifyOTPFunction({ email, otp });
    return result.data as { customToken: string };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};
