package com.humanpartner;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * JULIE 0.3.1 : WebView à origine HTTPS locale, avec maillage GLB dans les assets.
 * Pas d'autorisation INTERNET, ni de chargement de contenus distants.
 * L'import/export JSON ne fonctionne que sur une action explicite de l'utilisateur.
 */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String APP_URL = "https://appassets.androidplatform.net/julie/index.html";
    private static final String PREFIX = "/julie/";
    private static final String PREF = "julie_v3_preview_state";
    private static final String KEY = "julie_v3_preview_JULIE_001";
    private static final int EXPORT_REQUEST = 9041;
    private static final int IMPORT_REQUEST = 9042;
    private static final int MAX_JSON_BYTES = JulieSecureStore.MAX_JSON_BYTES;

    private JulieSecureStore secureStore;
    private WebView web;
    private String pendingExport;

    public final class JulieBridge {
        @JavascriptInterface public String readState(){return secureStore.read();}
        @JavascriptInterface public boolean writeState(String json){return secureStore.write(json);}
        @JavascriptInterface public void exportData(String json){
            if(json==null||json.getBytes(StandardCharsets.UTF_8).length>MAX_JSON_BYTES)return;
            runOnUiThread(()->{
                pendingExport=json;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE,"Julie_souvenirs_JULIE_001.json");
                try{startActivityForResult(intent,EXPORT_REQUEST);}catch(Exception ex){
                    Toast.makeText(MainActivity.this,"Export indisponible",Toast.LENGTH_SHORT).show();
                }
            });
        }
        @JavascriptInterface public void importData(){
            runOnUiThread(()->{
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                try{startActivityForResult(intent,IMPORT_REQUEST);}catch(Exception ex){
                    Toast.makeText(MainActivity.this,"Import indisponible",Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    private String mime(String file){
        if(file.endsWith(".html"))return "text/html";
        if(file.endsWith(".js"))return "text/javascript";
        if(file.endsWith(".css"))return "text/css";
        if(file.endsWith(".glb"))return "model/gltf-binary";
        if(file.endsWith(".png"))return "image/png";
        if(file.endsWith(".jpg")||file.endsWith(".jpeg"))return "image/jpeg";
        if(file.endsWith(".json"))return "application/json";
        return "application/octet-stream";
    }
    private WebResourceResponse errorResponse(int status,String reason){
        final WebResourceResponse r=new WebResourceResponse("text/plain","utf-8",
                new ByteArrayInputStream(new byte[0]));
        r.setStatusCodeAndReasonPhrase(status,reason);
        return r;
    }
    private WebResourceResponse serveLocalResource(Uri uri){
        if(uri==null||!"https".equals(uri.getScheme())||!HOST.equals(uri.getHost()))
            return errorResponse(403,"Forbidden");
        String path=uri.getPath();
        if(path==null||!path.startsWith(PREFIX)||path.contains("..")||path.indexOf('\\')>=0)
            return errorResponse(403,"Forbidden");
        final String asset="julie/"+path.substring(PREFIX.length());
        try{
            final InputStream stream=getAssets().open(asset);
            final WebResourceResponse response=new WebResourceResponse(mime(asset),
                    asset.endsWith(".glb")?null:"utf-8",stream);
            // Toutes les requêtes de WebGL/GLTFLoader viennent de cette même origine HTTPS.
            final Map<String,String> headers=new HashMap<>();
            headers.put("Access-Control-Allow-Origin","https://"+HOST);
            headers.put("X-Content-Type-Options","nosniff");
            headers.put("Cache-Control","no-store");
            response.setResponseHeaders(headers);
            return response;
        }catch(Exception ex){return errorResponse(404,"Not Found");}
    }

    @Override protected void onCreate(Bundle state){
        super.onCreate(state);
        secureStore=new JulieSecureStore(getApplicationContext());
        getWindow().setStatusBarColor(Color.rgb(15,17,27));
        getWindow().setNavigationBarColor(Color.rgb(15,17,27));
        web=new WebView(this);
        web.setBackgroundColor(Color.rgb(15,17,27));
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setDefaultTextEncodingName("utf-8");
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new JulieBridge(),"JulieAndroid");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                return serveLocalResource(request.getUrl());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,String url){
                return serveLocalResource(Uri.parse(url));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                return !APP_URL.equals(request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,String url){
                return !APP_URL.equals(url);
            }
        });
        setContentView(web);
        web.loadUrl(APP_URL);
    }

    @Override protected void onActivityResult(int request,int result,Intent intent){
        super.onActivityResult(request,result,intent);
        if(result!=RESULT_OK||intent==null||intent.getData()==null)return;
        Uri uri=intent.getData();
        if(request==EXPORT_REQUEST){
            if(pendingExport==null)return;
            try(OutputStream out=getContentResolver().openOutputStream(uri)){
                if(out==null)throw new IllegalStateException("Destination inaccessible");
                out.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this,"Souvenirs exportés",Toast.LENGTH_SHORT).show();
            }catch(Exception ex){Toast.makeText(this,"Échec export",Toast.LENGTH_LONG).show();}
            finally{pendingExport=null;}
        }else if(request==IMPORT_REQUEST){
            try(InputStream in=getContentResolver().openInputStream(uri)){
                if(in==null)throw new IllegalStateException("Source inaccessible");
                ByteArrayOutputStream buf=new ByteArrayOutputStream();
                byte[] bytes=new byte[8192];int count;
                while((count=in.read(bytes))>=0){
                    if(buf.size()+count>MAX_JSON_BYTES)throw new IllegalArgumentException("Fichier trop grand");
                    buf.write(bytes,0,count);
                }
                final String json=buf.toString("UTF-8");
                // Le texte est échappé par JSONObject.quote, puis contrôlé par JS
                // (identifiant JULIE_001 + schéma). Aucune importation silencieuse.
                web.evaluateJavascript("window.JulieReceiveImport("+JSONObject.quote(json)+")",null);
            }catch(Exception ex){Toast.makeText(this,"Import impossible",Toast.LENGTH_LONG).show();}
        }
    }
    @Override protected void onDestroy(){
        if(web!=null){web.removeJavascriptInterface("JulieAndroid");web.destroy();}
        super.onDestroy();
    }
}
