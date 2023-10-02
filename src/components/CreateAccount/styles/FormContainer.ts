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

  header h1 {
    font: var(--text-2xl);
    font-weight: bold;
  }

  header .desc span {
    color: #706F6C;
  }

  .select-mail-provider {
    display: flex;
    margin-top: 7px;
  }

  .select-mail-provider .mail-provider {
    border: 1px solid #E3E3E0;
    border-radius: 50px;
    padding: 3px 8px;
    font-size: 12px;
    cursor: pointer;
    box-shadow: 0px 1px 2px 0px #0000000F;
  }

  .select-mail-provider .mail-provider:hover {
    background-color: #F3F3F2;
  }

  .select-mail-provider .mail-provider + .mail-provider {
    margin-left: 5px;
  }

  .select-mail-provider .mail-provider-selected {
    background-color: #E3E1F9;
    border-color: #928BE4;
  }
  button {
    margin-top: 15px;
  } 
`;

export default FormContainer;
