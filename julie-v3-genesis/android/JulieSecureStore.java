package com.humanpartner;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;
import org.json.JSONObject;
import java.security.KeyStore;
import java.nio.charset.StandardCharsets;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Persistance de démonstration pour JULIE_001. AES-256-GCM via AndroidKeyStore.
 * Le précédent JSON en clair est supprimé uniquement après une migration validée.
 * Pas de restauration automatique après désinstallation : export volontaire requis.
 */
final class JulieSecureStore {
    static final String UNREADABLE = "__ERROR_SECURE_STORAGE__";
    static final int MAX_JSON_BYTES = 8_000_000;
    private static final String PREF = "julie_v3_preview_state";
    private static final String OLD_KEY = "julie_v3_preview_JULIE_001";
    private static final String ENCRYPTED_KEY = "julie_JULIE_001_encrypted_v1";
    private static final String KEY_ALIAS = "julie_JULIE_001_key_v1";
    private static final byte[] AAD = "JULIE_001".getBytes(StandardCharsets.UTF_8);
    private final SharedPreferences prefs;

    JulieSecureStore(Context context) {
        prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }
    private SecretKey key() throws Exception {
        final KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(KEY_ALIAS)) {
            final KeyStore.Entry entry = store.getEntry(KEY_ALIAS, null);
            if (!(entry instanceof KeyStore.SecretKeyEntry))throw new IllegalStateException("Clef Android invalide");
            return ((KeyStore.SecretKeyEntry)entry).getSecretKey();
        }
        final KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256).build());
        return generator.generateKey();
    }
    private String encrypt(String plaintext) throws Exception {
        final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        cipher.updateAAD(AAD);
        return Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":"
                + Base64.encodeToString(cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
    }
    private String decrypt(String packed) throws Exception {
        final String[] parts = packed.split(":",2);
        if (parts.length!=2)throw new IllegalArgumentException("Format chiffré invalide");
        final byte[] iv = Base64.decode(parts[0],Base64.DEFAULT);
        if (iv.length!=12)throw new IllegalArgumentException("Vecteur de chiffrement invalide");
        final Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));
        cipher.updateAAD(AAD);
        return new String(cipher.doFinal(Base64.decode(parts[1],Base64.DEFAULT)),StandardCharsets.UTF_8);
    }
    synchronized String read() {
        final String encrypted = prefs.getString(ENCRYPTED_KEY, "");
        if(encrypted!=null&&!encrypted.isEmpty()){
            try{return decrypt(encrypted);}
            catch(Exception error){
                Log.e("JulieSecureStore","Lecture chiffrée impossible : aucun reset automatique",error);
                return UNREADABLE;
            }
        }
        final String old = prefs.getString(OLD_KEY, "");
        if(old!=null&&!old.isEmpty())write(old); // conserve le JSON clair si la migration échoue
        return old==null?"":old;
    }
    synchronized boolean write(String json) {
        if(json==null || json.getBytes(StandardCharsets.UTF_8).length>MAX_JSON_BYTES)return false;
        try {
            final JSONObject state = new JSONObject(json);
            if(!"JULIE_001".equals(state.optString("id"))||state.optJSONArray("messages")==null||state.optJSONArray("memories")==null)
                return false;
            final String encrypted=encrypt(json);
            // commit() garantit que l'ancien état reste intact si l'écriture échoue.
            return prefs.edit().putString(ENCRYPTED_KEY,encrypted).remove(OLD_KEY).commit();
        } catch(Exception error) {
            Log.e("JulieSecureStore","Sauvegarde refusée sans effacer les souvenirs",error);
            return false;
        }
    }
}
