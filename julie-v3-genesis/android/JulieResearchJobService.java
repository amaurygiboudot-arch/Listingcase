package com.humanpartner;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.util.Log;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

/**
 * Première recherche documentaire autonome de JULIE_001, sans service payant.
 * La tâche est approximativement quotidienne, en Wi-Fi/non facturé seulement.
 * Elle n'envoie aucune conversation, aucun souvenir, ni identifiant utilisateur.
 * Les extraits Wikipedia ne sont JAMAIS présentés comme des faits corroborés.
 * Aucun JavaScript distant n'est chargé dans la WebView.
 */
public final class JulieResearchJobService extends JobService {
    private static final String TAG = "JulieResearchJob";
    private static final int PERIODIC_JOB_ID = 261010;
    private static final int MANUAL_JOB_ID = 261011;
    private static final long DAILY = 24L * 60L * 60L * 1000L;
    private static final long MANUAL_COOLDOWN = 6L * 60L * 60L * 1000L;
    private static final String MANUAL_PREF = "julie_research_jobs_v1";
    // Sélection tournante de thèmes : pas de donnée privée dans les requêtes.
    private static final String[][] TOPICS = {
        {"Liaison chimique","Chimie"},
        {"Neurone","Biologie"},
        {"Photosynthèse","Biologie"},
        {"Écosystème","Écologie"},
        {"Mémoire (psychologie)","Cognition"},
        {"Mitochondrie","Biologie"},
        {"Gravitation","Physique"},
        {"Cycle de l'eau","Terre"}
    };
    private volatile Thread worker;
    private volatile HttpURLConnection connection;

