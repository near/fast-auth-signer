import styled from 'styled-components';

const InputContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  label {
    font-size: 14px;
    font-weight: 500;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #E3E3E0;
    border-radius: 10px;
    min-height: 50px;
    cursor: text;

   
  }

  .input-group-custom {
    margin-top: 4px;
    display: flex;

    &:focus {
      box-shadow: 0px 0px 0px 4px #CBC7F4;
    }
  }

  .input-group-custom.input-group-custom-success {
    input {
      background-color: #F5FFFA;
      color: #197650;
      border-color: #7AF5B8;
    }

    .input-group-right {
      background-color: #DCFEED;
      border-color: #7AF5B8;

      span {
        color: #197650;
      }
    }
  }

  .input-group-custom input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    flex: 1;

    &:focus {
      box-shadow: 0;
    }
  }

  .input-group-custom .input-group-right {
    background-color: #F9F9F8;
    border: 1px solid #E3E3E0;
    display: flex;
    padding: 0 1em;
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    border-left: 0;
  }

  .input-group-custom .input-group-right span {
    display: block;
    margin: auto;
    font-size: 22px;
    color: #706F6C;
  }

  .subText {
    font-size: 0.85rem;
    padding: 8px 0;

    .error {
      display: flex;
      align-items: center;
      color: #A81500;

      svg {
        margin-right: 5px;
      }

      span {
        flex: 1;
      }
    }
    
    .success {
      display: flex;
      align-items: center;
      color: #197650;
      
      svg {
        margin-right: 5px;
      }

      span {
        flex: 1;
      }
    }
  }
`;

export default InputContainer;
