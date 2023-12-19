import styled from 'styled-components';

export const LoginWrapper = styled.div`
  width: 100%;
  height: 100vh;
  background-color: #f2f1ea;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  padding-bottom: 60px;

  form {
    max-width: 360px;
    width: 100%;
    margin: 0 auto;
    background-color: #ffffff;
    padding: 25px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  button {
    margin-top: 20px;
  }

  @media only screen and (max-width: 500px) {
    align-items: flex-end;
    padding: 0;

    form {
      max-width: unset;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
  }
`;

export const InputContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  label {
    font-size: 12px;
    font-weight: 500;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    font-size: 14px;
    margin-top: 4px;
    min-height: 50px;
    cursor: text;

    &:focus {
      outline: none;
      border: 1px solid #e5e5e5;
    }
  }

  .subText {
    font-size: 12px;
  }
`;
