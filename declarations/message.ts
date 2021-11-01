/*
 * message -
 * we will define the structure of a message and how it should be parsed
 * */
export class Mail {
    // we define the constructor
    private constructor(public header: Header, public message: Message, public attachments: Attachment[]) {}

    // we define a function that will be a factory for the Mail instance
    static fromParts({ header, attributes, attachments, body }: Parts): Mail {
        return new Mail(
            {
                // we will first spread the header to get
                ...header,

                from: {
                    name: header.from[0].split(' <')[0],
                    address: header.from[0].split(' <')[1].split('>')[0],
                },
                to: header.to.map((to: string) => {
                    return {
                        name: to.split(' <')[0],
                        address: to.split(' <')[1].split('>')[0],
                    };
                }),

                cc: header.cc?.map((to: string) => {
                    return {
                        name: to.split(' <')[0],
                        address: to.split(' <')[1].split('>')[0],
                    };
                }),
                bcc: header.bcc?.map((to: string) => {
                    return {
                        name: to.split(' <')[0],
                        address: to.split(' <')[1].split('>')[0],
                    };
                }),

                subject: header.subject[0],

                date: attributes.date,
            },
            {
                text: body,
            },
            attachments,
        );
    }
}

interface Header {
    // we capture the main recipient
    from: { name: string; address: string };
    to: { name: string; address: string }[];
    // then we model the extra recipients
    cc?: { name: string; address: string }[];
    bcc?: { name: string; address: string }[];
    // then the subject
    subject: string;
    // then the date
    date: Date;

    // we will then allow other headers that we are not aware of yet
    [header: string]: any;
}
interface Message {
    text: string;
}
interface Attachment {
    name: string;
    type: string;
    encoding: string;
    size: number;
    data: string;
    mime: Record<string, string>;
}

// we define a format data structure that illustrates the parts that the IMAP protocol returns mail in
interface Parts {
    // this is the header
    header: any;
    // these are the body parts
    body: string;
    mime: string;
    //
    attributes: any;
    attachments: any[];
}
