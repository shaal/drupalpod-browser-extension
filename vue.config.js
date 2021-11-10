module.exports = {
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => ([{
        ...args[0],
        filename: 'popup.html',
        template: 'public/popup.html',
      }]));
  }
}