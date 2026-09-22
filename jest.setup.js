// AsyncStorage ships an official in-memory mock for tests; without it every
// module that imports it throws on the missing native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
