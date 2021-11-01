/*
 * application -
 * here we are going to define a base class that will extend the imap Connection definition so that we can configure
 * custom features to the client
 * */
import Connection, { Box, parseHeader } from 'imap';
import { EventEmitter, once } from 'events';
// we import reflect-meta for some decorators
import 'reflect-metadata';
import { Mail } from './message';
import { Transporter, createTransport } from 'nodemailer';

interface Options {
    user: string;
    password: string;
    host: string;
    port: number;
}
export class Application extends EventEmitter {
    private context: Connection;
    private mailer: Transporter;

    inbox: Box | undefined;

    constructor(options: Options) {
        super();

        // we first setup the connection
        this.context = new Connection({
            ...options,
            tls: true,
            // we add this key so we do not get the self signed certificate error
            tlsOptions: { rejectUnauthorized: false },
        });
        // then we setup the mailer connection
        this.mailer = createTransport({});

        // once constructed we will bind in the decorated functions for the event listeners
        this.context.on('ready', () => this.ready());
    }

    // we define a function called listen which is very akin to server structures and it will run a couple of things
    listen(callback?: (...args: any[]) => void) {
        this.context.connect();
        if (callback) {
            this.on('ready', () => callback());
        }
    }
    // we define a function to send emails to a given address
    send() {
        //...
    }

    // We define a function that will bind functions of a class as a listener to an instance of a client reference
    private bind() {
        // we begin by getting any meta data tagged to this class instance as its target
        Reflect.getMetadataKeys(this).forEach((a) => {
            const { propertyKey, eventName } = Reflect.getMetadata(a, this) as {
                propertyKey: keyof Application;
                eventName: string;
            };

            // so we will check the typeof property to make sure it is a function then we will pass as the listener
            // callback to the corresponding eventName
            this.context.on(eventName, (...args: any[]) => (this[propertyKey] as (...args: any[]) => void)(...args));
        });
    }

    // we define a function that will handle a ready event after connecting
    private ready() {
        // so we should open the inbox so that we are able to go straight to the messages
        this.context.openBox('INBOX', true, (error, mailbox) => {
            if (error) return this.emit('error', error);

            this.inbox = mailbox;
            // we will emit the ready event with a mailbox instance so that a user is able to readily check the
            // mailbox structure
            this.bind();
            // then we emit a ready event
            return this.emit('ready', mailbox);
        });
    }

    // we add a function that will listen to or for new emails
    @listen()
    private mail() {
        // so we want this mail event to emit a parsed email object right
        const query = this.inbox?.messages.total ?? 0;
        const result = this.context.seq.fetch(`${query}:*`, {
            bodies: ['1', '1.MIME', '', 'HEADER'],
            struct: true,
        });

        // then we get each message
        once(result, 'message').then(([message, _]) => {
            const email: Record<string, any> = {};

            // then we listen for the message events
            message.on('body', (stream: any, information: { which: string }) => {
                // then we write from the stream by combining the streams through the parser instance

                const buffer: Uint8Array[] = [];
                stream.on('data', (chunk: Uint8Array) => buffer.push(chunk));
                stream.on('end', () => {
                    email[information.which] = Buffer.concat(buffer).toString();
                });
            });
            message.once('attributes', (attributes: { struct: Array<any>; uid: number }) => {
                // we will use this event to get any attachments that will be needed along
                email['attributes'] = attributes;
                // with the attributes we are going to need to get the attachments if there are any
                // now that we have the attachments we need to go through each one and fetch it
                email['attachments'] = Promise.all(
                    find_attachments(attributes.struct).map((attachment) => {
                        return new Promise((resolve, reject) => {
                            once(
                                this.context.fetch(attributes.uid, {
                                    bodies: [`${attachment.partID}`, `${attachment.partID}.MIME`, ''],
                                    struct: true,
                                }),
                                'message',
                            ).then(([message, _]) => {
                                const data: string[] = [];

                                message.on('body', (stream: EventEmitter) => {
                                    const buffer: Uint8Array[] = [];
                                    stream.on('data', (chunk: Uint8Array) => buffer.push(chunk));
                                    stream.on('error', (error: Error) => reject(error));
                                    stream.on('end', () => {
                                        data.push(Buffer.concat(buffer).toString());
                                    });
                                });
                                message.on('error', (error: Error) => reject(error));

                                message.on('end', async () => {
                                    resolve({
                                        name: attachment.params.name,
                                        type: attachment.type,
                                        encoding: attachment.encoding.toLowerCase(),
                                        size: attachment.size,
                                        data: data[0].split('\r\n').join(''),
                                        mime: data[1].split('\r\n').reduce((a, c) => {
                                            const [k, v] = c.split(': ');
                                            a[k] = v;
                                            return a;
                                        }, {} as Record<string, string>),
                                    });
                                });
                            });
                        });
                    }),
                );
            });
            message.on('end', async () => {
                // then we go through each stream and write to the parser
                this.emit(
                    'mail',
                    Mail.fromParts({
                        header: await parseHeader(email['HEADER']),
                        body: email['1'],
                        mime: email['1.MIME'].split('\r\n').reduce((a: any, c: string) => {
                            const [k, v] = c.split(': ');
                            a[k] = v;
                            return a;
                        }, {} as Record<string, string>),
                        attributes: email.attributes,
                        attachments: await email.attachments,
                    }),
                );
            });
        });
        result.on('error', (error) => this.emit('error', error));
    }
}

/**
 * A decorator function that will bind to the event listener of a client. the name of the event can be passed in
 * in case the function name does not match the desired event name
 * @param event string
 * */
export function listen(event?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        Reflect.defineMetadata(
            propertyKey,
            {
                // we spread any meta data that was already present,
                ...Reflect.getMetadata(propertyKey, target),
                propertyKey,
                eventName: event ?? propertyKey,
            },
            target,
        );
        return descriptor;
    };
}

/**
 * a helper function to get attachment information
 * */
function find_attachments(struct: Array<any>, attachments: any[] = []): typeof attachments {
    // so if 'c' is an array then
    return struct.reduce((a, c) => {
        if (c instanceof Array) {
            return find_attachments(c, a);
        }

        if (c.disposition && ['INLINE', 'ATTACHMENT'].indexOf(c.disposition.type?.toUpperCase()) > -1) {
            a.push(c);
        }
        return a;
    }, attachments);
}
