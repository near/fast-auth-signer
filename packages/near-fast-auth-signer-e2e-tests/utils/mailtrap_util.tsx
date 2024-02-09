import { MailtrapClient } from "mailtrap";
import { format } from 'date-fns';

class MailtrapUtil {
    // Define properties

    private TOKEN = '9a0b05a097220401bbe4709b353369d1';
    private TEST_INBOX_ID = 0;
    private ACCOUNT_ID = 1750418;

    private client = new MailtrapClient({ token: this.TOKEN, testInboxId: this.TEST_INBOX_ID, accountId: this.ACCOUNT_ID });
    private inboxesClient = this.client.testing.inboxes;
    private messagesClient = this.client.testing.messages;
    private dateTimeStamp: Date;

    // you must get a timestamp to use public methods. It will use this to find the most relevant message based on email address + timestamp.

    // Define methods

    public CheckFormattedDate (dateTimeStamp: Date) {
       return this.ReturnFormattedDateTime(dateTimeStamp);
    }

    /*  private async dateFormatModule() {
        const { default: dateFormat } = await import('dateformat');
        return dateFormat();
    } */

    private ReturnFormattedDateTime(timestamp: Date): string {  
        return format(timestamp, "yyyy MMMM dd HH");
    }

    private GetTargetEmailHTMLBody(email_list: Array<any>) {

    }

    public GetSignInLink(email: string, timestamp: number): string {
        return email;
    }
}

export default MailtrapUtil;