    static void scheduleDaily(Context context) {
        if(!new JulieSecureStore(context).researchEnabled())return;
        final JobScheduler scheduler=(JobScheduler)context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if(scheduler==null||scheduler.getPendingJob(PERIODIC_JOB_ID)!=null)return;
        final JobInfo job=new JobInfo.Builder(PERIODIC_JOB_ID,
                new ComponentName(context,JulieResearchJobService.class))
            .setPeriodic(DAILY)
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_UNMETERED)
            .setRequiresBatteryNotLow(true)
            .setPersisted(true)
            .build();
        if(scheduler.schedule(job)!=JobScheduler.RESULT_SUCCESS)
            Log.w(TAG,"Programmation quotidienne refusée par Android");
    }
    static void cancelAll(Context context) {
        final JobScheduler scheduler=(JobScheduler)context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if(scheduler!=null){
            scheduler.cancel(PERIODIC_JOB_ID);
            scheduler.cancel(MANUAL_JOB_ID);
        }
    }
    static boolean requestNow(Context context) {
        if(!new JulieSecureStore(context).researchEnabled())return false;
        final SharedPreferences prefs=context.getSharedPreferences(MANUAL_PREF,MODE_PRIVATE);
        final long now=System.currentTimeMillis();
        if(now-prefs.getLong("last_manual_request",0)<MANUAL_COOLDOWN)return false;
        final JobScheduler scheduler=(JobScheduler)context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if(scheduler==null)return false;
        if(scheduler.getPendingJob(MANUAL_JOB_ID)!=null)return true;
        final JobInfo job=new JobInfo.Builder(MANUAL_JOB_ID,
                new ComponentName(context,JulieResearchJobService.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_UNMETERED)
            .setRequiresBatteryNotLow(true)
            .build();
        if(scheduler.schedule(job)!=JobScheduler.RESULT_SUCCESS)return false;
        return prefs.edit().putLong("last_manual_request",now).commit();
    }
    private boolean isUnmetered() {
        final ConnectivityManager cm=(ConnectivityManager)getSystemService(Context.CONNECTIVITY_SERVICE);
        if(cm==null||cm.getActiveNetwork()==null)return false;
        final NetworkCapabilities caps=cm.getNetworkCapabilities(cm.getActiveNetwork());
        return caps!=null&&caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
              &&caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    @Override public boolean onStartJob(JobParameters params) {
        final JulieSecureStore store=new JulieSecureStore(getApplicationContext());
        if(!store.researchEnabled())return false;
        worker=new Thread(()->{
            try {
                if(Thread.currentThread().isInterrupted()||!isUnmetered())return;
                final int index=Math.floorMod(store.researchCursor(),TOPICS.length);
                final JSONObject found=fetchArticle(TOPICS[index][0],TOPICS[index][1]);
                if(Thread.currentThread().isInterrupted()||!store.researchEnabled())return;
                if(store.appendResearchItem(found))store.advanceResearchCursor(index+1);
            } catch(Exception error) {
                Log.w(TAG,"Source indisponible ; aucune connaissance inventée",error);
            } finally {
                jobFinished(params,false);
            }
        },"julie-recherche-scientifique");
        worker.start();
        return true;
    }
    @Override public boolean onStopJob(JobParameters params) {
        final Thread running=worker;
        if(running!=null)running.interrupt();
        final HttpURLConnection active=connection;
        if(active!=null)active.disconnect();
        return true; // Android pourra reprendre lorsque les contraintes le permettront.
    }
    private JSONObject fetchArticle(String topic,String field) throws Exception {
        final String encoded=URLEncoder.encode(topic,"UTF-8");
        final URL url=new URL("https://fr.wikipedia.org/w/api.php"
            +"?action=query&prop=extracts&exintro=1&explaintext=1"
            +"&redirects=1&format=json&titles="+encoded);
        if(!"https".equals(url.getProtocol())||!"fr.wikipedia.org".equals(url.getHost()))
            throw new SecurityException("Source non autorisée");
        final HttpURLConnection http=(HttpURLConnection)url.openConnection();
        connection=http;
        try {
            http.setInstanceFollowRedirects(false);
            http.setRequestMethod("GET");
            http.setConnectTimeout(10000);
            http.setReadTimeout(10000);
            http.setRequestProperty("Accept","application/json");
            http.setRequestProperty("User-Agent","JulieResearch/0.1 (https://github.com/amaurygiboudot-arch/Listingcase)");
            if(http.getResponseCode()!=200)throw new IOException("Serveur documentaire indisponible");
            final String mime=http.getContentType();
            if(mime==null||!mime.toLowerCase().contains("application/json"))
                throw new IOException("Format documentaire inattendu");
            final ByteArrayOutputStream out=new ByteArrayOutputStream();
            try(InputStream in=http.getInputStream()){
                final byte[] buffer=new byte[2048];
                int read;
                while((read=in.read(buffer))!=-1){
                    if(Thread.currentThread().isInterrupted())throw new IOException("Recherche interrompue");
                    if(out.size()+read>48000)throw new IOException("Réponse trop volumineuse");
                    out.write(buffer,0,read);
                }
            }
            final JSONObject response=new JSONObject(out.toString("UTF-8"));
            final JSONObject pages=response.getJSONObject("query").getJSONObject("pages");
            final Iterator<String> ids=pages.keys();
            if(!ids.hasNext())throw new IOException("Aucune page trouvée");
            final JSONObject page=pages.getJSONObject(ids.next());
            if(page.has("missing")||page.optLong("pageid",-1)<=0)
                throw new IOException("Article scientifique introuvable");
            final String title=page.getString("title").trim();
            String extract=page.getString("extract").replaceAll("\\s+"," ").trim();
            if(title.isEmpty()||extract.length()<50)throw new IOException("Extrait inexploitable");
            if(extract.length()>900)extract=extract.substring(0,900);
            final JSONObject item=new JSONObject();
            item.put("id","wiki-fr-"+page.getLong("pageid"));
            item.put("topic",field);
            item.put("title",title);
            item.put("excerpt",extract);
            item.put("url","https://fr.wikipedia.org/wiki/"+Uri.encode(title.replace(' ','_')));
            item.put("fetchedAt",System.currentTimeMillis());
            item.put("sourceType","encyclopédie collaborative, source unique à recouper");
            item.put("license","Wikipedia : réutilisation soumise à la licence indiquée sur l'article");
            return item;
        } finally {
            connection=null;
            http.disconnect();
        }
    }
}
