package com.humanpartner;
import android.content.Context;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** Local inference worker; progress is transient and never writes application state. */
public final class JulieLocalEngine {
    private final File model;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private volatile boolean closed;
    private volatile String activeId="",partial="",finished=null;
    private static boolean loaded;
    static {
        try { System.loadLibrary("julie_engine"); loaded=true; }
        catch (UnsatisfiedLinkError e) { loaded=false; }
    }
    public JulieLocalEngine(Context context) { model=new File(context.getFilesDir(),"qwen2.5-1.5b.gguf"); }
    private static native byte[] infer(byte[] path,byte[] prompt,JulieLocalEngine sink);
    private static native void release();
    // Called only by the native worker. Keep UTF-8 conversion out of the UI thread.
    public boolean progress(byte[] bytes) {
        if(closed)return false;
        partial=new String(bytes,StandardCharsets.UTF_8);
        return true;
    }
    @JavascriptInterface public boolean available() {
        return !closed && loaded && model.isFile() && model.length()==986048512L;
    }
    private String compute(String prompt) {
        JSONObject result=new JSONObject();
        try {
            if(!available())throw new IllegalStateException("Moteur local indisponible");
            if(prompt==null||prompt.length()>16000)throw new IllegalArgumentException("Message trop long");
            byte[] bytes=infer(model.getAbsolutePath().getBytes(StandardCharsets.UTF_8),
                               prompt.getBytes(StandardCharsets.UTF_8),this);
            if(bytes==null)throw new IllegalStateException("Réponse absente");
            result.put("text",new String(bytes,StandardCharsets.UTF_8));
            result.put("engine","qwen2.5-1.5b-local-experimental");
        }catch(Exception e){
            try{result.put("error",e.getMessage()==null?"Erreur locale":e.getMessage());}catch(Exception ignored){}
        }
        try{result.put("done",true);}catch(Exception ignored){}
        return result.toString();
    }
    @JavascriptInterface public synchronized String start(String prompt) {
        if(!available()||(!activeId.isEmpty()&&finished==null))return "";
        activeId=UUID.randomUUID().toString();partial="";finished=null;
        worker.execute(()->finished=compute(prompt));
        return activeId;
    }
    @JavascriptInterface public String poll(String id) {
        if(!activeId.equals(id))return "{\"done\":true,\"error\":\"Requête inconnue\"}";
        String result=finished;
        if(result!=null)return result;
        JSONObject update=new JSONObject();
        try{update.put("text",partial);update.put("done",false);}catch(Exception ignored){}
        return update.toString();
    }
    public synchronized void close() {
        if(closed)return;
        closed=true;
        if(loaded)worker.execute(JulieLocalEngine::release);
        worker.shutdown();
    }
}
