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
    resolve: {
        extensions: [ '.scss', '.sass', '.css', '.ts', '.tsx', '.js', '.jsx' ]
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({eslint: true})
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: [ /node_modules/ ],
                use: {
                    loader: 'ts-loader'
                },
                options: {
                    transpileOnly: true
                }
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
