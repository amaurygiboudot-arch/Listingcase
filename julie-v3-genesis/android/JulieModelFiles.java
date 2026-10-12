package com.humanpartner;
import java.io.*;
import java.security.MessageDigest;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

/** Validate a staged model before making it selectable. Never touches conversation data. */
public final class JulieModelFiles {
 public static final long SIZE=2104932768L;
 public static final String SHA="626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d";
 public interface Progress {void update(long bytes);}
 public static void install(InputStream in,File target,long expected,String hash,Progress progress)throws Exception{
  File part=new File(target.getParentFile(),target.getName()+".part");
  try{
   MessageDigest digest=MessageDigest.getInstance("SHA-256");long count=0;
   try(FileOutputStream out=new FileOutputStream(part)){
    byte[] bytes=new byte[1024*1024];int n;
    while((n=in.read(bytes))!=-1){
     if(Thread.currentThread().isInterrupted())throw new IOException("Import interrompu");
     count+=n;if(count>expected)throw new IOException("Fichier trop grand");
     digest.update(bytes,0,n);out.write(bytes,0,n);progress.update(count);
    }
    out.getFD().sync();
   }
   if(count!=expected)throw new IOException("Fichier incomplet");
   StringBuilder actual=new StringBuilder();for(byte b:digest.digest())actual.append(String.format("%02x",b&255));
   if(!actual.toString().equals(hash))throw new IOException("Le fichier ne correspond pas au modèle officiel attendu");
   Files.move(part.toPath(),target.toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);
  }finally{Files.deleteIfExists(part.toPath());}
 }
}
