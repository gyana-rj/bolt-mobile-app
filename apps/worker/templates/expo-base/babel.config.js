module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 54) automatically wires up the
    // react-native-worklets/reanimated babel plugin, so no manual plugin is
    // needed here — adding it would register the worklets plugin twice.
    presets: ["babel-preset-expo"],
  };
};
