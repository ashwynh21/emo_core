/*
 * application -
 * here we are going to define a base class that will extend the imap Connection definition so that we can configure
 * custom features to the client
 * */
import Connection, { Box, parseHeader } from 'imap';
import { EventEmitter, once } from 'events';
// we import reflect-meta for some decorators
import 'reflect-metadata';

interface Options {
    user: string;
    password: string;
    host: string;
    port: number;
}
export class Application extends EventEmitter {
    private context: Connection;
    inbox: Box | undefined;

    constructor(options: Options) {
        super();

        this.context = new Connection({
            ...options,
            tls: true,
            // we add this key so we do not get the self signed certificate error
            tlsOptions: { rejectUnauthorized: false },
        });

        // once constructed we will bind in the decorated functions for the event listeners
        this.context.on('ready', () => this.ready());
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

    // we define a function called listen which is very akin to server structures and it will run a couple of things
    listen(callback?: (...args: any[]) => void) {
        this.context.connect();
        if (callback) {
            this.on('ready', () => callback());
        }
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
            bodies: ['1', '1.MIME', '2', '2.MIME', '', 'HEADER'],
            struct: true,
        });

        // then we get each message
        once(result, 'message').then(([message, _]) => {
            const email: Record<string, string> = {};

            // then we listen for the message events
            message.on('body', async (stream: any, information: { which: string }) => {
                // then we write from the stream by combining the streams through the parser instance

                const buffer: Uint8Array[] = [];
                stream.on('data', (chunk: Uint8Array) => buffer.push(chunk));
                stream.on('end', () => {
                    email[information.which] = Buffer.concat(buffer).toString();
                });
            });
            message.on('end', async () => {
                // then we go through each stream and write to the parser
                this.emit('mail', {
                    HEADER: await parseHeader(email['HEADER']),
                    '1': email['1'].split('\r\n').join(''),
                    '2': email['2'],
                    '1.MIME': await parseHeader(email['1.MIME']),
                    '2.MIME': await parseHeader(email['2.MIME']),
                });
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
