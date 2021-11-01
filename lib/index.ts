import { Application } from '../declarations/application';
import { Mail } from '../declarations/message';
import { attachmentNotFound } from './responses';

import contacts from './contacts';
import { readPDF } from './templates';
// we will be using pdf lib to get the reading functionality working
const PDF2JSON = require('pdf2json');

const app = new Application({
    user: 'ashwynh21@gmail.com',
    password: 'as28hw01yn95ho61rt00on',
    host: 'imap.gmail.com',
    port: 993,
});
app.listen(() => console.log('[index]: ready() - listening'));

app.on('mail', async (mail: Mail) => {
    console.log('[index]: mail()');
    // we now need to check if the email has an attachment and if it does then we check what it is
    if (!Object.keys(contacts).includes(mail.header.from.address)) {
        // then we cannot reply to this email
        return;
    }
    // we define a base options structure for any emails that we will be sending.
    const email = {
        from: app.options.user,
        to: mail.header.from.address,
        subject: 'Invalid Payment',
    };
    // now we check for attachments
    if (mail.attachments.length < 1) {
        // ... then we respond that there are no attachments present
        // then we send the email
        return app
            .send({
                ...email,
                text: attachmentNotFound(mail.header.from.name ?? mail.header.from.address, 'Ashwyn Horton'),
            })
            .then(() => console.log('[index]: send()'));
    }

    // now if there is an attachment then we should check if we will be able to parse it as a pdf then check the
    // contents of the file instance. we will start by checking the MIME type of the attached files and look for pdf
    const pdf_attachments = mail.attachments.filter((c) => {
        const content = c.mime['Content-Type'];
        // so if the content string has the application/pdf string then it is a pdf and should allow it through
        return content.includes('application/pdf');
    });
    // now with the filter attachments we should check the length and return properly
    if (pdf_attachments.length < 1) {
        return app
            .send({
                ...email,
                text: attachmentNotFound(mail.header.from.name ?? mail.header.from.address, 'Ashwyn Horton'),
            })
            .then(() => console.log('[index]: send()'));
    }
    // otherwise we should be good to now check the integrity of the pdf attachments.
    // then we loop through the attachments
    const files = await Promise.allSettled(
        pdf_attachments.map((attachment) => {
            return readPDF(Buffer.from(attachment.data, 'base64'));
        }),
    )
        // otherwise we should then consider the payment as valid and get the result
        .then((files: any[]) => {
            if (files.filter((a) => a instanceof Error).length > 0) {
                app.send({
                    ...email,
                    text: attachmentNotFound(mail.header.from.name ?? mail.header.from.address, 'Ashwyn Horton'),
                }).then(() => console.log('[index]: send()'));
            }
            // then we log
            return files.filter((a) => !(a instanceof Error)).map((a) => a.value);
        });

    // at this point we will need to store the data to record a valid payment
});
app.on('error', (error) => {
    console.log('[index]: error()', error);
});
