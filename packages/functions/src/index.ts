import * as crypto from 'crypto';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const SENDER_EMAIL = process.env.GMAIL_SENDER;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;

if (!SENDER_EMAIL || !GMAIL_PASSWORD) {
  throw new Error('Sender email and password must be set as environment variables.');
}

const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   465,
  secure: true,
  auth:   {
    user: SENDER_EMAIL,
    pass: GMAIL_PASSWORD,
  },
});

export const sendOTP = functions.https.onCall(
  async (data: { email: string }, _context) => {
    const { email } = data;

    const otp = crypto.randomInt(100000, 999999).toString();

    const otpDoc = admin.firestore().collection('otps').doc(email);
    await otpDoc.set({
      otp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 10 * 60 * 1000)
      ), // 10 minutes expiration
    });

    const now = new Date();
    const formattedDate = now.toISOString().replace(/T/, ' ').replace(/\..+/, ' Z');

    const emailContent = `Hello,

We received a request to sign in to NEAR Onboarding using this email address, at ${formattedDate}. If you want to sign in with your ${email} account, use this code:

${otp}

If you did not request this link, you can safely ignore this email.

Thanks,

Your NEAR Onboarding team`;

    await transporter.sendMail({
      from:    SENDER_EMAIL,
      to:      email,
      subject: `Sign in to NEAR Onboarding requested at ${formattedDate}`,
      text:    emailContent,
    });

    return { success: true, message: 'OTP sent successfully' };
  }
);

export const verifyOTP = functions
  .runWith({ timeoutSeconds: 60 })
  .https.onCall(async (data: { email: string; otp: string }, _context) => {
    const { email, otp } = data;

    const otpDoc = await admin.firestore().collection('otps').doc(email).get();

    if (!otpDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'No OTP request found for this email'
      );
    }

    const otpData = otpDoc.data();

    if (!otpData || otpData.otp !== otp) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP');
    }

    if (otpData.expiresAt.toDate() < new Date()) {
      throw new functions.https.HttpsError(
        'deadline-exceeded',
        'OTP has expired'
      );
    }

    let uid: string;
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      uid = userRecord.uid;
    } catch (error) {
      const newUser = await admin.auth().createUser({ email });
      uid = newUser.uid;
    }

    const customToken = await admin.auth().createCustomToken(uid);

    await otpDoc.ref.delete();

    return { success: true, customToken };
  });
