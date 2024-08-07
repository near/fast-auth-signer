import { getAuth, signInWithCustomToken } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

// import EmailSvg from './icons/EmailSvg';
import { sendOTP, verifyOTP } from './otp-utils';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import { Button } from '../../lib/Button';
import { openToast } from '../../lib/Toast';
import { decodeIfTruthy, inIframe } from '../../utils';
import { FormContainer, StyledContainer } from '../Layout';

function PinInput({ length = 6, onComplete }) {
  const [pin, setPin] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0].focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value !== '' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }

    if (newPin.every((digit) => digit !== '')) {
      onComplete(newPin.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
      {pin.map((digit, index) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          data-test-id={`otp-input-${index}`}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          data-lpignore="true"
          style={{
            width:            '40px',
            height:           '40px',
            fontSize:         '20px',
            textAlign:        'center',
            borderRadius:     '8px',
            border:           '1px solid #ccc',
            display:          'flex',
            justifyContent:   'center',
            alignItems:       'center',
            padding:          0,
            WebkitAppearance: 'none',
            MozAppearance:    'textfield'
          }}
        />
      ))}
    </div>
  );
}

const VerifyForm = styled(FormContainer)`
  height: 315px;
  text-align: center;
  gap: 7px;
  align-items: center;
  header p {
    color: #604CC8;
    margin-bottom: 1px;
  }

  p {
    margin-bottom: 1px;
  }

  svg {
    width: 100px;
  }
`;

function VerifyOtpPage() {
  const verifyRef = useRef(null);
  // Send form height to modal if in iframe
  useIframeDialogConfig({ element: verifyRef.current });

  const [inFlight, setInFlight] = useState(false);

  const [pinCode, setPinCode] = useState('');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = decodeIfTruthy(searchParams.get('email'));

  const handleSubmitPin = async (pin) => {
    try {
      setInFlight(true);
      const { customToken } = await verifyOTP(email, pin);
      const auth = getAuth();
      await signInWithCustomToken(auth, customToken);
      navigate({
        pathname: '/auth-callback',
        search:   searchParams.toString(),
      });
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      //   redirectWithError({ success_url, failure_url, error });

      openToast({
        type:  'ERROR',
        title: error?.message ?? 'Something went wrong',
      });
    } finally {
      setInFlight(false);
    }
  };

  useEffect(() => {
    window.parent.postMessage(
      {
        type:   'method',
        method: 'query',
        id:     1234,
        params: {
          request_type: 'complete_authentication',
        },
      },
      '*'
    );
  }, []);

  return (
    <StyledContainer inIframe={inIframe()}>
      <VerifyForm
        ref={verifyRef}
        inIframe={inIframe()}
        onSubmit={handleSubmitPin}
      >
        {/* <EmailSvg /> */}
        <header>
          <h1>Check Your Email</h1>
        </header>

        <p>
          Enter the code sent to
          {' '}
          <b>{email}</b>
        </p>
        <p data-test-id="verify-email-address">
          Need a new code?
          {' '}
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <Link
            onClick={async (e) => {
              e.preventDefault();
              console.log('sending', email);
              try {
                await sendOTP(email);
              } catch (error) {
                console.error('Failed to send OTP:', error);
              }
            }}
            to=""
          >
            <b>Resend Email</b>
          </Link>
        </p>

        <PinInput onComplete={(pin) => setPinCode(pin)} />

        <Button
          variant="affirmative"
          size="large"
          label={inFlight ? 'Loading...' : 'Submit'}
          disabled={inFlight || !pinCode}
          data-test-id="submit-otp-button"
          onClick={() => handleSubmitPin(pinCode)}
        />
      </VerifyForm>
    </StyledContainer>
  );
}

export default VerifyOtpPage;
