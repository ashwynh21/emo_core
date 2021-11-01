/*
 * We define a structure map that will serve as a guide when defining how to extract the information that will be on a
 * given proof of payment
 * fnb - a proof of payment coming from fnb will be identified as valid from the following information points.
 * 1. it will have a 'date actioned' field that will have the date on it,
 * 2. it will also have the time actioned field which will have the time on it
 * 3. it will have a trace id which is important in validating the file when referenced on the fnb network
 * 4. it will have the payment information as in the name of the individual paying the funds
 *    or the amount that the payment was for
 * 5. it will have the account number but only a piece of the account number for the account holder to confirm that
 *    the funds came from their account that is the correct account.
 * 6. it will have the bank profile on it, that is, the banks name, the branch number of the bank, and the reference
 *    as specified by the user.
 *
 * #notes - here is a description of extra information that will be found on the document of the proof of payment
 *
 * 1. the header of the file will have a notification statement prefixed by 'NOTIFICATION OF PAYMENT', and tailed by
 *    'END OF NOTIFICATION'
 * 2. after the header there will be some text with instructions on how to validate the file from the fnb website, it
 *    is tailed by '. .' which can be split or trimmed off the text.
 * 3. the end of the file will have information about the signaturies of the company which is pretty useless but can be
 *    useful nonetheless.
 * */

export function parseFNB(text: string) {
    // let us start by taking out the header and the trailing footer of the text file
    let [header, a] = text.split('end of notification');
    header = header.replace('notification of payment', '').replace(/\n/, '').trim();
    // now that we have the header, body and the footer we can deconstruct the body
    let [instruction, ...b] = a.split('. . . ');
    instruction = instruction.trim();
    // now we get the date actioned field which we will combine with the time actioned to generate a data instance
    const [t, ...c] = b.join('. . . ').split('trace id');
    const [_, date, time] = t.trim().split(' : ');
    const [trace_id, ...d] = c.join('').split(' . . . . ');
    const [from, ...e] = d.join(' ').split(' - ');
    const [type, ...f] = e.join(' - ').split(' cur/amount : ');
    const [amount, ...g] = f.join('').split(' ');
    const [account, ...h] = g.join(' ').split(' name : ');
    const [payment, ...i] = h.join('').split(' bank : ');
    const [bank, ...j] = i.join('').split(' branch code : ');
    const [branch, ...k] = j.join('').split(' reference : ');
    const [reference, ...footer] = k.join('').split(' directors: ');

    // we will return the data for now in a paragraphed format while we work it in
    return {
        header: {
            title: header,
            instruction,
        },
        payer: {
            name: from.split(' : ')[1],
            type,
            account: Number(account.split(': . . ')[1]),
        },
        trace_id: trace_id.split(' : ')[1],
        payment,
        amount,
        bank,
        branch: Number(branch),
        reference,
        date: new Date(`${date.split(' ')[0]} ${time}`),

        // then the remains are the footer
        footer: footer.join(''),
    };
}
