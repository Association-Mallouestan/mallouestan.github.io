const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");


module.exports = {
    entry: {
        common: './_tech/js/common.js',
        scripts: './_tech/js/scripts.js',
        notes: './_tech/js/notes.js',
        main: './_tech/js/main.js'
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'assets/js'),
        clean: true, // Clean the output directory before emit.
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    }
};