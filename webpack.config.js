const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");


module.exports = {
    entry: {
        common: './_tech/assets/js/common.js',
        scripts: './_tech/assets/js/scripts.js',
        notes: './_tech/assets/js/notes.js',
        main: './_tech/assets/js/main.js',
        sw: {import: "./_tech/assets/js/sw.js", filename: '../../sw.js'}
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