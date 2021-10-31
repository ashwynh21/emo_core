/*
 * We will be testing out the imap functionality here
 * */
import { describe, it } from 'mocha';
import { expect } from 'chai';
// we will have the imap import here
import Connection, { Box, Config, parseHeader } from 'imap';
// we will import the static events package
import { once } from 'events';
// we are going to need promisify from the commonjs utils package
import { promisify } from 'util';

describe('application', () => {
    // we will start by creating an imap instance to see if we can link to any of my mail accounts

    // we will define the config setup for the account
    const configuration: Config = {
        user: 'ashwynh21@gmail.com',
        password: 'as28hw01yn95ho61rt00on',
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        // we add this key so we do not get the self signed certificate error
        tlsOptions: { rejectUnauthorized: false },
    };
    // the we will define the imap instance
    describe('imap', () => {
        const imap = new Connection(configuration);
        let box: Box | undefined;

        // we should try connecting to my mail account using the information in the configuration instance
        it('should connect to my email account', () => {
            // so we will will listen first for the imap instance ready event then call connect
            const ready = once(imap, 'ready').then((extra) => {
                // then we can interact with the mailer instance
                // the callback args shouldn't be undefined so
                expect(extra).to.be.instanceof(Array);

                return extra;
            });
            // then connect
            imap.connect();

            // then return the promise
            return ready;
        })
            // we will give it a bit to get the connection
            .timeout(10e3);

        // so once the account is ready we should start exploring and testing the different stuff that the environment
        // can do

        // lets see what happens when we open the inbox
        it('should open the inbox', () => {
            return promisify((name: string, cb: any) => imap.openBox(name, true, cb))('INBOX').then((inbox) => {
                box = inbox as Box;
                return box;
            });
        });
        // so now we should check if we can catch e specific event, say an incoming email.
        it('should listen for incoming emails', () => {
            return once(imap, 'mail');
        })
            // we will send the email
            .timeout(6e4);

        // the moment the above is resolved we should be able to get the contents of the new mail
        it('should get the contents of the new email', () => {
            // we get the new mail first
            const query = box?.messages.total ?? 0;

            return once(
                imap.seq.fetch(`${query}:*`, {
                    bodies: ['1', '1.MIME', '2', '2.MIME', '', 'HEADER'],
                    struct: true,
                }),
                'message',
            ).then(async ([message, _]) => {
                return new Promise<any>((resolve) => {
                    // we define a stream array
                    const email: Record<string, string> = {};

                    // then we listen for the message events
                    message.on('body', async (stream: any, information: { which: string }) => {
                        // then we write from the stream by combining the streams through the parser instance
                        email[information.which] = await new Promise<string>((resolve) => {
                            const buffer: Uint8Array[] = [];
                            stream.on('data', (chunk: Uint8Array) => buffer.push(chunk));
                            stream.on('end', () => resolve(Buffer.concat(buffer).toString()));
                        });
                    });
                    message.on('end', async () => {
                        // then we go through each stream and write to the parser
                        resolve(email);
                    });
                }).then(async (email) => {
                    return {
                        HEADER: await parseHeader(email['HEADER']),
                        '1': email['1'].split('\r\n').join(''),
                        '2': email['2'],
                        '1.MIME': await parseHeader(email['1.MIME']),
                        '2.MIME': await parseHeader(email['2.MIME']),
                    };
                });
            });
        }).timeout(1e4);
    });
});
