import { Application } from '../declarations/application';
import { Mail } from '../declarations/message';
import { attachmentNotFound } from './responses';

import contacts from './contacts';
import { parseFNB } from './templates';
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
            return new Promise((resolve, reject) => {
                const buffer = Buffer.from(attachment.data, 'base64');
                // from here we will need to parse the information through a pdf parsing instance.
                const parser = new PDF2JSON();
                // then we parse in the buffer
                const document = parser.parseBuffer(buffer);
                // now there are stream events that will be emitted by the parser that we will listen for to evaluate the
                // data in the file.
                parser.on('pdfParser_dataError', (error: Error) => reject(error));
                parser.on('pdfParser_dataReady', (data: any) => {
                    // then in here we will then run the conversion of the pdf
                    // so from here we will define a mapping function that will convert the json data into an array
                    try {
                        resolve(parsePDFJson(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        }),
    )
        // otherwise we should then consider the payment as valid and get the result
        .then((files: any[]) => {
            if (files.filter((a) => a instanceof Error).length > 0) {
                return app
                    .send({
                        ...email,
                        text: attachmentNotFound(mail.header.from.name ?? mail.header.from.address, 'Ashwyn Horton'),
                    })
                    .then(() => console.log('[index]: send()'));
            }
            // then we log
            const result = files.filter((a) => !(a instanceof Error)).map((a) => a.value);
            console.log(result);
        });
});
app.on('error', (error) => {
    console.log('[index]: error()', error);
});

// we define some helper functions
function parsePDFJson(data: any) {
    // so we now have a vague idea of what to expect from the json input so let us take a look, the end idea is to
    // convert the data to text and then return we will decide what to do with the data in another function.
    // so to start we will map the data still as an object but with a few differences
    const text = data.Pages.map((page: any) => page.Texts)
        .reduce((a: any[], c: any[]) => {
            a.push(...c);
            return a;
        }, [])
        .map((text: { R: any[] }) => decodeURIComponent(text?.R[0].T).toLowerCase())
        .join(' ')
        .split(' ')
        .filter((s: any) => s)
        .join(' ');
    // then finally we will resolve the file data that has been parsed.
    return {
        transcoder: data.Transcoder,
        meta: Object.entries(data.Meta).reduce((a, [k, v]: [string, any]) => {
            a[k.toLowerCase()] = v;
            return a;
        }, {} as any),
        text: parseFNB(text),
    };
}
