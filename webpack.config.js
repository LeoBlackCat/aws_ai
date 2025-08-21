const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const publicPath = process.env.PUBLIC_URL || '/';
  
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      clean: true,
      publicPath: publicPath
    },
    
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
                ['@babel/preset-react', { runtime: 'automatic' }]
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-transform-runtime'
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('tailwindcss'),
                    require('autoprefixer')
                  ]
                }
              }
            }
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name].[hash][ext]'
          }
        },
        {
          test: /\.(mp3|wav|ogg|m4a)$/,
          type: 'asset/resource',
          generator: {
            filename: 'audio/[name].[hash][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash][ext]'
          }
        },
        {
          test: /\.md$/,
          type: 'asset/source'
        }
      ]
    },
    
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
          REACT_APP_OPENAI_API_KEY: JSON.stringify(process.env.REACT_APP_OPENAI_API_KEY),
          REACT_APP_APP_NAME: JSON.stringify(process.env.REACT_APP_APP_NAME || 'AI Assessment Trainer'),
          REACT_APP_VERSION: JSON.stringify(process.env.REACT_APP_VERSION || '1.0.0'),
          REACT_APP_MAX_QUESTIONS_PER_SESSION: JSON.stringify(process.env.REACT_APP_MAX_QUESTIONS_PER_SESSION || '50'),
          REACT_APP_DEFAULT_EVALUATION_THRESHOLD: JSON.stringify(process.env.REACT_APP_DEFAULT_EVALUATION_THRESHOLD || '70'),
          REACT_APP_ENABLE_REALTIME_API: JSON.stringify(process.env.REACT_APP_ENABLE_REALTIME_API || 'true'),
          REACT_APP_ENABLE_SPEECH_RECOGNITION: JSON.stringify(process.env.REACT_APP_ENABLE_SPEECH_RECOGNITION || 'true'),
          REACT_APP_ENABLE_TEXT_TO_SPEECH: JSON.stringify(process.env.REACT_APP_ENABLE_TEXT_TO_SPEECH || 'true')
        }
      }),
      
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
        inject: 'body',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),
      
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'data',
            to: 'data',
            noErrorOnMissing: true
          },
          {
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ['**/index.html']
            },
            noErrorOnMissing: true
          }
        ]
      })
    ],
    
    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@data': path.resolve(__dirname, 'data')
      }
    },
    
    devServer: {
      static: {
        directory: path.join(__dirname, 'public')
      },
      compress: true,
      port: 3000,
      hot: true,
      open: true,
      historyApiFallback: true,
      client: {
        overlay: {
          errors: true,
          warnings: false
        }
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      },
      setupMiddlewares: (middlewares, devServer) => {
        // Add middleware for serving markdown files with correct MIME type
        devServer.app.get('/data/*.md', (req, res, next) => {
          res.type('text/markdown');
          next();
        });
        return middlewares;
      }
    },
    
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10
          },
          openai: {
            test: /[\\/]node_modules[\\/]openai[\\/]/,
            name: 'openai',
            chunks: 'all',
            priority: 20
          }
        }
      },
      usedExports: true,
      sideEffects: false
    },
    
    performance: {
      maxAssetSize: 512000,
      maxEntrypointSize: 512000,
      hints: isProduction ? 'warning' : false
    },
    
    devtool: isProduction ? 'source-map' : 'eval-source-map'
  };
};
