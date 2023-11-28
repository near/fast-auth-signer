import uuid from 'uuid';
import _ from 'lodash';


function generateNewEmail(baseEmail: string): string {
    const emailParts:Array<string> = baseEmail.split('@');
    const newEmailFront:string = emailParts[0].concat('+', uuid.v4());

  return emailParts[1].concat('@', newEmailFront);
};

