package com.humanpartner;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;
import org.json.JSONObject;
import org.json.JSONArray;
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
    private static final String RESEARCH_INBOX = "julie_JULIE_001_research_inbox_v1";
    private static final String RESEARCH_ENABLED = "julie_JULIE_001_research_enabled_v1";
    private static final String RESEARCH_INDEX = "julie_JULIE_001_research_index_v1";
    private static final Object RESEARCH_LOCK = new Object();
    private final SharedPreferences prefs;

    JulieSecureStore(Context context) {
        prefs = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }
    private SecretKey key() throws Exception {
        synchronized(RESEARCH_LOCK) {
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

    // File séparée du JSON de conversation pour éviter les écritures concurrentes.
    // Toute donnée externe y reste une piste de lecture, jamais une vérité validée.
    boolean researchEnabled() {
        return prefs.getBoolean(RESEARCH_ENABLED, true);
    }
    boolean setResearchEnabled(boolean enabled) {
        synchronized(RESEARCH_LOCK) {
            return prefs.edit().putBoolean(RESEARCH_ENABLED,enabled).commit();
        }
    }
    int researchCursor() {
        synchronized(RESEARCH_LOCK) { return prefs.getInt(RESEARCH_INDEX,0); }
    }
    boolean advanceResearchCursor(int next) {
        synchronized(RESEARCH_LOCK) {
            return prefs.edit().putInt(RESEARCH_INDEX,next).commit();
        }
    }
    String readResearchInbox() {
        synchronized(RESEARCH_LOCK) {
            try {
                final String packed=prefs.getString(RESEARCH_INBOX,"");
                if(packed==null||packed.isEmpty())return "{\"schema\":1,\"items\":[]}";
                return decrypt(packed);
            } catch(Exception error) {
                Log.e("JulieSecureStore","File scientifique illisible, aucune suppression",error);
                return UNREADABLE;
            }
        }
    }
    boolean appendResearchItem(JSONObject item) {
        synchronized(RESEARCH_LOCK) {
            try {
                if(!researchEnabled()||item==null||item.toString().length()>2500)return false;
                final String raw=readResearchInbox();
                if(UNREADABLE.equals(raw))return false;
                final JSONObject inbox=new JSONObject(raw);
                if(inbox.optInt("schema",-1)!=1)return false;
                final JSONArray entries=inbox.getJSONArray("items");
                final String id=item.getString("id");
                if(!id.matches("wiki-fr-[0-9]{1,15}"))return false;
                for(int i=0;i<entries.length();i++) {
                    if(id.equals(entries.getJSONObject(i).optString("id")))return true;
                }
                if(entries.length()>=12)return false;
                entries.put(item);
                final String payload=inbox.toString();
                if(payload.getBytes(StandardCharsets.UTF_8).length>32000)return false;
                return prefs.edit().putString(RESEARCH_INBOX,encrypt(payload)).commit();
            } catch(Exception error) {
                Log.e("JulieSecureStore","Recherche non sauvegardée, file préservée",error);
                return false;
            }
        }
    }
    boolean acknowledgeResearchItem(String id) {
        synchronized(RESEARCH_LOCK) {
            try {
                if(id==null||!id.matches("wiki-fr-[0-9]{1,15}"))return false;
                final String raw=readResearchInbox();
                if(UNREADABLE.equals(raw))return false;
                final JSONObject inbox=new JSONObject(raw);
                if(inbox.optInt("schema",-1)!=1)return false;
                final JSONArray entries=inbox.getJSONArray("items");
                final JSONArray remaining=new JSONArray();
                for(int i=0;i<entries.length();i++) {
                    final JSONObject entry=entries.getJSONObject(i);
                    if(!id.equals(entry.optString("id")))remaining.put(entry);
                }
                if(remaining.length()==entries.length())return true;
                final JSONObject updated=new JSONObject();
                updated.put("schema",1);
                updated.put("items",remaining);
                return prefs.edit().putString(RESEARCH_INBOX,encrypt(updated.toString())).commit();
            } catch(Exception error) {
                Log.e("JulieSecureStore","Accusé de réception non enregistré",error);
                return false;
            }
        }
    }
    boolean clearResearchInbox() {
        synchronized(RESEARCH_LOCK) {
            return prefs.edit().remove(RESEARCH_INBOX).commit();
        }
    }
}
