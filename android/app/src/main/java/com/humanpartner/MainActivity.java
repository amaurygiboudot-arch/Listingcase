package com.humanpartner;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String PREFS = "human_partner";
    private static final String KEY_BACKEND = "backend_url";

    private LinearLayout root;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        String saved = prefs.getString(KEY_BACKEND, "");
        if (saved == null || saved.trim().isEmpty()) {
            showSetup();
        } else {
            showWeb(saved);
        }
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
                "http://192.168.1.25:8787\n\n" +
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
        while (s.endsWith("/")) s = s.substring(0, s.length() - 1);
        return s;
    }

    private void showWeb(String backend) {
        WebView web = new WebView(this);
        web.setBackgroundColor(Color.rgb(17, 19, 24));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setDatabaseEnabled(true);
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setAllowFileAccess(false);
        web.setWebChromeClient(new WebChromeClient());
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
                            "Backend inaccessible. Vérifie l'adresse et que le serveur tourne sur le PC.",
                            Toast.LENGTH_LONG).show();
                }
            }
        });
        web.loadUrl(backend);
        setContentView(web);
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
        }
        super.onBackPressed();
    }
}
