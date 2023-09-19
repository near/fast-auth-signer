import { User } from 'firebase/auth';
import {
  getFirestore, Firestore, collection, setDoc, getDoc, getDocs, query, doc, updateDoc, CollectionReference, writeBatch
} from 'firebase/firestore';
import UAParser from 'ua-parser-js';

import FastAuthController from './controller';
import { network, networkId } from '../utils/config';
import { checkFirestoreReady, firebaseApp, firebaseAuth } from '../utils/firebase';
import { getDeleteKeysAction } from '../utils/mpc-service';
import { Device } from '../utils/types';

class FirestoreController {
  private firestore: Firestore;

  private userUid: string;

  private oidcToken: string;

  private isReady: boolean;

  private existingDeviceId: string | null;

  constructor() {
    this.firestore = getFirestore(firebaseApp);

    firebaseAuth.onIdTokenChanged(async (user: User) => {
      if (!user) {
        return;
      }
      this.userUid = user.uid;
      // @ts-ignore
      this.oidcToken = user.accessToken;
      this.isReady = true;
    });

    checkFirestoreReady();
  }

  async getAccountIdFromOidcToken() {
    const recoveryPK = await window.fastAuthController.getUserCredential(this.oidcToken);
    const accountIds = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${recoveryPK}/accounts`)
      .then((res) => res.json())
      .catch((err) => {
        console.log(err);
        throw new Error('Unable to retrieve account Id');
      });
    return accountIds[0];
  }

  async addDeviceCollection({
    fakPublicKey,
    lakPublicKey,
  }) {
    const parser = new UAParser();
    const device = parser.getDevice();
    const os = parser.getOS();
    const browser = parser.getBrowser();

    // setDoc will overwrite existing document or create new if not exist
    return setDoc(doc(this.firestore, `/users/${this.userUid}/devices`, fakPublicKey), {
      device:     `${device.vendor} ${device.model}`,
      os:         `${os.name} ${os.version}`,
      browser:    `${browser.name} ${browser.version}`,
      publicKeys: [fakPublicKey, lakPublicKey],
      uid:        this.userUid,
    }, { merge: true }).catch((err) => {
      console.log('fail to add device collection, ', err);
      throw new Error('fail to add device collection');
    });
  }

  async updateDeviceCollection(publicKeys: string[]) {
    return updateDoc(doc(this.firestore, `/users/${this.userUid}/devices`, this.existingDeviceId), {
      publicKeys
    }).then(() => {
      this.existingDeviceId = null;
    }).catch((err) => {
      console.log('fail to update device collection, ', err);
      throw new Error('fail to update device collection');
    });
  }

  async listDevices() {
    const q = query(collection(this.firestore, `/users/${this.userUid}/devices`) as CollectionReference<Device>);
    const querySnapshot = await getDocs(q);
    const collections = [];

    querySnapshot.forEach((document) => {
      const data = document.data();
      collections.push({
        ...data,
        firebaseId: document.id,
        id:         data.publicKeys[0],
        label:      `${data.device} - ${data.browser} - ${data.os}`,
      });
    });
    // claim oidc token before getting all access keys
    await (window as any).fastAuthController.claimOidcToken(this.oidcToken);
    // if account id is not set, retrieve and reinitialize fastAuthController
    if (!window.fastAuthController.getAccountId()) {
      const accountId = await this.getAccountIdFromOidcToken();
      (window as any).fastAuthController = new FastAuthController({
        accountId,
        networkId
      });
    }

    const accessKeysWithoutRecoveryKey = await window.fastAuthController
      .getAllAccessKeysExceptRecoveryKey(this.oidcToken);

    // TODO: from the list, exclude record that has same key from recovery service
    return accessKeysWithoutRecoveryKey.reduce((list, key) => {
      const exist = list.find((c) => c.publicKeys.includes(key));
      if (exist) {
        return list;
      }

      // If there are any keys that are absent from firestore, show them as unknown
      return [
        ...list,
        {
          id:         key,
          firebaseId: null,
          label:      'Unknown Device',
          publicKeys: [key],
        }
      ];
    }, collections);
  }

  async deleteDeviceCollections(list) {
    const recoveryPK = await window.fastAuthController.getUserCredential(this.oidcToken);
    const accountIds = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${recoveryPK}/accounts`)
      .then((res) => res.json())
      .catch((err) => {
        console.log(err);
        throw new Error('Unable to retrieve account Id');
      });
    // delete firebase records
    try {
      const batch = writeBatch(this.firestore);
      const firestoreIds = list
        .map(({ firebaseId }) => firebaseId)
        .filter((id) => id);
      // delete all records except the one that has LAK
      firestoreIds.forEach((id) => {
        batch.delete(doc(this.firestore, `/users/${this.userUid}/devices`, id));
      });
      await batch.commit();
    } catch (err) {
      console.log('Fail to delete firestore records', err);
      throw new Error(err);
    }

    // delete keys from recovery service
    try {
      const publicKeys = list.reduce((acc, curr) => acc.concat(curr.publicKeys), []);
      const deleteAction = getDeleteKeysAction(publicKeys);
      await (window as any).fastAuthController.signAndSendActionsWithRecoveryKey({
        oidcToken: this.oidcToken,
        accountId: accountIds[0],
        recoveryPK,
        actions:   deleteAction
      });
    } catch (err) {
      console.log('Fail to delete keys', err);
      throw new Error(err);
    }
  }

  async getDeviceCollection(fakPublicKey) {
    const docRef = doc(this.firestore, 'users', this.userUid, 'devices', fakPublicKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  }

  updateUser = async ({
    userUid,
    oidcToken,
  }) => {
    this.userUid = userUid;
    this.oidcToken = oidcToken;
  };

  getUserOidcToken = () => this.oidcToken;
}

export default FirestoreController;
