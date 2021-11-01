/*
 * pdf -
 * we define this test file to explore the functionality around the pdf lib package so that we understand the
 * functionality that we are getting around
 * */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { readFile } from 'fs';
import { PDFDocument } from 'pdf-lib';
import { parseFNB } from '../lib/templates';
// we have to import this parser like this because there arent any type definitions that i found
const PDF2JSON = require('pdf2json');

describe('pdf', () => {
    let buffer: string | Uint8Array | ArrayBuffer;
    let file: PDFDocument;

    // we will try to check if the file can be read in first
    it('should read a file in', () => {
        return getFile(`${__dirname}\\test.pdf`).then((file) => {
            buffer = file;
        });
    });

    // now we should expect it to be able to parse the file.
    it('should parse the buffer through', () => {
        return PDFDocument.load(buffer, { ignoreEncryption: true }).then((document) => {
            // we generally do not expect errors
            file = document;
        });
    });

    // so now we should be able to read the text from the file once loaded
    it('should read the text from document', () => {
        return new Promise((resolve, reject) => {
            const parser = new PDF2JSON();
            parser.on('pdfParser_dataError', (error: any) => reject(error));
            parser.on('pdfParser_dataReady', (data: any) => {
                resolve(data);
            });
            parser.parseBuffer(buffer);
        });
    })
        // we will allow some time to pass so we are able to explore and debug
        .timeout(3e3);

    /*
     * We should start the definition of the file data extraction by testing some of the features that we have defined
     * in the application files
     * */
    it('should be able to read and parse the document', () => {
        return checkFile(buffer);
    });

    it('should fail to validate a normal pdf', () => {
        return getFile(`${__dirname}\\fail.pdf`).then((file) => {
            return checkFile(file).catch((error) => expect(error).to.not.be.undefined);
        });
    });
});

//...
function getFile(file: string) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        readFile(file, (error, buffer) => {
            if (error) reject(error);

            resolve(buffer);
        });
    });
}

function checkFile(buffer: any) {
    return new Promise((resolve, reject) => {
        const parser = new PDF2JSON();
        // then we parse in the buffer
        const document = parser.parseBuffer(buffer);
        // now there are stream events that will be emitted by the parser that we will listen for to evaluate the
        // data in the file.
        parser.on('pdfParser_dataError', (error: Error) => reject(error));
        // then we capture the data with the on data ready event on the object
        parser.on('pdfParser_dataReady', (data: any) => {
            // then in here we will then run the conversion of the pdf
            // so from here we will define a mapping function that will convert the json data into an array
            let text = data.Pages.map((page: any) => page.Texts)
                .reduce((a: any[], c: any[]) => {
                    a.push(...c);
                    return a;
                }, [])
                .map((text: { R: any[] }) => decodeURIComponent(text?.R[0].T).toLowerCase())
                .join(' ')
                .split(' ')
                .filter((s: any) => s)
                .join(' ');
            // we will log the input text then we will log the parsed document version of the instance

            try {
                const parsed = {
                    transcoder: data.Transcoder,
                    meta: Object.entries(data.Meta).reduce((a, [k, v]: [string, any]) => {
                        a[k.toLowerCase()] = v;
                        return a;
                    }, {} as any),
                    text: parseFNB(text),
                };
                resolve(parsed);
            } catch (error) {
                reject(error);
            }

            // then we log the output to make sure that the data is the way we need it to be then we will set the
            // expectations
        });
    });
}
