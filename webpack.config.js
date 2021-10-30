const path = require('path');
const externals = require('webpack-node-externals');

module.exports = {
    mode: 'development',

    context: path.join(__dirname, 'lib'),

    entry: {
        index: './index.ts'
    },

    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: ['ts-loader'],
                exclude: /node_modules/,
            },
            {
                test: /\.(json)$/,
                use: ['file-loader'],
                exclude: [__dirname],
            }
        ],
    },
    target: 'node',
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    externals: externals(),

    output: {
        filename: '[name].bundle.js',
        chunkFilename: '[name].bundle.js',
        path: path.resolve(__dirname, 'build')
    },
};
