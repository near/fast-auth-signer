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
    margin: 16px auto;
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
`;
