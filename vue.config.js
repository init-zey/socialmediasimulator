const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: '/socialmediasimulator/',
  devServer: {
    proxy: {
      '/llmapi': {
        target: 'https://api.moonshot.cn/v1',
        changeOrigin: true,
        pathRewrite: { '^/llmapi': '' }
      }
    },
    title: "Social Sim"
  }
})
