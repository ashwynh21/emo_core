import { Application } from '../declarations/application';
import { Mail } from '../declarations/message';
import contacts from './contacts';

const app = new Application({
    user: 'ashwynh21@gmail.com',
    password: 'as28hw01yn95ho61rt00on',
    host: 'imap.gmail.com',
    port: 993,
});
app.listen(() => console.log('[index]: ready() - listening'));

app.on('mail', (mail: Mail) => {
    console.log('[index]: mail()', mail);
    // we now need to check if the email has an attachment and if it does then we check what it is
    if (!Object.keys(contacts).includes(mail.header.from.address)) {
        // then we cannot reply to this email
        return;
    }
    // now we check for attachments
    if (mail.attachments.length < 1) {
        // ... then we respond that there are no attachments present
    }
});
app.on('error', (error) => {
    console.log('[index]: error()', error);
});
