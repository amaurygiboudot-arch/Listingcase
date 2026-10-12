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
    private volatile File model;
    private final Context context;
    private final android.content.SharedPreferences prefs;
    private volatile boolean importing;
    private volatile long importedBytes;
    private volatile String importMessage="";
    private File small(){return new File(context.getFilesDir(),"qwen2.5-1.5b.gguf");}
    private File large(){return new File(context.getFilesDir(),"qwen2.5-3b-q4km.gguf");}
    private boolean largeReady(){return prefs.getBoolean("verified3b",false)&&large().length()==JulieModelFiles.SIZE;}

    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private volatile boolean closed;
    private volatile String activeId="",partial="",finished=null;
    private static boolean loaded;
    static {
        try { System.loadLibrary("julie_engine"); loaded=true; }
        catch (UnsatisfiedLinkError e) { loaded=false; }
    }
    public JulieLocalEngine(Context context) {
        this.context=context.getApplicationContext();
        prefs=this.context.getSharedPreferences("julie_model_choice",Context.MODE_PRIVATE);
        model=prefs.getBoolean("use3b",false)&&largeReady()?large():small();
    }
    @JavascriptInterface public String modelStatus(){
        JSONObject r=new JSONObject();
        try{
            android.app.ActivityManager.MemoryInfo mem=new android.app.ActivityManager.MemoryInfo();
            ((android.app.ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE)).getMemoryInfo(mem);
            r.put("active",model.equals(large())?"3B":"1.5B");r.put("ready3b",largeReady());
            r.put("importing",importing);r.put("bytes",importedBytes);r.put("total",JulieModelFiles.SIZE);
            r.put("message",importMessage);r.put("ramBytes",mem.totalMem);r.put("freeRamBytes",mem.availMem);
            r.put("freeStorageBytes",context.getFilesDir().getUsableSpace());
        }catch(Exception ignored){}
        return r.toString();
    }
    @JavascriptInterface public synchronized boolean selectModel(String name){
        if(closed||importing||(!activeId.isEmpty()&&finished==null))return false;
        if(!name.equals("1.5B")&&!name.equals("3B"))return false;
        File next=name.equals("3B")?large():small();
        if(name.equals("3B")&&!largeReady())return false;
        if(name.equals("3B")){
            android.app.ActivityManager.MemoryInfo memory=new android.app.ActivityManager.MemoryInfo();
            ((android.app.ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE)).getMemoryInfo(memory);
            if(memory.availMem<2800000000L){importMessage="Mémoire disponible insuffisante pour le 3B : ferme les autres applications puis réessaie.";return false;}
        }
        if(name.equals("1.5B")&&next.length()!=986048512L)return false;
        if(!prefs.edit().putBoolean("use3b",name.equals("3B")).commit())return false;
        if(loaded)worker.execute(JulieLocalEngine::release);
        model=next;return true;
    }
    public synchronized boolean importModel(android.net.Uri uri){
        if(closed||importing||(!activeId.isEmpty()&&finished==null))return false;
        if(largeReady()){importMessage="Le modèle 3B est déjà vérifié.";return false;}
        if(context.getFilesDir().getUsableSpace()<JulieModelFiles.SIZE+268435456L){
            importMessage="Il faut au moins 2,4 Go libres pour importer le modèle.";return false;
        }
        importing=true;importedBytes=0;importMessage="Copie et vérification du modèle…";
        worker.execute(()->{
            try(java.io.InputStream in=context.getContentResolver().openInputStream(uri)){
                if(in==null)throw new java.io.IOException("Fichier inaccessible");
                JulieModelFiles.install(in,large(),JulieModelFiles.SIZE,JulieModelFiles.SHA,n->importedBytes=n);
                if(!prefs.edit().putBoolean("verified3b",true).commit())throw new java.io.IOException("Validation non sauvegardée");
                importMessage="Modèle 3B vérifié. Tu peux maintenant le sélectionner.";
            }catch(Exception e){importMessage="Import refusé : "+e.getMessage();}
            finally{importing=false;}
        });
        return true;
    }
    private static native byte[] infer(byte[] path,byte[] prompt,JulieLocalEngine sink);
    private static native void release();
    // Called only by the native worker. Keep UTF-8 conversion out of the UI thread.
    public boolean progress(byte[] bytes) {
        if(closed)return false;
        partial=new String(bytes,StandardCharsets.UTF_8);
        return true;
    }
    @JavascriptInterface public boolean available() {
        return !closed && loaded && model.isFile() && (model.equals(large())?largeReady():model.length()==986048512L);
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
            result.put("engine",model.equals(large())?"qwen2.5-3b-local-experimental":"qwen2.5-1.5b-local-experimental");
        }catch(Exception e){
            try{result.put("error",e.getMessage()==null?"Erreur locale":e.getMessage());}catch(Exception ignored){}
        }
        try{result.put("done",true);}catch(Exception ignored){}
        return result.toString();
    }
    @JavascriptInterface public synchronized String start(String prompt) {
        if(importing||!available()||(!activeId.isEmpty()&&finished==null))return "";
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
