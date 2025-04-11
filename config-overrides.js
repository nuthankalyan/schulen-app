module.exports = function override(config, env) {
  // Add fallbacks for node core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "stream": require.resolve("stream-browserify"),
    "https": require.resolve("https-browserify"),
    "http": require.resolve("stream-http"),
    "url": require.resolve("url"),
    "util": require.resolve("util/"),
    "zlib": require.resolve("browserify-zlib"),
    "assert": require.resolve("assert/"),
    "buffer": require.resolve("buffer/"),
    "process": require.resolve("process/browser"),
  };

  return config;
}; 