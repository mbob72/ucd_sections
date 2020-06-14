import path from "path";
import { Configuration } from "webpack";
import autoprefixer from "autoprefixer";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";

const Config = (): Configuration => ({
    entry: './src/index.ts',
    output: {
        path: path.join(__dirname, './lib'),
        filename: 'index.js',
        libraryTarget: 'umd'
    },
    mode: 'production',
    devtool: 'inline-source-map',
    resolve: {
        extensions: [ '.scss', '.sass', '.css', '.ts', '.tsx', '.js', '.jsx', '.d.ts' ]
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({eslint: true})
    ],
    externals: {
        'react': 'react',
        'react-router': 'react-router'
    },
    module: {
        rules: [
            {
                test: /\.(t|j)sx?$/,
                exclude: [ /node_modules/ ],
                loader: 'ts-loader',
                options: {
                    configFile: path.join(__dirname, './tsconfig.json'),
                    transpileOnly: true
                }
            },
            {
                enforce: 'pre',
                test: /\.js$/,
                loader: 'source-map-loader'
            },
            {
                test: /\.s[ac]ss$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            localIdentName: '[name]__[local]__[hash:base64:5]'
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: [
                                autoprefixer()
                            ],
                            sourceMap: true
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true
                        }
                    }
                ]
            }
        ]
    }
});

export default Config
