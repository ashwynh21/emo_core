/*
 * pdf -
 * we define this test file to explore the functionality around the pdf lib package so that we understand the
 * functionality that we are getting around
 * */

import { describe, it } from 'mocha';
import { readFile } from 'fs';
import { PDFDocument } from 'pdf-lib';
// we have to import this parser like this because there arent any type definitions that i found
const PDF2JSON = require('pdf2json');

describe('pdf', () => {
    let buffer: string | Uint8Array | ArrayBuffer;
    let file: PDFDocument;

    // we will try to check if the file can be read in first
    it('should read a file in', () => {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            readFile(`${__dirname}\\test.pdf`, (error, buffer) => {
                if (error) reject(error);

                resolve(buffer);
            });
        }).then((file) => {
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
     * From here we will pass the pdf so that we are able to read the data coming in from the file then we will
     * need to remap the output json into a line by text array where each element represents a line in the pdf document.
     * With that done we should allow for the recognition of key indicators in the document
     * */
});
