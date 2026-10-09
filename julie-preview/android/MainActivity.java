package com.humanpartner;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Prévisualisation hors ligne de Julie. Aucun serveur ni accès Internet requis. */
public final class MainActivity extends Activity {
    private static final int EXPORT_JSON = 9091;
    private static final String LOCAL_INDEX = "file:///android_asset/julie/index.html";
    private WebView webView;
    private String pendingExport;

    public final class JulieBridge {
        @JavascriptInterface
        public String readState() {
            SharedPreferences prefs = getSharedPreferences("julie_preview_state",MODE_PRIVATE);
            return prefs.getString("julie_preview_JULIE_001","");
        }
        @JavascriptInterface
        public void writeState(String state) {
            if (state == null || state.length() > 2_000_000) return;
            getSharedPreferences("julie_preview_state",MODE_PRIVATE)
                .edit().putString("julie_preview_JULIE_001",state).commit();
        }
        @JavascriptInterface
        public void exportData(String json) {
            if (json == null || json.length() > 2_000_000) return;
            runOnUiThread(() -> {
                pendingExport = json;
                try {
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.setType("application/json");
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.putExtra(Intent.EXTRA_TITLE, "Julie_souvenirs_demo.json");
                    startActivityForResult(intent, EXPORT_JSON);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Export indisponible", Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        getWindow().setStatusBarColor(Color.rgb(16,17,27));
        getWindow().setNavigationBarColor(Color.rgb(16,17,27));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(13,15,25));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setDefaultTextEncodingName("utf-8");
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.addJavascriptInterface(new JulieBridge(), "JulieAndroid");
        webView.setWebViewClient(new WebViewClient(){
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                String url=uri == null ? "" : uri.toString();
                return !(url.startsWith("file:///android_asset/julie/") || "about:blank".equals(url));
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !(url.startsWith("file:///android_asset/julie/") || "about:blank".equals(url));
            }
        });
        setContentView(webView);
        webView.loadUrl(LOCAL_INDEX);
    }

    @Override
    protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode!=EXPORT_JSON)return;
        if(resultCode==RESULT_OK && data!=null && data.getData()!=null && pendingExport!=null){
            try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
                if(out==null)throw new IllegalStateException("No output stream");
                out.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this,"Export Julie enregistré",Toast.LENGTH_SHORT).show();
            } catch(Exception e){
                Toast.makeText(this,"Échec de l'export",Toast.LENGTH_LONG).show();
            }
        }
        pendingExport=null;
    }
    @Override
    public void onBackPressed(){
        if(webView!=null && webView.canGoBack())webView.goBack();
        else super.onBackPressed();
    }
    @Override
    protected void onDestroy(){
        if(webView!=null){webView.removeJavascriptInterface("JulieAndroid");webView.destroy();webView=null;}
        super.onDestroy();
    }
}
