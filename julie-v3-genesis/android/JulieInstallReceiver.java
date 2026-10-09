package com.humanpartner;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.util.Log;
import android.widget.Toast;

/** Résultat de PackageInstaller, après action explicite sur « Installer ». */
public final class JulieInstallReceiver extends BroadcastReceiver {
    static final String ACTION_STATUS="com.julie.preview.v3.JULIE_INSTALL_STATUS";
    @Override public void onReceive(Context context,Intent intent){
        if(intent==null||!ACTION_STATUS.equals(intent.getAction()))return;
        final int status=intent.getIntExtra(PackageInstaller.EXTRA_STATUS,PackageInstaller.STATUS_FAILURE);
        if(status==PackageInstaller.STATUS_PENDING_USER_ACTION){
            Intent confirm;
            if(Build.VERSION.SDK_INT>=33){
                confirm=intent.getParcelableExtra(Intent.EXTRA_INTENT,Intent.class);
            }else{
                confirm=(Intent)intent.getParcelableExtra(Intent.EXTRA_INTENT);
            }
            if(confirm==null){
                Toast.makeText(context,"Confirmation Android indisponible",Toast.LENGTH_LONG).show();
                return;
            }
            // L'installation finale est toujours décidée dans l'UI officielle Android.
            confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try{context.startActivity(confirm);}
            catch(Exception e){
                Log.e("JulieUpdater","Le dialogue d'installation Android n'a pas pu démarrer",e);
                Toast.makeText(context,"Impossible d'ouvrir l'installation Android",Toast.LENGTH_LONG).show();
            }
        }else if(status==PackageInstaller.STATUS_SUCCESS){
            Toast.makeText(context,"Julie a été mise à jour.",Toast.LENGTH_LONG).show();
        }else{
            String message=intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            Log.e("JulieUpdater","Installation non autorisée / refusée : "+status+" / "+message);
            Toast.makeText(context,"Mise à jour annulée ou refusée par Android. Souvenirs conservés.",Toast.LENGTH_LONG).show();
        }
    }
}
