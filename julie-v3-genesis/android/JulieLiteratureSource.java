package com.humanpartner;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

/**
 * Deuxième source documentaire : Europe PMC (EMBL-EBI).
 * Cherche une référence bibliographique indépendante, pas une confirmation
 * automatique des affirmations encyclopédiques. Aucune donnée privée transmise.
 */
final class JulieLiteratureSource {
    private static final String HOST = "www.ebi.ac.uk";
    private static final String ENDPOINT = "/europepmc/webservices/rest/search";
    private static final String USER_AGENT = "JulieResearch/0.2 (https://github.com/amaurygiboudot-arch/Listingcase)";

    static JSONObject findCandidate(String query) throws Exception {
        if(query==null||!query.matches("[a-zA-Z\\- ]{2,80}"))
            throw new IllegalArgumentException("Question scientifique hors périmètre");
        final String terms="TITLE:\""+query+"\" AND OPEN_ACCESS:y";
        final URL url=new URL("https://"+HOST+ENDPOINT+"?query="+
            URLEncoder.encode(terms,"UTF-8")+"&format=json&pageSize=3&resultType=core");
        if(!"https".equals(url.getProtocol())||!HOST.equals(url.getHost())||
           !ENDPOINT.equals(url.getPath()))
            throw new SecurityException("Source documentaire non autorisée");
        final HttpURLConnection http=(HttpURLConnection)url.openConnection();
        try {
            http.setInstanceFollowRedirects(false);
            http.setRequestMethod("GET");
            http.setConnectTimeout(10000);
            http.setReadTimeout(10000);
            http.setRequestProperty("Accept","application/json");
            http.setRequestProperty("User-Agent",USER_AGENT);
            if(http.getResponseCode()!=200)
                throw new IOException("Europe PMC indisponible");
            final String mime=http.getContentType();
            if(mime==null||!mime.toLowerCase().contains("application/json"))
                throw new IOException("Europe PMC : réponse non JSON");
            final ByteArrayOutputStream buffer=new ByteArrayOutputStream();
            try(InputStream in=http.getInputStream()){
                final byte[] chunk=new byte[2048];
                int n;
                while((n=in.read(chunk))!=-1){
                    if(Thread.currentThread().isInterrupted())
                        throw new IOException("Recherche interrompue");
                    if(buffer.size()+n>96000)
                        throw new IOException("Réponse bibliographique excessive");
                    buffer.write(chunk,0,n);
                }
            }
            final JSONObject payload=new JSONObject(buffer.toString("UTF-8"));
            final JSONArray list=payload.getJSONObject("resultList").getJSONArray("result");
            for(int i=0;i<list.length();i++){
                final JSONObject paper=list.getJSONObject(i);
                final String source=paper.optString("source");
                final String id=paper.optString("id");
                if(!("MED".equals(source)||"PMC".equals(source))||
                   !id.matches("[a-zA-Z0-9]{1,20}"))
                    continue; // Ne pas présenter un preprint comme publication expertisée.
                if(!"Y".equals(paper.optString("isOpenAccess")))
                    continue;
                final String title=paper.optString("title","").trim();
                if(title.length()<12||title.length()>240)
                    continue;
                final String year=paper.optString("pubYear","");
                if(!year.matches("[0-9]{4}"))continue;
                // Fragment court et sourcé. Cette seule référence ne corrobore aucun fait.
                String excerpt=paper.optString("abstractText","").replaceAll("<[^>]*>"," ");
                excerpt=excerpt.replaceAll("\\s+"," ").trim();
                if(excerpt.length()>240)excerpt=excerpt.substring(0,240);
                final JSONObject result=new JSONObject();
                result.put("sourceName","Europe PMC");
                result.put("title",title);
                result.put("url","https://europepmc.org/article/"+source+"/"+id);
                result.put("year",year);
                result.put("excerpt",excerpt);
                result.put("status","publication à examiner, confrontation non effectuée");
                return result;
            }
            return null;
        } finally {
            http.disconnect();
        }
    }
}
