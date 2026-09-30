package com.humanpartner;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Message;
import android.net.Uri;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String PREFS = "human_partner";
    private static final String KEY_BACKEND = "backend_url";
    private static final String DEFAULT_BACKEND = "http://192.168.1.32:8787";
    private static final int FILE_CHOOSER_REQUEST = 4107;

    private ValueCallback<Uri[]> filePathCallback;
    private LinearLayout root;
    private SharedPreferences prefs;
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        prefs.edit().putString(KEY_BACKEND, DEFAULT_BACKEND).apply();
        showWeb(DEFAULT_BACKEND);
    }

    private TextView text(String value, float size) {
        TextView v = new TextView(this);
        v.setText(value);
        v.setTextColor(Color.WHITE);
        v.setTextSize(size);
        return v;
    }

    private void showSetup() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 70, 40, 40);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(Color.rgb(17, 19, 24));

        TextView title = text("Human Partner", 30);
        title.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView help = text(
                "\nPour ce prototype, le cerveau Qwen/Ollama tourne sur ton PC.\n\n" +
                "Saisis l'adresse du backend, par exemple :\n" +
                "http://192.168.1.32:8787\n\n" +
                "Le téléphone et le PC doivent être sur le même réseau.",
                16
        );
        root.addView(help, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        EditText input = new EditText(this);
        input.setHint("http://192.168.x.x:8787");
        input.setSingleLine(true);
        input.setTextColor(Color.WHITE);
        input.setHintTextColor(Color.GRAY);
        input.setBackgroundColor(Color.rgb(35, 38, 48));
        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        inputParams.setMargins(0, 30, 0, 20);
        root.addView(input, inputParams);

        Button connect = new Button(this);
        connect.setText("Se connecter");
        connect.setOnClickListener(v -> {
            String url = normalize(input.getText().toString());
            if (url.trim().isEmpty()) {
                Toast.makeText(this, "Entre l'adresse du backend.", Toast.LENGTH_SHORT).show();
                return;
            }
            prefs.edit().putString(KEY_BACKEND, url).apply();
            showWeb(url);
        });
        root.addView(connect, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        setContentView(root);
    }

    private String normalize(String value) {
        String s = value == null ? "" : value.trim();
        if (s.isEmpty()) return "";
        if (!s.startsWith("http://") && !s.startsWith("https://")) {
            s = "http://" + s;
        }
        s = s.replaceFirst("^(https?://\\d{1,3}(?:\\.\\d{1,3}){3})\\.(\\d{2,5})(/?.*)$", "$1:$2$3");
        while (s.endsWith("/")) s = s.substring(0, s.length() - 1);
        try {
            Uri uri = Uri.parse(s);
            if (uri.getHost() == null || uri.getHost().trim().isEmpty()) return "";
        } catch (Exception e) {
            return "";
        }
        return s;
    }

    private void showWeb(String backend) {
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(17, 19, 24));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setDefaultTextEncodingName("utf-8");
        web.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.clearCache(true);
        web.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
        web.getSettings().setSupportMultipleWindows(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.getSettings().setDatabaseEnabled(true);
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setAllowFileAccess(false);
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView,
                                             ValueCallback<Uri[]> filePathCallbackParam,
                                             FileChooserParams fileChooserParams) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = filePathCallbackParam;
                Intent intent;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (Exception e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this,
                            "Impossible d’ouvrir le sélecteur de fichiers.",
                            Toast.LENGTH_SHORT).show();
                    return false;
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this,
                            "Aucune application ne peut choisir cette image.",
                            Toast.LENGTH_SHORT).show();
                    return false;
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                final Dialog popupDialog = new Dialog(MainActivity.this);
                popupDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

                final WebView popupWeb = new WebView(MainActivity.this);
                popupWeb.setBackgroundColor(Color.rgb(17, 19, 24));
                popupWeb.getSettings().setJavaScriptEnabled(true);
                popupWeb.getSettings().setDomStorageEnabled(true);
                popupWeb.getSettings().setDatabaseEnabled(true);
                popupWeb.getSettings().setDefaultTextEncodingName("utf-8");
                popupWeb.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
                popupWeb.getSettings().setSupportMultipleWindows(true);
                popupWeb.getSettings().setAllowContentAccess(true);
                popupWeb.getSettings().setAllowFileAccess(false);

                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(popupWeb, true);

                popupWeb.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        return false;
                    }
                });

                popupWeb.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        popupDialog.dismiss();
                    }
                });

                popupDialog.setContentView(popupWeb, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT));
                popupDialog.show();

                Window window = popupDialog.getWindow();
                if (window != null) {
                    window.setLayout(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT);
                }

                WebView.WebViewTransport transport =
                        (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWeb);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public void onCloseWindow(WebView window) {
                super.onCloseWindow(window);
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this,
                            "Connexion au cerveau en cours…",
                            Toast.LENGTH_SHORT).show();
                    view.postDelayed(() -> view.loadUrl(DEFAULT_BACKEND + "?retry=" + System.currentTimeMillis()), 3000);
                }
            }
        });
        web.loadUrl(backend);
        setContentView(web);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        ViewGroup content = findViewById(android.R.id.content);
        if (content != null && content.getChildCount() > 0 && content.getChildAt(0) instanceof WebView) {
            WebView web = (WebView) content.getChildAt(0);
            if (web.canGoBack()) {
                web.goBack();
                return;
            }
            moveTaskToBack(true);
            return;
        }
        super.onBackPressed();
    }
}
