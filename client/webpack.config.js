
const webpack = require('webpack')
const path = require('path')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

const extractSass = new ExtractTextPlugin({
    filename: '[name].css',
})

const NODE_ENV =
    process.env.NODE_ENV === 'production' ?
    'production' : 'development'

module.exports = {
    entry: './src/index.js',

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },

            {
                test: /\.scss$/,
                use: extractSass.extract({
                    use: [
                        {loader: 'css-loader'},
                        {loader: 'sass-loader'},
                    ],
                }),
            },
        ],
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(NODE_ENV),
            },
        }),

        NODE_ENV === 'production' && new UglifyJSPlugin(),
        extractSass,
    ].filter(v => v),

    devtool: 'source-map',

    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
}
