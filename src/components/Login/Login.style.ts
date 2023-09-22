import styled from 'styled-components';

export const LoginWrapper = styled.div`
  width: 100%;
  height: calc(100vh - 66px);
  background-color: #f2f1ea;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;

  form {
    max-width: 450px;
    width: 100%;
    margin: 16px auto;
    background-color: #ffffff;
    padding: 16px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .buttonsContainer {
  }
`;

export const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  button {
    margin: 5px;
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
