package com.humanpartner;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Mises à jour de l'APK JULIE, depuis une Release GitHub publique et dédiée.
 * L'application vérifie et télécharge sur Wi-Fi automatiquement si autorisé.
 * Android exige toujours une validation utilisateur pour l'installation.
 * Aucun APK n'est proposé si son SHA-256, son package, sa version ou sa
 * signature ne correspondent pas à l'installation existante.
 */
public final class JulieUpdateManager {
    static final String RELEASE_TAG = "julie-android-updates";
    static final String RELEASE_API =
        "https://api.github.com/repos/amaurygiboudot-arch/Listingcase/releases/tags/" + RELEASE_TAG;
    static final String APK_ASSET = "JULIE-Android.apk";
    static final String APK_URL =
        "https://github.com/amaurygiboudot-arch/Listingcase/releases/download/" + RELEASE_TAG + "/" + APK_ASSET;
    private static final long MAX_APK = 150L * 1024L * 1024L;
    private static final int MAX_META = 96 * 1024;
    private static final long CHECK_EVERY = 24L * 60L * 60L * 1000L;
    private static final String LOG = "JulieUpdater";

    private final Activity activity;
    private final WebView web;
    private final SharedPreferences prefs;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Object lock = new Object();
    private boolean checking = false;
    private boolean downloading = false;
    private volatile ReleaseInfo available;
    private volatile File readyFile;

    static final class ReleaseInfo {
        final long code;
        final String version, sha256, notes;
        final long length;
        ReleaseInfo(long code, String version, String sha256, String notes, long length){
            this.code=code;this.version=version;this.sha256=sha256;this.notes=notes;this.length=length;
        }
    }

    JulieUpdateManager(Activity activity, WebView web){
        this.activity=activity;
        this.web=web;
        this.prefs=activity.getSharedPreferences("julie_update_preferences",Context.MODE_PRIVATE);
    }

