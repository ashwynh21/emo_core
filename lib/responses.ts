/*
 * responses -
 * we define a set of functions that will generate the responses that will go out to the user, this is just a temp
 * mockup and a scaled solution would use a data store like a database
 * */

export function attachmentNotFound(to: string, from: string) {
    return (
        `Hi ${to},\r\n` +
        '\r\n' +
        'Your payment could not be processed, please make sure that you have a valid proof\r\n' +
        'of payment attached your the email.\r\n' +
        '\r\n' +
        'Sincerely,\r\n' +
        '\r\n' +
        `${from}`
    );
}
