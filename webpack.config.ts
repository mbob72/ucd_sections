import path from "path";
import { Configuration } from "webpack";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import DeclarationBundlerPlugin from 'declaration-bundler-webpack-plugin';

const Config = (): Configuration => ({
    entry: './src/index.ts',
    output: {
        path: path.join(__dirname, './lib'),
        filename: 'index.js',
        libraryTarget: 'umd',
        library: 'ucd_sections'
    },
    mode: 'production',
    devtool: 'source-map',
    resolve: {
        extensions: [ '.ts', '.tsx', '.js', '.jsx' ]
    },
    plugins: [
        new DeclarationBundlerPlugin({
            moduleName:'ucd_sections',
            out:'./index.d.ts',
        }),
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
                exclude: [
                    /node_modules/,
                    /\.test\.(t|j)s$/
                ],
                loader: 'ts-loader',
                options: {
                    configFile: path.join(__dirname, './tsconfig.json'),
                    transpileOnly: true,
                    compiler: 'typescript'
                }
            },
            {
                enforce: 'pre',
                test: /\.(j|t)s$/,
                exclude: [
                    /\.test\.(t|j)s$/
                ],
                loader: 'source-map-loader'
            }
        ]
    }
});

export default Config
