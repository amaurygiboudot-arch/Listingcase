package com.humanpartner;

import android.content.Context;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Experimental local inference. No network access or state writes. */
public final class JulieLocalEngine {
    private final File model;
    private static boolean loaded;
    static {
        try { System.loadLibrary("julie_engine"); loaded=true; }
        catch (UnsatisfiedLinkError e) { loaded=false; }
    }
    public JulieLocalEngine(Context context) {
        model=new File(context.getFilesDir(),"qwen2.5-1.5b.gguf");
    }
    private static native byte[] infer(byte[] path, byte[] prompt);
    @JavascriptInterface public boolean available() {
        return loaded && model.isFile() && model.length()==986048512L;
    }
    @JavascriptInterface public synchronized String generate(String prompt) {
        JSONObject result=new JSONObject();
        try {
            if(!available())throw new IllegalStateException("Moteur ou modèle local indisponible");
            if(prompt==null || prompt.length()>16000)throw new IllegalArgumentException("Message trop long");
            byte[] bytes=infer(model.getAbsolutePath().getBytes(StandardCharsets.UTF_8),
                               prompt.getBytes(StandardCharsets.UTF_8));
            if(bytes==null)throw new IllegalStateException("Réponse locale absente");
            result.put("text",new String(bytes,StandardCharsets.UTF_8));
            result.put("engine","qwen2.5-1.5b-local-experimental");
        } catch(Exception e) {
            try { result.put("error",e.getMessage()==null?"Erreur du moteur local":e.getMessage()); }
            catch(Exception ignored) {}
        }
        return result.toString();
    }
}