    private long installedVersion(){
        try{
            PackageInfo packageInfo=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);
            return Build.VERSION.SDK_INT>=28?packageInfo.getLongVersionCode():packageInfo.versionCode;
        }catch(Exception e){return -1;}
    }
    private String installedVersionName(){
        try{return activity.getPackageManager().getPackageInfo(activity.getPackageName(),0).versionName;}
        catch(Exception e){return "?";}
    }
    @JavascriptInterface public String currentVersion(){return installedVersionName();}
    @JavascriptInterface public boolean automaticDownloadsEnabled(){
        return prefs.getBoolean("automatic_downloads",true);
    }
    @JavascriptInterface public void setAutomaticDownloadsEnabled(boolean enabled){
        prefs.edit().putBoolean("automatic_downloads",enabled).apply();
        post("preference",enabled?"Téléchargement automatique en Wi-Fi activé.":"Téléchargement automatique désactivé.",null);
    }

    // Un contrôle par jour, seulement lorsque Julie est ouverte.
    @JavascriptInterface public void checkOnLaunch(){
        if(!automaticDownloadsEnabled())return;
        long now=System.currentTimeMillis();
        long last=prefs.getLong("last_check",0);
        if(now-last<CHECK_EVERY && last<=now)return;
        check(false);
    }
    @JavascriptInterface public void checkForUpdates(){check(true);}

    private void post(String status,String message,ReleaseInfo info){
        JSONObject event=new JSONObject();
        try{
            event.put("status",status);
            event.put("message",message);
            event.put("versionCode",info==null?JSONObject.NULL:info.code);
            event.put("version",info==null?JSONObject.NULL:info.version);
            event.put("size",info==null?JSONObject.NULL:info.length);
            event.put("notes",info==null?JSONObject.NULL:info.notes);
        }catch(Exception e){return;}
        activity.runOnUiThread(()->{
            try{web.evaluateJavascript("window.JulieUpdateEvent("+JSONObject.quote(event.toString())+")",null);}
            catch(Exception e){Log.e(LOG,"Retour UI impossible",e);}
        });
    }

    private void check(boolean manual){
        synchronized(lock){
            if(checking||downloading)return;
            checking=true;
        }
        if(manual)post("checking","Recherche d'une version récente…",null);
        worker.execute(()->{
            try{
                final HttpURLConnection connection=(HttpURLConnection)new URL(RELEASE_API).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(15000);
                connection.setRequestProperty("User-Agent","JULIE-Android-Updater");
                connection.setRequestProperty("Accept","application/vnd.github+json");
                connection.setInstanceFollowRedirects(false);
                final int status=connection.getResponseCode();
                if(status==404){
                    connection.disconnect();
                    post("no_release","Aucune mise à jour Android publiée pour le moment.",null);
                    return;
                }
                if(status!=200)throw new IllegalStateException("Service GitHub momentanément indisponible ("+status+")");
                byte[] response;
                try(InputStream in=connection.getInputStream()){
                    response=readLimited(in,MAX_META);
                }finally{connection.disconnect();}
                final JSONObject release=new JSONObject(new String(response,StandardCharsets.UTF_8));
                ReleaseInfo info=parseRelease(release);
                prefs.edit().putLong("last_check",System.currentTimeMillis()).apply();
                if(info==null || info.code<=installedVersion()){
                    available=null;
                    post("current","Julie est à jour ("+installedVersionName()+").",null);
                    return;
                }
                available=info;
                post("available","Nouvelle version "+info.version+" disponible.",info);
                if(automaticDownloadsEnabled()&&isUnmetered()){
                    download(false);
                }else if(automaticDownloadsEnabled()){
                    post("wifi","Mise à jour disponible. Téléchargement automatique en attente du Wi-Fi.",info);
                }
            }catch(Exception e){
                Log.w(LOG,"Vérification impossible",e);
                post("error","Vérification impossible : "+safeMessage(e),null);
            }finally{
                synchronized(lock){checking=false;}
            }
        });
    }

    private ReleaseInfo parseRelease(JSONObject release) throws Exception {
        if(!RELEASE_TAG.equals(release.optString("tag_name"))||
           release.optBoolean("draft",false)||release.optBoolean("prerelease",false))
            throw new IllegalArgumentException("Release non autorisée");
        JSONObject meta=new JSONObject(release.getString("body"));
        if(!activity.getPackageName().equals(meta.optString("packageName")))
            throw new IllegalArgumentException("Identifiant Android inattendu");
        long code=meta.getLong("versionCode");
        if(code<=0)throw new IllegalArgumentException("Version invalide");
        String sha=meta.getString("sha256").toLowerCase(Locale.ROOT);
        if(!sha.matches("[0-9a-f]{64}"))throw new IllegalArgumentException("Empreinte SHA-256 absente");
        JSONArray assets=release.getJSONArray("assets");
        long length=-1;int matches=0;
        for(int i=0;i<assets.length();i++){
            JSONObject asset=assets.getJSONObject(i);
            if(!APK_ASSET.equals(asset.optString("name")))continue;
            if(!APK_URL.equals(asset.optString("browser_download_url")))
                throw new IllegalArgumentException("Adresse de mise à jour non autorisée");
            matches++;
            length=asset.getLong("size");
            String digest=asset.optString("digest","");
            if(!digest.isEmpty()&&!digest.equalsIgnoreCase("sha256:"+sha))
                throw new IllegalArgumentException("Empreintes de publication divergentes");
        }
        if(matches!=1||length<1024||length>MAX_APK)
            throw new IllegalArgumentException("Fichier APK manquant ou trop grand");
        String name=meta.optString("versionName","").trim();
        if(name.isEmpty()||name.length()>60)throw new IllegalArgumentException("Nom de version invalide");
        String notes=meta.optString("notes","Mise à jour de Julie.");
        if(notes.length()>400)notes=notes.substring(0,400);
        return new ReleaseInfo(code,name,sha,notes,length);
    }

    private static byte[] readLimited(InputStream in,int max) throws Exception {
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        byte[] buffer=new byte[8192];int n;
        while((n=in.read(buffer))!=-1){
            if(out.size()+n>max)throw new IllegalArgumentException("Réponse réseau trop volumineuse");
            out.write(buffer,0,n);
        }
        return out.toByteArray();
    }
    private boolean isUnmetered(){
        try{
            ConnectivityManager c=(ConnectivityManager)activity.getSystemService(Context.CONNECTIVITY_SERVICE);
            if(c==null||Build.VERSION.SDK_INT<23)return false;
            android.net.Network network=c.getActiveNetwork();
            NetworkCapabilities caps=network==null?null:c.getNetworkCapabilities(network);
            return caps!=null&&caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED);
        }catch(Exception ignored){return false;}
    }
    @JavascriptInterface public void downloadUpdate(){download(true);}
    private void download(boolean manual){
        ReleaseInfo info=available;
        if(info==null){if(manual)post("error","Vérifie d'abord si une mise à jour existe.",null);return;}
        synchronized(lock){
            if(downloading)return;
            downloading=true;
        }
        worker.execute(()->{
            File temp=null;
            try{
                if(!manual&&!isUnmetered()){
                    post("wifi","Téléchargement en attente du Wi-Fi.",info);
                    return;
                }
                post("downloading","Téléchargement sécurisé de "+info.version+"…",info);
                temp=new File(activity.getCacheDir(),"julie-update.part");
                File target=new File(activity.getCacheDir(),"julie-update.apk");
                // Téléchargement depuis une URL GitHub figée ; aucune URL issue des messages ou du JSON n'est exécutée.
                URL url=new URL(APK_URL);
                long count=0;
                MessageDigest hash=MessageDigest.getInstance("SHA-256");
                int redirects=0;
                while(true){
                    String host=url.getHost().toLowerCase(Locale.ROOT);
                    if(!"https".equalsIgnoreCase(url.getProtocol())||
                       !(host.equals("github.com")||host.equals("release-assets.githubusercontent.com")||
                         host.equals("objects.githubusercontent.com")))
                        throw new SecurityException("Hôte de téléchargement non autorisé");
                    HttpURLConnection connection=(HttpURLConnection)url.openConnection();
                    connection.setConnectTimeout(15000);connection.setReadTimeout(30000);
                    connection.setInstanceFollowRedirects(false);
                    connection.setRequestProperty("User-Agent","JULIE-Android-Updater");
                    int code=connection.getResponseCode();
                    if(code==301||code==302||code==303||code==307||code==308){
                        String location=connection.getHeaderField("Location");
                        connection.disconnect();
                        if(++redirects>6||location==null)throw new SecurityException("Trop de redirections");
                        url=new URL(url,location);
                        continue;
                    }
                    if(code!=200){connection.disconnect();throw new IllegalStateException("Téléchargement indisponible ("+code+")");}
                    try(InputStream in=connection.getInputStream();FileOutputStream out=new FileOutputStream(temp)){
                        byte[] buffer=new byte[65536];int n;
                        while((n=in.read(buffer))!=-1){
                            count+=n;
                            if(count>MAX_APK||count>info.length+4096)
                                throw new SecurityException("Téléchargement trop volumineux");
                            hash.update(buffer,0,n);out.write(buffer,0,n);
                        }
                        out.getFD().sync();
                    }finally{connection.disconnect();}
                    break;
                }
                if(count!=info.length)throw new SecurityException("Taille APK différente de la release");
                StringBuilder digest=new StringBuilder(64);
                for(byte b:hash.digest())digest.append(String.format(Locale.ROOT,"%02x",b&0xff));
                if(!digest.toString().equals(info.sha256))
                    throw new SecurityException("Empreinte du téléchargement non conforme");
                verifySignatureAndVersion(temp,info);
                if(target.exists()&&!target.delete())throw new IllegalStateException("Cache temporaire verrouillé");
                if(!temp.renameTo(target))throw new IllegalStateException("Finalisation du téléchargement impossible");
                readyFile=target;
                prefs.edit().putString("ready_sha256",info.sha256).apply();
                post("ready","Mise à jour "+info.version+" téléchargée. Installation à confirmer dans Android.",info);
            }catch(SecurityException bad){
                Log.e(LOG,"Mise à jour non compatible ou non authentique",bad);
                post("blocked","Mise à jour refusée : "+safeMessage(bad)+". Aucun souvenir n'a été supprimé.",info);
            }catch(Exception e){
                Log.w(LOG,"Téléchargement indisponible",e);
                post("error","Téléchargement impossible : "+safeMessage(e),info);
            }finally{
                if(temp!=null&&temp.exists())temp.delete();
                synchronized(lock){downloading=false;}
            }
        });
    }

    private void verifySignatureAndVersion(File apk,ReleaseInfo info) throws Exception{
        PackageManager manager=activity.getPackageManager();
        final int flags=Build.VERSION.SDK_INT>=28?
            PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
        PackageInfo installed=manager.getPackageInfo(activity.getPackageName(),flags);
        PackageInfo candidate=manager.getPackageArchiveInfo(apk.getAbsolutePath(),flags);
        if(candidate==null||!activity.getPackageName().equals(candidate.packageName))
            throw new SecurityException("Identifiant Android incorrect");
        long code=Build.VERSION.SDK_INT>=28?candidate.getLongVersionCode():candidate.versionCode;
        if(code!=info.code||code<=installedVersion())throw new SecurityException("Version APK incohérente");
        Signature[] installedSigners=Build.VERSION.SDK_INT>=28?
            installed.signingInfo.getApkContentsSigners():installed.signatures;
        Signature[] candidateSigners=Build.VERSION.SDK_INT>=28?
            candidate.signingInfo.getApkContentsSigners():candidate.signatures;
        if(installedSigners==null||candidateSigners==null||
           installedSigners.length==0||installedSigners.length!=candidateSigners.length)
            throw new SecurityException("Signature APK absente");
        for(Signature original:installedSigners){
            boolean found=false;
            for(Signature incoming:candidateSigners)
                if(Arrays.equals(original.toByteArray(),incoming.toByteArray())){found=true;break;}
            if(!found)throw new SecurityException("Signature Android différente. Exporte les souvenirs avant toute migration.");
        }
    }

    @JavascriptInterface public void installUpdate(){
        activity.runOnUiThread(()->{
            ReleaseInfo info=available;
            File file=readyFile;
            if(info==null||file==null||!file.isFile()){
                post("error","Aucune mise à jour vérifiée à installer.",null);
                return;
            }
            if(Build.VERSION.SDK_INT>=26&&!activity.getPackageManager().canRequestPackageInstalls()){
                post("permission","Android demande l'autorisation d'installer les APK de Julie. Reviens ensuite appuyer sur Installer.",info);
                try{
                    Intent intent=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:"+activity.getPackageName()));
                    activity.startActivity(intent);
                }catch(Exception e){post("error","Autorisation d'installation indisponible.",info);}
                return;
            }
            worker.execute(()->{
                try{
                    verifySignatureAndVersion(file,info);
                    PackageInstaller installer=activity.getPackageManager().getPackageInstaller();
                    PackageInstaller.SessionParams params=
                        new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                    params.setAppPackageName(activity.getPackageName());
                    int id=installer.createSession(params);
                    PackageInstaller.Session session=installer.openSession(id);
                    try{
                        try(FileInputStream in=new FileInputStream(file);
                            OutputStream out=session.openWrite("JULIE-Android.apk",0,file.length())){
                            byte[] buffer=new byte[65536];int n;
                            while((n=in.read(buffer))!=-1)out.write(buffer,0,n);
                            session.fsync(out);
                        }
                        Intent status=new Intent(activity,JulieInstallReceiver.class);
                        status.setAction(JulieInstallReceiver.ACTION_STATUS);
                        PendingIntent sender=PendingIntent.getBroadcast(
                            activity,id,status,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_MUTABLE);
                        session.commit(sender.getIntentSender());
                    }finally{session.close();}
                    post("installing","L'écran Android va demander de confirmer la mise à jour.",info);
                }catch(Exception e){
                    Log.e(LOG,"Installation non lancée",e);
                    post("error","Installation impossible : "+safeMessage(e),info);
                }
            });
        });
    }

    void close(){worker.shutdown();}
    private static String safeMessage(Exception e){
        String value=e.getMessage();
        if(value==null||value.isEmpty())return "Erreur non identifiée";
        return value.length()>180?value.substring(0,180):value;
    }
}
