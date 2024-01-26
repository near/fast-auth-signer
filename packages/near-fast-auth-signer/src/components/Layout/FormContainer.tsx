import styled from 'styled-components';

const FormContainer = styled.form<{ inIframe?: boolean }>`
  width: 375px;
  margin: 16px auto;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  border: 1px solid #EEEEEC;
  box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.06), 0px 0px 0px 1px rgba(0, 0, 0, 0.06), 0px 12px 20px 0px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
  
  header {
    text-align: center;
    h1 {
      font: var(--text-xl);
      font-weight: bold;
    }
    .desc{
      margin-bottom: 1px;
    }
    .desc span {
      color: #706F6C;
    }
  }
  
  & > p {
    color: #706F6C;
    font-size: 14px;
  }

  button {
    width: 100%;
  }

  @media (min-width: 768px) {
      max-width: 380px;
  }

  ${(props) => props.inIframe && 'margin: 0; border-bottom: none; box-shadow: none;'}

  @media screen and (max-width: 767px) {
  // Height and width will be controlled by iFrame
    ${(props) => props.inIframe && `
        width: 100%;
        height: 100%;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      `}
  }
`;

export default FormContainer;
