package com.humanpartner;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.text.Html;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import org.json.JSONObject;
import org.json.JSONArray;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.IDN;
import java.net.InetAddress;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.net.ssl.HttpsURLConnection;

/**
 * Recherche JULIE : Google.com s'ouvre dans le navigateur Android.
 * Seul le lien HTTPS d'une page CHOISIE par l'utilisateur peut être lu ici.
 * Aucune extraction automatisée des résultats Google et aucun script distant dans la WebView.
 */
public final class JulieWebResearch {
    private static final int MAX_HTML_BYTES=120_000;
    private static final int MAX_EXCERPT=3_000;
    private final Activity activity;
    private final WebView web;
    private final ExecutorService network=Executors.newSingleThreadExecutor();
    private final AtomicBoolean reading=new AtomicBoolean(false);

    public JulieWebResearch(Activity activity, WebView web){
        this.activity=activity;
        this.web=web;
    }
    @JavascriptInterface public void openGoogleSearch(String rawQuery){
        if(rawQuery==null)return;
        String query=rawQuery.replaceAll("\\s+"," ").trim();
        if(query.isEmpty()||query.length()>180)return;
        activity.runOnUiThread(()->{
            try{
                Uri target=new Uri.Builder().scheme("https").authority("www.google.com")
                    .appendPath("search").appendQueryParameter("q",query).build();
                Intent view=new Intent(Intent.ACTION_VIEW,target);
                activity.startActivity(view);
            }catch(Exception ex){
                Toast.makeText(activity,"Navigateur Google indisponible",Toast.LENGTH_LONG).show();
            }
        });
    }
    @JavascriptInterface public void readSource(String raw){
        if(!reading.compareAndSet(false,true)){
            report(failure("Une lecture est déjà en cours."));return;
        }
        network.execute(()->{
            JSONObject result;
            try{result=readPage(raw);}
            catch(Exception ex){result=failure("Page inaccessible ou non autorisée. Essaie une autre source HTTPS.");}
            finally{reading.set(false);}
            report(result);
        });
    }
    // Recherche autonome gratuite sur l'API publique Wikipédia ; Google reste accessible
    // en tant que moteur principal manuel, ses résultats n'étant pas accessibles
    // légalement à une nouvelle application via l'ancienne Custom Search JSON API.
    @JavascriptInterface public void searchPublicKnowledge(String rawQuery){
        if(rawQuery==null||rawQuery.trim().isEmpty()||rawQuery.length()>180){
            reportSearch(failure("Recherche invalide."));return;
        }
        if(!reading.compareAndSet(false,true)){
            reportSearch(failure("Une recherche est déjà en cours."));return;
        }
        final String query=rawQuery.replaceAll("\\s+"," ").trim();
        network.execute(()->{
            JSONObject result;
            try{result=searchWikipedia(query);}
            catch(Exception ex){result=failure("Recherche Wikipédia indisponible. Réessaie avec une connexion Internet.");}
            finally{reading.set(false);}
            reportSearch(result);
        });
    }
    private void reportSearch(JSONObject result){
        String payload=JSONObject.quote(result.toString());
        activity.runOnUiThread(()->{
            if(web!=null)web.evaluateJavascript("window.JulieReceivePublicSearch("+payload+")",null);
        });
    }
    private static JSONObject searchWikipedia(String query) throws Exception {
        // L'API est publique, documentation : mediawiki.org/wiki/API:Search.
        // On ne collecte aucune donnée privée et on ne transmet que les mots recherchés.
        Uri target=new Uri.Builder().scheme("https").authority("fr.wikipedia.org")
            .appendPath("w").appendPath("api.php")
            .appendQueryParameter("action","query")
            .appendQueryParameter("list","search")
            .appendQueryParameter("srsearch",query)
            .appendQueryParameter("srlimit","3")
            .appendQueryParameter("srprop","snippet")
            .appendQueryParameter("format","json").build();
        URL url=validate(target.toString());
        HttpsURLConnection conn=(HttpsURLConnection)url.openConnection();
        conn.setConnectTimeout(6500);conn.setReadTimeout(7500);
        conn.setInstanceFollowRedirects(false);
        conn.setRequestProperty("User-Agent","JULIE-Research/0.3.5 (Android educational test; contact: Wikimedia API support)");
        conn.setRequestProperty("Accept","application/json");
        try{
            if(conn.getResponseCode()!=200)throw new IllegalStateException("Service inaccessible");
            String mime=String.valueOf(conn.getContentType()).toLowerCase(Locale.ROOT);
            if(!mime.contains("application/json"))throw new IllegalStateException("Format inattendu");
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            try(InputStream in=conn.getInputStream()){
                byte[] buf=new byte[4096];int len;
                while((len=in.read(buf))!=-1){
                    if(out.size()+len>64_000)throw new IllegalStateException("Réponse trop longue");
                    out.write(buf,0,len);
                }
            }
            JSONObject payload=new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
            JSONArray entries=payload.getJSONObject("query").getJSONArray("search");
            JSONArray cleaned=new JSONArray();
            for(int i=0;i<Math.min(3,entries.length());i++){
                JSONObject item=entries.getJSONObject(i);
                String title=item.optString("title","").trim();
                if(title.isEmpty())continue;
                String snippet=Html.fromHtml(item.optString("snippet",""),
                    Html.FROM_HTML_MODE_LEGACY).toString().replaceAll("\\s+"," ").trim();
                String page="https://fr.wikipedia.org/wiki/"+Uri.encode(title.replace(' ','_'));
                JSONObject row=new JSONObject();
                row.put("title",title.length()>160?title.substring(0,160):title);
                row.put("excerpt",snippet.length()>460?snippet.substring(0,460):snippet);
                row.put("url",page);
                cleaned.put(row);
            }
            JSONObject result=new JSONObject();
            result.put("ok",true);
            result.put("engine","Wikimedia Action API");
            result.put("query",query);
            result.put("results",cleaned);
            return result;
        }finally{conn.disconnect();}
    }
    private static JSONObject failure(String error){
        JSONObject result=new JSONObject();
        try{result.put("ok",false);result.put("error",error);}catch(Exception ignored){}
        return result;
    }
    private void report(JSONObject result){
        String payload=JSONObject.quote(result.toString());
        activity.runOnUiThread(()->{
            if(web!=null)web.evaluateJavascript("window.JulieReceiveResearchSource("+payload+")",null);
        });
    }
    private static URL validate(String raw) throws Exception{
        if(raw==null||raw.length()>2048)throw new IllegalArgumentException("URL");
        URL url=new URL(raw.trim());
        if(!"https".equalsIgnoreCase(url.getProtocol())||url.getUserInfo()!=null||url.getPort()!=-1)
            throw new IllegalArgumentException("HTTPS uniquement");
        String ascii=IDN.toASCII(url.getHost(),IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
        if(ascii.isEmpty()||ascii.length()>253||!ascii.contains(".")||
            ascii.endsWith(".local")||ascii.endsWith(".localhost")||ascii.endsWith(".internal")||
            ascii.endsWith(".invalid")||ascii.endsWith(".test"))
            throw new IllegalArgumentException("Hôte non public");
        InetAddress[] addresses=InetAddress.getAllByName(ascii);
        if(addresses.length==0)throw new IllegalArgumentException("DNS");
        for(InetAddress address:addresses){
            if(!isPublicAddress(address))throw new IllegalArgumentException("Adresse non publique");
        }
        return new URL("https",ascii,url.getFile());
    }
    private static boolean isPublicAddress(InetAddress address){
        if(address.isAnyLocalAddress()||address.isLoopbackAddress()||address.isLinkLocalAddress()||
           address.isSiteLocalAddress()||address.isMulticastAddress())return false;
        byte[] b=address.getAddress();
        if(b.length==4){
            int a=b[0]&255,c=b[1]&255;
            if(a==0||a==10||a==127||a>=224||a==169&&c==254||a==100&&c>=64&&c<=127||
               a==172&&c>=16&&c<=31||a==192&&c==168||a==192&&c==0||
               a==198&&(c==18||c==19)||a==192&&c==0||a==192&&c==88||
               a==192&&c==0||a==192&&c==2||a==198&&c==51||
               a==203&&c==0)return false;
        }
        if(b.length==16){
            int first=b[0]&255;
            if((first&254)==252)return false; // Unique local IPv6 fc00::/7
            if(first==0x20&&(b[1]&255)==0x01&&(b[2]&255)==0x0d&&(b[3]&255)==0xb8)
                return false; // IPv6 documentation prefix
        }
        return true;
    }
    private static JSONObject readPage(String raw) throws Exception{
        URL url=validate(raw);
        HttpsURLConnection connection=(HttpsURLConnection)url.openConnection();
        connection.setConnectTimeout(7000);
        connection.setReadTimeout(8000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("User-Agent","JULIE/0.3.5 (lecture de source demandée)");
        connection.setRequestProperty("Accept","text/html,text/plain");
        try{
            int status=connection.getResponseCode();
            if(status<200||status>=300)throw new IllegalStateException("HTTP "+status);
            String mime=String.valueOf(connection.getContentType()).toLowerCase(Locale.ROOT);
            if(!mime.startsWith("text/html")&&!mime.startsWith("text/plain")&&
               !mime.startsWith("application/xhtml+xml"))
                throw new IllegalArgumentException("Type de page non pris en charge");
            ByteArrayOutputStream output=new ByteArrayOutputStream();
            try(InputStream input=connection.getInputStream()){
                byte[] buffer=new byte[4096];
                for(int count;(count=input.read(buffer))!=-1;){
                    if(output.size()+count>MAX_HTML_BYTES)break;
                    output.write(buffer,0,count);
                }
            }
            String html=output.toString(StandardCharsets.UTF_8.name());
            String title="Page Web";
            Matcher m=Pattern.compile("(?is)<title[^>]*>(.*?)</title>").matcher(html);
            if(m.find())title=Html.fromHtml(m.group(1),Html.FROM_HTML_MODE_LEGACY)
                .toString().replaceAll("\\s+"," ").trim();
            String safe=html.replaceAll("(?is)<script\\b[^>]*>.*?</script>"," ")
                .replaceAll("(?is)<style\\b[^>]*>.*?</style>"," ");
            String excerpt=Html.fromHtml(safe,Html.FROM_HTML_MODE_LEGACY)
                .toString().replaceAll("\\s+"," ").trim();
            if(excerpt.isEmpty())throw new IllegalArgumentException("Page non lisible");
            JSONObject result=new JSONObject();
            result.put("ok",true);
            result.put("url",url.toString());
            result.put("title",title.length()>160?title.substring(0,160):title);
            result.put("excerpt",excerpt.length()>MAX_EXCERPT?excerpt.substring(0,MAX_EXCERPT):excerpt);
            result.put("truncated",excerpt.length()>MAX_EXCERPT||output.size()==MAX_HTML_BYTES);
            return result;
        }finally{connection.disconnect();}
    }
    public void close(){network.shutdownNow();}
}
