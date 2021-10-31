import { Application } from '../declarations/application';

const app = new Application({
    user: 'ashwynh21@gmail.com',
    password: 'as28hw01yn95ho61rt00on',
    host: 'imap.gmail.com',
    port: 993,
});
app.listen(() => console.log('[index]: ready() - listening'));

app.on('mail', (mail) => {
    console.log('[index]: mail()', mail);
});
app.on('error', (error) => {
    console.log('[index]: error()', error);
});
