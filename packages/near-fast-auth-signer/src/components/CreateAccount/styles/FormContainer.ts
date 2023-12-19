import { styled } from 'styled-components';

const FormContainer = styled.form`
  max-width: 360px;
  width: 100%;
  margin: 16px auto;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 32px;

  header h1 {
    font: var(--text-2xl);
    font-weight: bold;
  }

  header .desc span {
    color: #706F6C;
  }
`;

export default FormContainer;
