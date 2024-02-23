export const setLocalStorageItem =  (key: string, value: string) => {
  document.hasStorageAccess().then((hasAccess) => {
    if (hasAccess) {
      localStorage.setItem(key, value);
      console.log(`${key} set in storage.`);
    } else {
      console.log(`Requesting storage access to set ${key}...`);
      document.requestStorageAccess().then(() => {
        localStorage.setItem(key, value);
        console.log(`Storage access granted, ${key} set.`);
      }).catch((err) => {
        console.error('Storage access denied', err);
      });
    }
  });
};
// Function to retrieve the test string from storage
export const getLocalStorageItem =  (key: string) => {
  document.hasStorageAccess().then((hasAccess) => {
    if (hasAccess) {
      const value = localStorage.getItem(key);
      console.log(`${key} retrieved ${value} as in storage: `);
      // eslint-disable-next-line no-alert
      return value;
    }
    console.log('Storage access needed to retrieve test string.');
    return undefined;
  });
  return undefined;
};
